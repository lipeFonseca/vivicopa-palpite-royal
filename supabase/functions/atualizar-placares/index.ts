import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  FootballDataClient,
  getPhase,
  mapScheduledRow,
  mapFullRow,
} from "./football-data-client.ts";

const COMP = "WC";

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number) {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function changed(apiMatch: Record<string, unknown>, stored?: { ultima_atualizacao_api: string | null }) {
  const apiLastUpdated = (apiMatch.lastUpdated as string | null) ?? null;
  return !apiLastUpdated || !stored || stored.ultima_atualizacao_api !== apiLastUpdated;
}

// ─── Selecao mapper (unchanged from original) ──────────────────────────────

function mapSelecao(s: Record<string, unknown>) {
  const area = s.area as Record<string, unknown> | undefined;
  const coach = s.coach as Record<string, unknown> | undefined;
  return {
    id: String(s.id),
    nome: s.name,
    nome_curto: s.shortName ?? null,
    sigla: s.tla ?? null,
    area_id: area?.id ?? null,
    area_nome: area?.name ?? null,
    area_codigo: area?.code ?? null,
    area_bandeira: area?.flag ?? null,
    escudo_url: s.crest ?? null,
    endereco: s.address ?? null,
    site: s.website ?? null,
    fundada: s.founded ?? null,
    cores: s.clubColors ?? null,
    tecnico_nome: coach?.name ?? null,
    tecnico_nacionalidade: coach?.nationality ?? null,
    tecnico_data_nascimento: coach?.dateOfBirth ?? null,
    elenco: s.squad ?? [],
    staff: s.staff ?? [],
    competicoes: s.runningCompetitions ?? [],
    api_payload: s,
    ultima_atualizacao: s.lastUpdated ?? null,
    atualizado_em: new Date().toISOString(),
  };
}

// ─── Main handler ──────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const token = Deno.env.get("FOOTBALL_DATA_TOKEN");
  if (!token) {
    return Response.json(
      { ok: false, error: "Secret FOOTBALL_DATA_TOKEN não configurado" },
      { status: 500 },
    );
  }

  const client = new FootballDataClient(token);
  const url = new URL(req.url);
  const agora = Date.now();

  // ── Seed mode: full import of all WC matches + teams ────────────────────
  if (url.searchParams.get("seed") === "true") {
    const apiMatches = await client.scheduled(COMP, "2026-06-01", "2026-07-20");
    const apiTeams = await client.teams(COMP);

    const matchRows = (apiMatches as Record<string, unknown>[]).map((m) =>
      mapScheduledRow(m, agora)
    );
    if (matchRows.length) {
      const { error } = await sb.from("partidas").upsert(matchRows);
      if (error) throw error;
    }

    const teamRows = (apiTeams as Record<string, unknown>[]).map(mapSelecao);
    if (teamRows.length) {
      const { error } = await sb.from("selecoes").upsert(teamRows);
      if (error) throw error;
    }

    return Response.json({
      ok: true,
      seed: matchRows.length,
      selecoes: teamRows.length,
    });
  }

  // ── Normal sync: phase-based polling ────────────────────────────────────

  type StoredRow = {
    id: string;
    status: string;
    inicia_em: string | null;
    placar_a: number;
    placar_b: number;
    ultima_atualizacao_api: string | null;
  };

  const { data: stored } = await sb
    .from("partidas")
    .select("id,status,inicia_em,placar_a,placar_b,ultima_atualizacao_api");

  const rows = (stored ?? []) as StoredRow[];
  const storedById = new Map(rows.map((r) => [r.id, r]));

  const liveRows = rows.filter((m) => getPhase(m.status, m.inicia_em, agora) === "live");
  const preMatchRows = rows.filter((m) => getPhase(m.status, m.inicia_em, agora) === "pre_match");

  // Recently finished (≤6h) with 0-0 score may be API lag — re-consolidate
  const suspiciousRows = rows.filter((m) => {
    if (getPhase(m.status, m.inicia_em, agora) !== "finished") return false;
    if (m.placar_a !== 0 || m.placar_b !== 0) return false;
    if (!m.inicia_em) return false;
    const hoursAgo = (agora - new Date(m.inicia_em).getTime()) / 3_600_000;
    return hoursAgo <= 6;
  });
  const consolidationRows = Array.from(
    new Map([...liveRows, ...suspiciousRows].map((m) => [m.id, m])).values(),
  );

  const summary: Record<string, unknown> = {
    live: 0,
    pre_match: 0,
    suspicious: 0,
    scheduled: 0,
  };

  if (url.searchParams.get("mode") === "fast-live") {
    try {
      const liveData = await client.live(COMP) as Record<string, unknown>[];
      const changedLive = liveData.filter((m) => changed(m, storedById.get(String(m.id))));
      if (changedLive.length) {
        await sb.from("partidas").upsert(changedLive.map((m) => mapFullRow(m, agora)));
        summary.live = changedLive.length;
      }
    } catch (err) {
      console.error("Fast live error:", (err as Error).message);
    }

    return Response.json({
      ok: true,
      mode: "fast-live",
      ...summary,
      rateLimit: client.info(),
    });
  }

  const scheduledKey = "football_data:scheduled:wc";
  let canFetchScheduled = true;
  const { data: scheduledState } = await sb
    .from("api_sync_state")
    .select("ultima_busca")
    .eq("chave", scheduledKey)
    .maybeSingle();
  const lastScheduledFetch = scheduledState?.ultima_busca
    ? new Date(scheduledState.ultima_busca as string).getTime()
    : 0;
  if (lastScheduledFetch > 0) {
    canFetchScheduled = agora - lastScheduledFetch >= 5 * 60_000;
  }

  // ── Phase 3: Live matches (single API call covers all) ──────────────────
  if (liveRows.length > 0) {
    try {
      const liveData = await client.live(COMP) as Record<string, unknown>[];
      const changedLive = liveData.filter((m) => changed(m, storedById.get(String(m.id))));
      if (changedLive.length) {
        await sb.from("partidas").upsert(changedLive.map((m) => mapFullRow(m, agora)));
        summary.live = changedLive.length;
      } else {
        // API says no live matches — status might have changed to FT already;
        // upsert what we have from Phase 4 below for each previously-live match
      }
    } catch (err) {
      console.error("Phase 3 error:", (err as Error).message);
    }
  }

  // ── Phase 2: Pre-match lineups (one request per match) ──────────────────
  // Limit to available rate-limit budget, keeping 2 slots in reserve
  const budget = Math.max(0, client.info().remaining - 2);
  const preToFetch = preMatchRows.slice(0, Math.min(preMatchRows.length, budget));
  for (const m of preToFetch) {
    try {
      const match = await client.lineups(m.id) as Record<string, unknown>;
      if (match && changed(match, storedById.get(String(match.id)))) {
        await sb.from("partidas").upsert([mapFullRow(match, agora)]);
        summary.pre_match = (summary.pre_match as number) + 1;
      }
    } catch (err) {
      console.error(`Phase 2 error for ${m.id}:`, (err as Error).message);
    }
  }

  // ── Phase 4: Consolidate suspicious 0-0 finished matches ────────────────
  const reserve = Math.max(0, client.info().remaining - 1);
  const suspToFetch = consolidationRows.slice(0, Math.min(consolidationRows.length, reserve));
  for (const m of suspToFetch) {
    try {
      const match = await client.details(m.id) as Record<string, unknown>;
      if (match && changed(match, storedById.get(String(match.id)))) {
        await sb.from("partidas").upsert([mapFullRow(match, agora)]);
        summary.suspicious = (summary.suspicious as number) + 1;
      }
    } catch (err) {
      console.error(`Phase 4 error for ${m.id}:`, (err as Error).message);
    }
  }

  // ── Phase 1: Scheduling update when nothing live/pre-match ──────────────
  // Only runs when the app is idle and there's rate budget to spare.
  if (
    liveRows.length === 0 &&
    preMatchRows.length === 0 &&
    canFetchScheduled &&
    client.info().remaining > 2
  ) {
    try {
      const from = fmt(new Date(agora - 6 * 3_600_000));
      const to = fmt(addDays(new Date(agora + 18 * 3_600_000), 1));
      const scheduledData = await client.scheduled(COMP, from, to) as Record<string, unknown>[];
      const changedScheduled = scheduledData.filter((m) => changed(m, storedById.get(String(m.id))));
      if (changedScheduled.length) {
        await sb.from("partidas").upsert(
          changedScheduled.map((m) => mapScheduledRow(m, agora)),
        );
        summary.scheduled = changedScheduled.length;
      }
      await sb.from("api_sync_state").upsert({
        chave: scheduledKey,
        ultima_busca: new Date(agora).toISOString(),
        atualizado_em: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Phase 1 error:", (err as Error).message);
    }
  }

  // Fallback: no live games and no pre-match — original window logic as safety
  // net so matches don't go stale during quiet periods.
  const hasActivity =
    (summary.live as number) > 0 ||
    (summary.pre_match as number) > 0 ||
    (summary.suspicious as number) > 0 ||
    (summary.scheduled as number) > 0;
  if (!hasActivity) {
    return Response.json({ ok: true, msg: "sem atividade na janela", ...summary });
  }

  return Response.json({
    ok: true,
    ...summary,
    rateLimit: client.info(),
  });
});

