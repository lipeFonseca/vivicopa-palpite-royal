import { createClient } from "jsr:@supabase/supabase-js@2";

const API = "https://api.football-data.org/v4";
const COMPETICAO = "WC";
const TEMPORADA = "2026";

function formatarDataApi(d: Date) {
  return d.toISOString().slice(0, 10);
}

function mapearStatus(status: string) {
  switch (status) {
    case "SCHEDULED":
    case "TIMED":
      return "NS";
    case "IN_PLAY":
      return "LIVE";
    case "PAUSED":
      return "HT";
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
      return status;
  }
}

function placar(j: any, lado: "home" | "away") {
  return j.score?.fullTime?.[lado] ?? j.score?.regularTime?.[lado] ?? 0;
}

function mapear(j: any) {
  return {
    id: String(j.id),
    time_a: j.homeTeam?.name ?? "Mandante indefinido",
    time_b: j.awayTeam?.name ?? "Visitante indefinido",
    placar_a: placar(j, "home"),
    placar_b: placar(j, "away"),
    status: mapearStatus(j.status),
    inicia_em: j.utcDate,
  };
}

async function buscarPartidas(path: string, key: string) {
  const r = await fetch(`${API}${path}`, {
    headers: { "X-Auth-Token": key },
  });
  const json = await r.json();
  if (!r.ok) {
    throw new Error(json.message ?? `football-data.org retornou HTTP ${r.status}`);
  }
  return json.matches ?? [];
}

Deno.serve(async (req) => {
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const key = Deno.env.get("FOOTBALL_DATA_TOKEN");
  if (!key) {
    return Response.json(
      { ok: false, error: "Secret FOOTBALL_DATA_TOKEN não configurado" },
      { status: 500 },
    );
  }

  const url = new URL(req.url);
  if (url.searchParams.get("seed") === "true") {
    const partidas = await buscarPartidas(
      `/competitions/${COMPETICAO}/matches?season=${TEMPORADA}`,
      key,
    );
    const rows = partidas.map(mapear);
    if (rows.length) await sb.from("partidas").upsert(rows);
    return Response.json({ ok: true, seed: rows.length });
  }

  const agora = Date.now();
  const { data: cand } = await sb
    .from("partidas")
    .select("inicia_em,status")
    .not("status", "in", "(FT,AET,PEN)");
  const temJogo = (cand ?? []).some((p) => {
    if (!p.inicia_em) return false;
    const ini = new Date(p.inicia_em).getTime();
    return agora >= ini - 5 * 60_000 && agora <= ini + 150 * 60_000;
  });
  if (!temJogo) return Response.json({ ok: true, msg: "sem jogo na janela" });

  const de = new Date(agora - 6 * 60 * 60_000);
  const ate = new Date(agora + 18 * 60 * 60_000);
  const partidas = await buscarPartidas(
    `/competitions/${COMPETICAO}/matches?season=${TEMPORADA}&dateFrom=${formatarDataApi(de)}&dateTo=${formatarDataApi(ate)}`,
    key,
  );
  const rows = partidas.map(mapear);
  if (rows.length) await sb.from("partidas").upsert(rows);

  return Response.json({ ok: true, atualizados: rows.length });
});
