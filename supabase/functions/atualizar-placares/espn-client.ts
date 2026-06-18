/**
 * espn-client.ts
 * ESPN unofficial API client for live World Cup data.
 *
 * No API key required. No documented rate limit.
 * Used as primary data source for status, scores, goals, cards, lineups and news.
 */

import type { GoalEvent, CardEvent, SubEvent, Lineup, MatchStats } from "./football-data-client.ts";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface EspnScoreboardMatch {
  espnId: string;
  status: string;
  minuto: number | null;
  acrescimos: number | null;
  placarA: number;
  placarB: number;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  iniciaEm: string;
  fasePolling: "pre" | "live" | "post";
}

export interface EspnSummary {
  gols: GoalEvent[];
  cartoes: CardEvent[];
  substituicoes: SubEvent[];
  escalacaoA: Lineup | null;
  escalacaoB: Lineup | null;
  estatisticasA: MatchStats | null;
  estatisticasB: MatchStats | null;
  placarParcialA: number | null;
  placarParcialB: number | null;
  artigo: EspnArtigo | null;
  noticias: EspnArtigo[];
}

export interface EspnArtigo {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  imagemUrl: string | null;
  publicadoEm: string | null;
}

// ─── Name normalization ─────────────────────────────────────────────────────

const ESPN_NAME_ALIASES: Record<string, string> = {
  "south korea": "korea republic",
  "czechia": "czech republic",
  "usa": "united states",
  "ir iran": "iran",
  "ivory coast": "côte d'ivoire",
  "cote d'ivoire": "côte d'ivoire",
  "republic of ireland": "ireland",
  "türkiye": "turkey",
  "türkiye milli": "turkey",
};

export function espnNorm(name: string): string {
  const lower = name.toLowerCase().trim();
  return ESPN_NAME_ALIASES[lower] ?? lower;
}

// ─── Client ────────────────────────────────────────────────────────────────

export class EspnClient {
  async scoreboard(): Promise<EspnScoreboardMatch[]> {
    const res = await fetch(`${ESPN_BASE}/scoreboard`);
    if (!res.ok) throw new Error(`ESPN scoreboard HTTP ${res.status}`);
    const data = await res.json() as Record<string, unknown>;
    const events = (data.events as Record<string, unknown>[]) ?? [];
    return events.map(parseScoreboardEvent).filter(Boolean) as EspnScoreboardMatch[];
  }

  async summary(espnId: string): Promise<EspnSummary> {
    const res = await fetch(`${ESPN_BASE}/summary?event=${espnId}`);
    if (!res.ok) throw new Error(`ESPN summary HTTP ${res.status} for event ${espnId}`);
    const data = await res.json() as Record<string, unknown>;
    return parseSummary(data);
  }
}

// ─── Clock helpers ──────────────────────────────────────────────────────────

function parseClock(displayClock: string): { minuto: number | null; acrescimos: number | null } {
  const m = displayClock.match(/^(\d+)'\+(\d+)/);
  if (m) return { minuto: parseInt(m[1], 10), acrescimos: parseInt(m[2], 10) || null };
  const m2 = displayClock.match(/^(\d+)'/);
  if (m2) return { minuto: parseInt(m2[1], 10), acrescimos: null };
  return { minuto: null, acrescimos: null };
}

function mapStatus(
  state: string,
  detail: string,
  displayClock: string,
): { status: string; minuto: number | null; acrescimos: number | null } {
  if (state === "post") return { status: "FT", minuto: 90, acrescimos: null };
  if (state !== "in") return { status: "NS", minuto: null, acrescimos: null };
  if (detail === "HT") return { status: "HT", minuto: 45, acrescimos: null };
  if (detail.startsWith("ET") || detail.toLowerCase().includes("extra")) {
    const t = parseClock(displayClock);
    return { status: "ET", minuto: t.minuto, acrescimos: t.acrescimos };
  }
  if (detail.toLowerCase().includes("pen")) {
    return { status: "PEN_LIVE", minuto: null, acrescimos: null };
  }
  const t = parseClock(displayClock);
  return { status: "LIVE", minuto: t.minuto, acrescimos: t.acrescimos };
}

// ─── Scoreboard parser ──────────────────────────────────────────────────────

function parseScoreboardEvent(event: Record<string, unknown>): EspnScoreboardMatch | null {
  const comps = (event.competitions as Record<string, unknown>[])?.[0];
  if (!comps) return null;

  const espnStatus = comps.status as Record<string, unknown>;
  const statusType = espnStatus.type as Record<string, unknown>;
  const state = statusType.state as string;
  const detail = (statusType.detail as string) ?? "";
  const displayClock = (espnStatus.displayClock as string) ?? "";
  const { status, minuto, acrescimos } = mapStatus(state, detail, displayClock);

  const competitors = (comps.competitors as Record<string, unknown>[]) ?? [];
  const home = competitors.find((c) => (c.homeAway as string) === "home");
  const away = competitors.find((c) => (c.homeAway as string) === "away");
  if (!home || !away) return null;

  const homeTeam = home.team as Record<string, unknown>;
  const awayTeam = away.team as Record<string, unknown>;

  return {
    espnId: event.id as string,
    status,
    minuto,
    acrescimos,
    placarA: parseInt((home.score as string) ?? "0", 10),
    placarB: parseInt((away.score as string) ?? "0", 10),
    homeTeamId: homeTeam.id as string,
    homeTeamName: homeTeam.displayName as string,
    awayTeamId: awayTeam.id as string,
    awayTeamName: awayTeam.displayName as string,
    iniciaEm: comps.startDate as string,
    fasePolling: state === "post" ? "post" : state === "in" ? "live" : "pre",
  };
}

// ─── Summary parser ─────────────────────────────────────────────────────────

function parseSummary(data: Record<string, unknown>): EspnSummary {
  const header = data.header as Record<string, unknown> | null;
  const headerComps = (header?.competitions as Record<string, unknown>[]) ?? [];
  const headerComp = headerComps[0] ?? {};
  const headerCompetitors = (headerComp.competitors as Record<string, unknown>[]) ?? [];
  const homeTeamId = (
    (headerCompetitors.find((c) => (c.homeAway as string) === "home")
      ?.team as Record<string, unknown> | undefined)?.id as string | undefined
  );

  const keyEvents = (data.keyEvents as Record<string, unknown>[]) ?? [];
  const rosters = (data.rosters as Record<string, unknown>[]) ?? [];
  const boxscoreTeams =
    ((data.boxscore as Record<string, unknown>)?.teams as Record<string, unknown>[]) ?? [];

  return {
    gols: mapGoals(keyEvents, homeTeamId),
    cartoes: mapCards(keyEvents),
    substituicoes: mapSubs(keyEvents),
    escalacaoA: mapRoster(rosters, "home"),
    escalacaoB: mapRoster(rosters, "away"),
    estatisticasA: mapStats(boxscoreTeams, "home"),
    estatisticasB: mapStats(boxscoreTeams, "away"),
    ...extractHalfTimeScore(keyEvents, homeTeamId),
    artigo: mapArtigo(data.article as Record<string, unknown> | null),
    noticias: mapNoticias(
      (data.news as Record<string, unknown> | null)?.articles as
        | Record<string, unknown>[]
        | null,
    ),
  };
}

// ─── Half-time score ────────────────────────────────────────────────────────

function extractHalfTimeScore(
  keyEvents: Record<string, unknown>[],
  homeTeamId: string | undefined,
): { placarParcialA: number | null; placarParcialB: number | null } {
  const htIndex = keyEvents.findIndex(
    (ev) => (ev.type as Record<string, unknown>)?.type === "halftime",
  );
  if (htIndex === -1) return { placarParcialA: null, placarParcialB: null };

  let a = 0, b = 0;
  const goalTypes = new Set(["goal", "penalty---scored", "own-goal"]);
  for (let i = 0; i < htIndex; i++) {
    const ev = keyEvents[i];
    if (!goalTypes.has((ev.type as Record<string, unknown>)?.type as string)) continue;
    const teamId = (ev.team as Record<string, unknown>)?.id as string;
    const isOwn = (ev.type as Record<string, unknown>)?.type === "own-goal";
    const scoredForHome = isOwn ? teamId !== homeTeamId : teamId === homeTeamId;
    if (scoredForHome) a++; else b++;
  }
  return { placarParcialA: a, placarParcialB: b };
}

// ─── Goal mapper ────────────────────────────────────────────────────────────

function mapGoals(
  keyEvents: Record<string, unknown>[],
  homeTeamId: string | undefined,
): GoalEvent[] {
  const goalTypes = new Set(["goal", "penalty---scored", "own-goal"]);
  let a = 0, b = 0;

  return keyEvents
    .filter((ev) => goalTypes.has((ev.type as Record<string, unknown>)?.type as string))
    .map((ev) => {
      const type = (ev.type as Record<string, unknown>)?.type as string;
      const team = ev.team as Record<string, unknown> | undefined;
      const participants = (ev.participants as Record<string, unknown>[]) ?? [];
      const scorer = (participants[0]?.athlete as Record<string, unknown>) ?? null;
      const assister = (participants[1]?.athlete as Record<string, unknown>) ?? null;
      const { minuto, acrescimos } = parseClock(
        (ev.clock as Record<string, unknown>)?.displayValue as string ?? "",
      );

      const tipo: "REGULAR" | "OWN" | "PENALTY" =
        type === "penalty---scored" ? "PENALTY" : type === "own-goal" ? "OWN" : "REGULAR";

      const teamId = team?.id as string | undefined;
      const isHome = teamId === homeTeamId;
      const isOwn = tipo === "OWN";
      if (isHome && !isOwn) a++;
      else if (!isHome && !isOwn) b++;
      else if (isHome && isOwn) b++;
      else a++;

      return {
        minuto: minuto ?? 0,
        acrescimos,
        tipo,
        time_nome: (team?.displayName as string) ?? null,
        time_id: parseInt(teamId ?? "0", 10) || null,
        marcador_nome: (scorer?.displayName as string) ?? null,
        marcador_id: parseInt((scorer?.id as string) ?? "0", 10) || null,
        assistencia_nome: assister ? ((assister.displayName as string) ?? null) : null,
        placar_a: a,
        placar_b: b,
      } satisfies GoalEvent;
    });
}

// ─── Card mapper ────────────────────────────────────────────────────────────

function mapCards(keyEvents: Record<string, unknown>[]): CardEvent[] {
  const cardTypes = new Set(["yellow-card", "red-card", "yellow-red-card"]);
  return keyEvents
    .filter((ev) => cardTypes.has((ev.type as Record<string, unknown>)?.type as string))
    .map((ev) => {
      const type = (ev.type as Record<string, unknown>)?.type as string;
      const team = ev.team as Record<string, unknown> | undefined;
      const player =
        ((ev.participants as Record<string, unknown>[])?.[0]?.athlete as Record<string, unknown>) ??
        null;
      const { minuto } = parseClock(
        (ev.clock as Record<string, unknown>)?.displayValue as string ?? "",
      );

      const cartao: "YELLOW" | "RED" | "YELLOW_RED" =
        type === "red-card" ? "RED" : type === "yellow-red-card" ? "YELLOW_RED" : "YELLOW";

      return {
        minuto: minuto ?? 0,
        time_nome: (team?.displayName as string) ?? null,
        time_id: parseInt((team?.id as string) ?? "0", 10) || null,
        jogador_nome: (player?.displayName as string) ?? null,
        jogador_id: parseInt((player?.id as string) ?? "0", 10) || null,
        cartao,
      } satisfies CardEvent;
    });
}

// ─── Sub mapper ─────────────────────────────────────────────────────────────

function mapSubs(keyEvents: Record<string, unknown>[]): SubEvent[] {
  return keyEvents
    .filter((ev) => (ev.type as Record<string, unknown>)?.type === "substitution")
    .map((ev) => {
      const team = ev.team as Record<string, unknown> | undefined;
      const participants = (ev.participants as Record<string, unknown>[]) ?? [];
      const entering = (participants[0]?.athlete as Record<string, unknown>) ?? null;
      const leaving = (participants[1]?.athlete as Record<string, unknown>) ?? null;
      const { minuto } = parseClock(
        (ev.clock as Record<string, unknown>)?.displayValue as string ?? "",
      );

      return {
        minuto: minuto ?? 0,
        time_nome: (team?.displayName as string) ?? null,
        saiu_nome: (leaving?.displayName as string) ?? null,
        entrou_nome: (entering?.displayName as string) ?? null,
      } satisfies SubEvent;
    });
}

// ─── Roster mapper ───────────────────────────────────────────────────────────

function mapRoster(
  rosters: Record<string, unknown>[],
  homeAway: "home" | "away",
): Lineup | null {
  const teamRoster = rosters.find((r) => (r.homeAway as string) === homeAway);
  if (!teamRoster) return null;

  const players = (teamRoster.roster as Record<string, unknown>[]) ?? [];
  if (!players.length) return null;

  const mapPlayer = (p: Record<string, unknown>) => {
    const athlete = p.athlete as Record<string, unknown>;
    const pos = p.position as Record<string, unknown> | undefined;
    return {
      id: parseInt((athlete?.id as string) ?? "0", 10),
      nome: (athlete?.displayName as string) ?? "",
      posicao: (pos?.abbreviation as string) ?? null,
      camisa: (p.jersey as number) ?? null,
    };
  };

  return {
    formacao: (teamRoster.formation as string) ?? null,
    titulares: players.filter((p) => p.starter).map(mapPlayer),
    reservas: players.filter((p) => !p.starter).map(mapPlayer),
  };
}

// ─── Stats mapper ────────────────────────────────────────────────────────────

function mapStats(
  teams: Record<string, unknown>[],
  homeAway: "home" | "away",
): MatchStats | null {
  const team = teams.find((t) => (t.homeAway as string) === homeAway);
  if (!team) return null;

  const stats = (team.statistics as Record<string, unknown>[]) ?? [];
  const get = (name: string) =>
    parseFloat(
      (stats.find((s) => s.name === name)?.displayValue as string) ?? "",
    ) || null;

  return {
    posse: get("possessionPct"),
    chutes: get("totalShots"),
    chutes_no_gol: get("shotsOnTarget"),
    escanteios: get("wonCorners"),
    faltas: get("foulsCommitted"),
    amarelos: get("yellowCards"),
    vermelhos: get("redCards"),
    impedimentos: get("offsides"),
    defesas: get("saves"),
  };
}

// ─── Article mappers ─────────────────────────────────────────────────────────

function mapArtigo(article: Record<string, unknown> | null): EspnArtigo | null {
  if (!article?.id) return null;
  const images = (article.images as Record<string, unknown>[]) ?? [];
  const img = images.find((i) => (i.type as string) === "header") ?? images[0];
  return {
    id: String(article.id),
    titulo: (article.headline as string) ?? "",
    descricao: (article.description as string) ?? null,
    tipo: (article.type as string) ?? "News",
    imagemUrl: (img?.url as string) ?? null,
    publicadoEm: (article.published as string) ?? null,
  };
}

function mapNoticias(articles: Record<string, unknown>[] | null): EspnArtigo[] {
  if (!articles) return [];
  return articles
    .map((a) => {
      const images = (a.images as Record<string, unknown>[]) ?? [];
      const img = images.find((i) => (i.type as string) === "header") ?? images[0];
      return {
        id: String(a.id ?? ""),
        titulo: (a.headline as string) ?? "",
        descricao: (a.description as string) ?? null,
        tipo: (a.type as string) ?? "News",
        imagemUrl: (img?.url as string) ?? null,
        publicadoEm: (a.published as string) ?? null,
      };
    })
    .filter((a) => a.id && a.titulo);
}
