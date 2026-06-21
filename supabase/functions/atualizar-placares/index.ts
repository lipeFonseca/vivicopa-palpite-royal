import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  FootballDataClient,
  getPhase,
  mapScheduledRow,
  mapFullRow,
} from "./football-data-client.ts";
import { EspnClient, espnNorm } from "./espn-client.ts";

const COMP = "WC";

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number) {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

type ComparableStoredRow = {
  ultima_atualizacao_api: string | null;
  status?: string | null;
  placar_a?: number | null;
  placar_b?: number | null;
  minuto?: number | null;
  acrescimos?: number | null;
  inicia_em?: string | null;
  time_a?: string | null;
  time_b?: string | null;
};

function changed(
  apiMatch: Record<string, unknown>,
  agora: number,
  stored?: ComparableStoredRow,
  mode: "scheduled" | "full" = "full",
) {
  const apiLastUpdated = (apiMatch.lastUpdated as string | null) ?? null;
  if (!stored || !apiLastUpdated || stored.ultima_atualizacao_api !== apiLastUpdated) {
    return true;
  }

  const next = mode === "full" ? mapFullRow(apiMatch, agora) : mapScheduledRow(apiMatch, agora);

  if (stored.status !== ((next.status as string | null) ?? null)) return true;
  if (stored.placar_a !== ((next.placar_a as number | null) ?? null)) return true;
  if (stored.placar_b !== ((next.placar_b as number | null) ?? null)) return true;
  if (stored.inicia_em !== ((next.inicia_em as string | null) ?? null)) return true;
  if (stored.time_a !== ((next.time_a as string | null) ?? null)) return true;
  if (stored.time_b !== ((next.time_b as string | null) ?? null)) return true;

  if (mode === "full") {
    if (stored.minuto !== ((next.minuto as number | null) ?? null)) return true;
    if (stored.acrescimos !== ((next.acrescimos as number | null) ?? null)) return true;
  }

  return false;
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

  const delayMs = parseInt(url.searchParams.get("delay") ?? "0") * 1000;
  if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));

  const agora = Date.now();

  // ── Seed mode: full import of all WC matches + teams ────────────────────
  if (url.searchParams.get("seed") === "true") {
    const apiMatches = await client.scheduled(COMP, "2026-06-01", "2026-07-20");
    const apiTeams = await client.teams(COMP);

    const matchRows = (apiMatches as Record<string, unknown>[]).map((m) =>
      mapScheduledRow(m, agora),
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
    minuto: number | null;
    acrescimos: number | null;
    time_a: string | null;
    time_b: string | null;
    ultima_atualizacao_api: string | null;
  };

  const { data: stored } = await sb
    .from("partidas")
    .select(
      "id,status,inicia_em,placar_a,placar_b,minuto,acrescimos,time_a,time_b,ultima_atualizacao_api",
    );

  const rows = (stored ?? []) as StoredRow[];
  const storedById = new Map(rows.map((r) => [r.id, r]));

  const liveRows = rows.filter((m) => getPhase(m.status, m.inicia_em, agora) === "live");
  const preMatchRows = rows.filter((m) => getPhase(m.status, m.inicia_em, agora) === "pre_match");
  const startedPendingRows = rows.filter(
    (m) => getPhase(m.status, m.inicia_em, agora) === "started_pending",
  );

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
    started_pending: 0,
    suspicious: 0,
    scheduled: 0,
    espn: 0,
  };

  if (url.searchParams.get("mode") === "fast-live") {
    const espnClient = new EspnClient();
    const espnSummaryPairs = new Map<string, { espnId: string; dbId: string }>();

    // ── Passo 1: ESPN scoreboard → status/placar primário ──────────────────
    try {
      const scoreboardMatches = await espnClient.scoreboard();

      const todayStr = new Date(agora).toISOString().slice(0, 10);
      const todayRows = rows.filter((r) => r.inicia_em && r.inicia_em.slice(0, 10) === todayStr);
      const lookup = new Map(
        todayRows.map((r) => [`${espnNorm(r.time_a ?? "")}|${espnNorm(r.time_b ?? "")}`, r]),
      );

      const scoreUpserts: Record<string, unknown>[] = [];

      for (const m of scoreboardMatches) {
        if (m.status === "NS") continue;

        const dbRow = lookup.get(`${espnNorm(m.homeTeamName)}|${espnNorm(m.awayTeamName)}`);
        if (!dbRow) continue;

        if (m.fasePolling === "live" || m.fasePolling === "post") {
          espnSummaryPairs.set(dbRow.id, { espnId: m.espnId, dbId: dbRow.id });
        }

        if (dbRow.status === "FT" && m.status !== "FT") continue;

        if (
          dbRow.status === m.status &&
          dbRow.placar_a === m.placarA &&
          dbRow.placar_b === m.placarB &&
          dbRow.minuto === m.minuto
        )
          continue;

        scoreUpserts.push({
          id: dbRow.id,
          espn_id: m.espnId,
          status: m.status,
          placar_a: m.placarA,
          placar_b: m.placarB,
          minuto: m.minuto,
          acrescimos: m.acrescimos,
          fase_polling: m.fasePolling === "post" ? "finished" : "live",
          ultima_busca_api: new Date(agora).toISOString(),
        });
      }

      if (scoreUpserts.length) {
        await sb.from("partidas").upsert(scoreUpserts);
        summary.espn = scoreUpserts.length;
      }
    } catch (err) {
      console.error("ESPN scoreboard error:", (err as Error).message);
    }

    // ── Passo 2: ESPN summary → gols, cartões, escalações, notícias ────────
    let espnDetail = 0;
    for (const { espnId, dbId } of espnSummaryPairs.values()) {
      try {
        const sum = await espnClient.summary(espnId);

        await sb.from("partidas").upsert([
          {
            id: dbId,
            espn_id: espnId,
            gols: sum.gols,
            cartoes: sum.cartoes,
            substituicoes: sum.substituicoes,
            escalacao_a: sum.escalacaoA,
            escalacao_b: sum.escalacaoB,
            estatisticas_a: sum.estatisticasA,
            estatisticas_b: sum.estatisticasB,
            placar_parcial_a: sum.placarParcialA,
            placar_parcial_b: sum.placarParcialB,
            ultima_busca_api: new Date(agora).toISOString(),
          },
        ]);
        espnDetail++;

        // Salva artigo e notícias relacionadas
        const artigosParaSalvar = [
          sum.artigo ? { ...sum.artigo, partida_id: dbId } : null,
          ...sum.noticias.map((n) => ({ ...n, partida_id: null as string | null })),
        ].filter(Boolean) as Array<{
          id: string;
          titulo: string;
          descricao: string | null;
          tipo: string;
          imagemUrl: string | null;
          publicadoEm: string | null;
          partida_id: string | null;
        }>;

        if (artigosParaSalvar.length) {
          await sb.from("noticias").upsert(
            artigosParaSalvar.map((a) => ({
              id: a.id,
              titulo: a.titulo,
              descricao: a.descricao,
              tipo: a.tipo,
              partida_id: a.partida_id,
              imagem_url: a.imagemUrl,
              publicado_em: a.publicadoEm,
            })),
            { onConflict: "id" },
          );
        }
      } catch (err) {
        console.error(`ESPN summary error for ${espnId}:`, (err as Error).message);
        // Fallback: football-data.org para este jogo
        try {
          const fdMatch = (await client.details(dbId)) as Record<string, unknown>;
          if (fdMatch && changed(fdMatch, agora, storedById.get(dbId), "full")) {
            await sb.from("partidas").upsert([mapFullRow(fdMatch, agora)]);
            summary.live = (summary.live as number) + 1;
          }
        } catch (err2) {
          console.error(`FD fallback error for ${dbId}:`, (err2 as Error).message);
        }
      }
    }
    summary.espn_detail = espnDetail;

    // ── Passo 3: started_pending não reconhecidos pela ESPN → football-data.org
    const espnLiveDbIds = new Set(Array.from(espnSummaryPairs.values(), (p) => p.dbId));
    const pendingMissed = startedPendingRows.filter((r) => !espnLiveDbIds.has(r.id));
    const pendingBudget = Math.max(0, client.info().remaining - 1);
    for (const m of pendingMissed.slice(0, pendingBudget)) {
      try {
        const match = (await client.details(m.id)) as Record<string, unknown>;
        if (match && changed(match, agora, storedById.get(m.id), "full")) {
          await sb.from("partidas").upsert([mapFullRow(match, agora)]);
          summary.started_pending = (summary.started_pending as number) + 1;
        }
      } catch (err) {
        console.error(`FD pending error for ${m.id}:`, (err as Error).message);
      }
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
      const liveData = (await client.live(COMP)) as Record<string, unknown>[];
      const changedLive = liveData.filter((m) =>
        changed(m, agora, storedById.get(String(m.id)), "full"),
      );
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
      const match = (await client.lineups(m.id)) as Record<string, unknown>;
      if (match && changed(match, agora, storedById.get(String(match.id)), "full")) {
        await sb.from("partidas").upsert([mapFullRow(match, agora)]);
        summary.pre_match = (summary.pre_match as number) + 1;
      }
    } catch (err) {
      console.error(`Phase 2 error for ${m.id}:`, (err as Error).message);
    }
  }

  // Matches that already started but are still stale in the DB need a forced
  // details refresh so the app can switch from VS to live score immediately.
  const pendingBudget = Math.max(0, client.info().remaining - 2);
  const pendingToFetch = startedPendingRows.slice(
    0,
    Math.min(startedPendingRows.length, pendingBudget),
  );
  for (const m of pendingToFetch) {
    try {
      const match = (await client.details(m.id)) as Record<string, unknown>;
      if (match && changed(match, agora, storedById.get(String(match.id)), "full")) {
        await sb.from("partidas").upsert([mapFullRow(match, agora)]);
        summary.started_pending = (summary.started_pending as number) + 1;
      }
    } catch (err) {
      console.error(`Phase 2b error for ${m.id}:`, (err as Error).message);
    }
  }

  // ── Phase 4: Consolidate suspicious 0-0 finished matches ────────────────
  const reserve = Math.max(0, client.info().remaining - 1);
  const suspToFetch = consolidationRows.slice(0, Math.min(consolidationRows.length, reserve));
  for (const m of suspToFetch) {
    try {
      const match = (await client.details(m.id)) as Record<string, unknown>;
      if (match && changed(match, agora, storedById.get(String(match.id)), "full")) {
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
    startedPendingRows.length === 0 &&
    canFetchScheduled &&
    client.info().remaining > 2
  ) {
    try {
      const from = fmt(new Date(agora - 6 * 3_600_000));
      const to = fmt(addDays(new Date(agora + 18 * 3_600_000), 1));
      const scheduledData = (await client.scheduled(COMP, from, to)) as Record<string, unknown>[];
      const changedScheduled = scheduledData.filter((m) =>
        changed(m, agora, storedById.get(String(m.id)), "scheduled"),
      );
      if (changedScheduled.length) {
        await sb.from("partidas").upsert(changedScheduled.map((m) => mapScheduledRow(m, agora)));
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
    (summary.started_pending as number) > 0 ||
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
