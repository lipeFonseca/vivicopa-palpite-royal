import { createClient } from "jsr:@supabase/supabase-js@2";

const API = "https://v3.football.api-sports.io";

function mapear(j: any) {
  return {
    id: String(j.fixture.id),
    time_a: j.teams.home.name,
    time_b: j.teams.away.name,
    placar_a: j.goals.home ?? 0,
    placar_b: j.goals.away ?? 0,
    status: j.fixture.status.short,
    inicia_em: j.fixture.date,
  };
}

Deno.serve(async (req) => {
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const key = Deno.env.get("API_FOOTBALL_KEY")!;

  const url = new URL(req.url);
  if (url.searchParams.get("seed") === "true") {
    const r = await fetch(`${API}/fixtures?league=1&season=2026`, {
      headers: { "x-apisports-key": key },
    });
    const { response } = await r.json();
    const rows = (response ?? []).map(mapear);
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

  const res = await fetch(`${API}/fixtures?live=all`, {
    headers: { "x-apisports-key": key },
  });
  const { response } = await res.json();
  const rows = (response ?? []).filter((j: any) => j.league?.id === 1).map(mapear);
  if (rows.length) await sb.from("partidas").upsert(rows);

  return Response.json({ ok: true, atualizados: rows.length });
});
