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
    const [apiMatches, apiTeams] = await Promise.all([
      client.scheduled(COMP, "2026-06-01", "2026-07-20"),
      client.teams(COMP),
    ]);

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
  };

  const { data: stored } = await sb
    .from("partidas")
    .select("id,status,inicia_em,placar_a,placar_b");

  const rows = (stored ?? []) as StoredRow[];

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

  const summary: Record<string, unknown> = {
    live: 0,
    pre_match: 0,
    suspicious: 0,
    scheduled: 0,
  };

  // ── Phase 3: Live matches (single API call covers all) ──────────────────
  if (liveRows.length > 0) {
    try {
      const liveData = await client.live(COMP) as Record<string, unknown>[];
      if (liveData.length) {
        await sb.from("partidas").upsert(liveData.map((m) => mapFullRow(m, agora)));
        summary.live = liveData.length;
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
      if (match) {
        await sb.from("partidas").upsert([mapFullRow(match, agora)]);
        summary.pre_match = (summary.pre_match as number) + 1;
      }
    } catch (err) {
      console.error(`Phase 2 error for ${m.id}:`, (err as Error).message);
    }
  }

  // ── Phase 4: Consolidate suspicious 0-0 finished matches ────────────────
  const reserve = Math.max(0, client.info().remaining - 1);
  const suspToFetch = suspiciousRows.slice(0, Math.min(suspiciousRows.length, reserve));
  for (const m of suspToFetch) {
    try {
      const match = await client.details(m.id) as Record<string, unknown>;
      if (match) {
        await sb.from("partidas").upsert([mapFullRow(match, agora)]);
        summary.suspicious = (summary.suspicious as number) + 1;
      }
    } catch (err) {
      console.error(`Phase 4 error for ${m.id}:`, (err as Error).message);
    }
  }

  // ── Phase 1: Scheduling update when nothing live/pre-match ──────────────
  // Only runs when the app is idle and there's rate budget to spare.
  if (liveRows.length === 0 && preMatchRows.length === 0 && client.info().remaining > 2) {
    try {
      const from = fmt(new Date(agora - 6 * 3_600_000));
      const to = fmt(new Date(agora + 18 * 3_600_000));
      const scheduledData = await client.scheduled(COMP, from, to) as Record<string, unknown>[];
      if (scheduledData.length) {
        await sb.from("partidas").upsert(
          scheduledData.map((m) => mapScheduledRow(m, agora)),
        );
        summary.scheduled = scheduledData.length;
      }
    } catch (err) {
      console.error("Phase 1 error:", (err as Error).message);
    }
  }

  // Fallback: no live games and no pre-match — original window logic as safety
  // net so matches don't go stale during quiet periods.
  const hasActivity =
    (summary.live as number) > 0 ||
    (summary.pre_match as number) > 0 ||
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
