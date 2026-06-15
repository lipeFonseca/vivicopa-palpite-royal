/**
 * football-data-client.ts
 * Typed client for football-data.org v4 API.
 *
 * Implements the 4-phase polling strategy:
 *   Phase 1 — scheduled:  GET /competitions/{code}/matches?dateFrom=…&dateTo=…  (light)
 *   Phase 2 — pre_match:  GET /matches/{id}  + X-Unfold-Lineups              (~60 min before)
 *   Phase 3 — live:       GET /matches?status=LIVE  (1 req -> all live games)
 *   Phase 4 — finished:   GET /matches/{id}  + all unfold headers        (consolidation)
 *
 * Rate-limit budget is tracked per-instance (per Edge Function invocation).
 * The client serializes requests, reads X-RequestsAvailable /
 * X-RequestCounter-Reset response headers and keeps 2 slots in reserve.
 */

const API_BASE = "https://api.football-data.org/v4";

// ─── Types ─────────────────────────────────────────────────────────────────

export type PollingPhase = "scheduled" | "pre_match" | "started_pending" | "live" | "finished";

export interface RateLimitInfo {
  remaining: number;   // requests left in current window (from response header)
  resetAt: number;     // epoch ms when window resets
  callsMade: number;   // calls made in this invocation
}

// Stored in partidas.gols (jsonb array)
export interface GoalEvent {
  minuto: number;
  acrescimos: number | null;
  tipo: "REGULAR" | "OWN" | "PENALTY";
  time_nome: string | null;
  time_id: number | null;
  marcador_nome: string | null;
  marcador_id: number | null;
  assistencia_nome: string | null;
  placar_a: number;
  placar_b: number;
}

// Stored in partidas.cartoes
export interface CardEvent {
  minuto: number;
  time_nome: string | null;
  time_id: number | null;
  jogador_nome: string | null;
  jogador_id: number | null;
  cartao: "YELLOW" | "RED" | "YELLOW_RED";
}

// Stored in partidas.substituicoes
export interface SubEvent {
  minuto: number;
  time_nome: string | null;
  saiu_nome: string | null;
  entrou_nome: string | null;
}

// Stored in partidas.escalacao_a / escalacao_b
export interface Lineup {
  formacao: string | null;
  titulares: Array<{ id: number; nome: string; posicao: string | null; camisa: number | null }>;
  reservas: Array<{ id: number; nome: string; posicao: string | null; camisa: number | null }>;
}

// Stored in partidas.estatisticas_a / estatisticas_b
export interface MatchStats {
  posse: number | null;
  chutes: number | null;
  chutes_no_gol: number | null;
  escanteios: number | null;
  faltas: number | null;
  amarelos: number | null;
  vermelhos: number | null;
  impedimentos: number | null;
  defesas: number | null;
}

// ─── Client ────────────────────────────────────────────────────────────────

export class FootballDataClient {
  private token: string;
  private rl: RateLimitInfo;
  private queue: Promise<void>;

  constructor(token: string) {
    this.token = token;
    // Conservative starting assumption for Free plan: keep 2 in reserve.
    this.rl = { remaining: 9, resetAt: Date.now() + 60_000, callsMade: 0 };
    this.queue = Promise.resolve();
  }

  /** Current rate-limit snapshot. */
  info(): RateLimitInfo {
    return { ...this.rl };
  }

  /** Returns true if at least `need` requests can be made safely. */
  hasCapacity(need = 1): boolean {
    if (Date.now() > this.rl.resetAt) {
      this.rl.remaining = 9;
      this.rl.resetAt = Date.now() + 60_000;
    }
    return this.rl.remaining > need + 1;
  }

  private get(path: string, extra: Record<string, string> = {}): Promise<unknown> {
    const next = this.queue.then(() => this.request(path, extra));
    this.queue = next.then(() => undefined, () => undefined);
    return next;
  }

  private async request(path: string, extra: Record<string, string> = {}): Promise<unknown> {
    if (!this.hasCapacity()) {
      const waitMs = Math.max(1_000, this.rl.resetAt - Date.now());
      await sleep(waitMs);
    }

    let backoffMs = 1_000;
    for (let attempt = 0; attempt < 5; attempt++) {
      const res = await fetch(`${API_BASE}${path}`, {
        headers: { "X-Auth-Token": this.token, ...extra },
      });

      this.updateRateLimit(res);

      if (res.status === 429) {
        const resetMs = Math.max(1_000, this.rl.resetAt - Date.now());
        const retryAfterMs = parseInt(res.headers.get("Retry-After") ?? "0", 10) * 1_000;
        await sleep(Math.max(resetMs, retryAfterMs, backoffMs));
        backoffMs *= 2;
        continue;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as Record<string, unknown>;
        throw new Error((body.message as string) ?? `HTTP ${res.status} em ${path}`);
      }
      return res.json();
    }

    throw new Error(`429 Too Many Requests persistente em ${path}`);
  }

  private updateRateLimit(res: Response) {
    const rem = res.headers.get("X-RequestsAvailable");
    const resetSecs = res.headers.get("X-RequestCounter-Reset");
    if (rem !== null) this.rl.remaining = parseInt(rem, 10);
    if (resetSecs !== null) this.rl.resetAt = Date.now() + parseInt(resetSecs, 10) * 1_000;
    this.rl.callsMade++;
  }

  /**
   * Phase 1 — upcoming schedule.
   * Light payload (no unfold headers). Safe to call every few minutes.
   */
  async scheduled(comp: string, dateFrom: string, dateTo: string): Promise<unknown[]> {
    const j = await this.get(
      `/competitions/${comp}/matches?season=2026&dateFrom=${dateFrom}&dateTo=${dateTo}`,
    ) as Record<string, unknown>;
    return (j.matches ?? []) as unknown[];
  }

  /**
   * Phase 2 — single match with lineups (pre-match, ~60 min before kickoff).
   */
  async lineups(matchId: string): Promise<unknown> {
    return this.get(`/matches/${matchId}`, { "X-Unfold-Lineups": "true" });
  }

  /**
   * Phase 3 — all live matches in one request.
   * Includes goals, bookings, substitutions.
   */
  async live(comp: string): Promise<unknown[]> {
    const j = await this.get(`/matches?status=LIVE`, {
      "X-Unfold-Goals": "true",
      "X-Unfold-Bookings": "true",
      "X-Unfold-Subs": "true",
    }) as Record<string, unknown>;
    return ((j.matches ?? []) as Record<string, unknown>[]).filter((match) => {
      const competition = match.competition as Record<string, unknown> | undefined;
      return competition?.code === comp;
    });
  }

  /**
   * Phase 4 — full details for post-match consolidation.
   */
  async details(matchId: string): Promise<unknown> {
    return this.get(`/matches/${matchId}`, {
      "X-Unfold-Goals": "true",
      "X-Unfold-Bookings": "true",
      "X-Unfold-Subs": "true",
      "X-Unfold-Lineups": "true",
    });
  }

  /**
   * Fetch all teams for a competition (used in seed mode).
   */
  async teams(comp: string, season = "2026"): Promise<unknown[]> {
    const j = await this.get(
      `/competitions/${comp}/teams?season=${season}`,
    ) as Record<string, unknown>;
    return (j.teams ?? []) as unknown[];
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Phase detection ───────────────────────────────────────────────────────

const LIVE_STATUSES = new Set([
  "IN_PLAY", "PAUSED", "LIVE", "HT", "EXTRA_TIME", "PENALTY_SHOOTOUT",
]);
const DONE_STATUSES = new Set([
  "FINISHED", "AWARDED", "FT", "AET", "PEN",
]);

/**
 * Derives the polling phase from the stored DB status and kickoff time.
 * `agora` is Date.now() in ms.
 */
export function getPhase(
  status: string,
  iniciaEm: string | null,
  agora: number,
): PollingPhase {
  if (DONE_STATUSES.has(status)) return "finished";
  if (LIVE_STATUSES.has(status)) return "live";
  if (iniciaEm) {
    const minsUntil = (new Date(iniciaEm).getTime() - agora) / 60_000;
    if (minsUntil <= 30 && minsUntil >= 0) return "pre_match";
    if (minsUntil < 0 && minsUntil >= -180) return "started_pending";
  }
  return "scheduled";
}

// ─── Status mapper ─────────────────────────────────────────────────────────

export function mapStatus(apiStatus: string): string {
  switch (apiStatus) {
    case "SCHEDULED":
    case "TIMED":
      return "NS";
    case "IN_PLAY":
      return "LIVE";
    case "PAUSED":
      return "HT";
    case "EXTRA_TIME":
      return "ET";
    case "PENALTY_SHOOTOUT":
      return "PEN_LIVE";
    case "FINISHED":
    case "AWARDED":
      return "FT";
    case "POSTPONED":
      return "PST";
    case "SUSPENDED":
      return "SUSP";
    case "CANCELED":
    case "CANCELLED":
      return "CANC";
    default:
      return apiStatus;
  }
}

// ─── Row mappers ───────────────────────────────────────────────────────────

function score(match: Record<string, unknown>, side: "home" | "away"): number {
  const s = match.score as Record<string, unknown> | undefined;
  const ft = s?.fullTime as Record<string, unknown> | undefined;
  const rt = s?.regularTime as Record<string, unknown> | undefined;
  return (ft?.[side] ?? rt?.[side] ?? 0) as number;
}

/**
 * Phase 1 mapper — scheduling-only row.
 * Does NOT include live-data columns so upsert won't overwrite them.
 */
export function mapScheduledRow(
  j: Record<string, unknown>,
  agora: number,
): Record<string, unknown> {
  const ht = j.homeTeam as Record<string, unknown> | undefined;
  const at = j.awayTeam as Record<string, unknown> | undefined;
  const status = mapStatus(j.status as string);
  return {
    id: String(j.id),
    time_a: (ht?.name as string) || "A definir",
    time_b: (at?.name as string) || "A definir",
    placar_a: score(j, "home"),
    placar_b: score(j, "away"),
    status,
    inicia_em: j.utcDate,
    fase: j.stage ?? null,
    grupo: j.group ?? null,
    rodada: j.matchday ?? null,
    fase_polling: getPhase(j.status as string, j.utcDate as string | null, agora),
    ultima_atualizacao_api: j.lastUpdated ?? null,
    ultima_busca_api: new Date(agora).toISOString(),
  };
}

/**
 * Phases 3 & 4 mapper — full row including all live-data columns.
 */
export function mapFullRow(
  j: Record<string, unknown>,
  agora: number,
): Record<string, unknown> {
  const base = mapScheduledRow(j, agora);
  const ht = j.homeTeam as Record<string, unknown> | undefined;
  const at = j.awayTeam as Record<string, unknown> | undefined;
  const sc = j.score as Record<string, unknown> | undefined;
  const halfTime = sc?.halfTime as Record<string, unknown> | undefined;

  return {
    ...base,
    minuto: j.minute ?? null,
    acrescimos: j.injuryTime ?? null,
    placar_parcial_a: halfTime?.home ?? null,
    placar_parcial_b: halfTime?.away ?? null,
    gols: _mapGoals(
      (j.goals ?? []) as unknown[],
      (ht?.id as number) ?? 0,
    ),
    cartoes: _mapCards((j.bookings ?? []) as unknown[]),
    substituicoes: _mapSubs((j.substitutions ?? []) as unknown[]),
    escalacao_a: _mapLineup(ht),
    escalacao_b: _mapLineup(at),
    estatisticas_a: _mapStats(ht),
    estatisticas_b: _mapStats(at),
  };
}

// ─── Internal helpers ──────────────────────────────────────────────────────

function _mapGoals(goals: unknown[], homeId: number): GoalEvent[] {
  if (!Array.isArray(goals)) return [];
  let a = 0, b = 0;
  return goals.map((g) => {
    const goal = g as Record<string, unknown>;
    const team = goal.team as Record<string, unknown> | undefined;
    const scorer = goal.scorer as Record<string, unknown> | undefined;
    const assist = goal.assist as Record<string, unknown> | undefined;
    const tipo = goal.type as "REGULAR" | "OWN" | "PENALTY";
    const isHome = team?.id === homeId;
    const isOwn = tipo === "OWN";
    // own goal counts for the opposing side
    if (isHome && !isOwn) a++;
    else if (!isHome && !isOwn) b++;
    else if (isHome && isOwn) b++;
    else a++;
    return {
      minuto: goal.minute as number,
      acrescimos: (goal.injuryTime as number | null) ?? null,
      tipo,
      time_nome: (team?.name as string) ?? null,
      time_id: (team?.id as number) ?? null,
      marcador_nome: (scorer?.name as string) ?? null,
      marcador_id: (scorer?.id as number) ?? null,
      assistencia_nome: (assist?.name as string) ?? null,
      placar_a: a,
      placar_b: b,
    };
  });
}

function _mapCards(bookings: unknown[]): CardEvent[] {
  if (!Array.isArray(bookings)) return [];
  return bookings.map((b) => {
    const booking = b as Record<string, unknown>;
    const team = booking.team as Record<string, unknown> | undefined;
    const player = booking.player as Record<string, unknown> | undefined;
    return {
      minuto: booking.minute as number,
      time_nome: (team?.name as string) ?? null,
      time_id: (team?.id as number) ?? null,
      jogador_nome: (player?.name as string) ?? null,
      jogador_id: (player?.id as number) ?? null,
      cartao: booking.card as "YELLOW" | "RED" | "YELLOW_RED",
    };
  });
}

function _mapSubs(subs: unknown[]): SubEvent[] {
  if (!Array.isArray(subs)) return [];
  return subs.map((s) => {
    const sub = s as Record<string, unknown>;
    const team = sub.team as Record<string, unknown> | undefined;
    const out = sub.playerOut as Record<string, unknown> | undefined;
    const inn = sub.playerIn as Record<string, unknown> | undefined;
    return {
      minuto: sub.minute as number,
      time_nome: (team?.name as string) ?? null,
      saiu_nome: (out?.name as string) ?? null,
      entrou_nome: (inn?.name as string) ?? null,
    };
  });
}

function _mapLineup(team: Record<string, unknown> | undefined): Lineup | null {
  if (!team) return null;
  const lineup = (team.lineup ?? []) as unknown[];
  const bench = (team.bench ?? []) as unknown[];
  if (!lineup.length && !bench.length) return null;
  const mapPlayer = (p: unknown) => {
    const player = p as Record<string, unknown>;
    return {
      id: player.id as number,
      nome: player.name as string,
      posicao: (player.position as string) ?? null,
      camisa: (player.shirtNumber as number) ?? null,
    };
  };
  return {
    formacao: (team.formation as string) ?? null,
    titulares: lineup.map(mapPlayer),
    reservas: bench.map(mapPlayer),
  };
}

function _mapStats(team: Record<string, unknown> | undefined): MatchStats | null {
  const s = team?.statistics as Record<string, unknown> | undefined;
  if (!s) return null;
  return {
    posse: (s.ball_possession as number) ?? null,
    chutes: (s.shots as number) ?? null,
    chutes_no_gol: (s.shots_on_goal as number) ?? null,
    escanteios: (s.corner_kicks as number) ?? null,
    faltas: (s.fouls as number) ?? null,
    amarelos: (s.yellow_cards as number) ?? null,
    vermelhos: (s.red_cards as number) ?? null,
    impedimentos: (s.offsides as number) ?? null,
    defesas: (s.saves as number) ?? null,
  };
}
