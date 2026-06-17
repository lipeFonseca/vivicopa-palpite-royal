import { supabase } from "@/integrations/supabase/client";
import { jogos } from "@/data/worldcup2026";
import { isFinishedMatchStatus } from "@/lib/prediction-results";

export type WinningPrediction = {
  id: string;
  usuarioId: string;
  usuarioNome: string;
  jogoId: string;
  grupo: string;
  data: string;
  hora: string;
  selecaoA: string;
  selecaoB: string;
  palpiteA: number;
  palpiteB: number;
  resultadoA: number;
  resultadoB: number;
  createdAt: string;
};

export type AdminPalpite = {
  id: string;
  usuarioId: string;
  usuarioNome: string;
  jogoId: string;
  grupo: string;
  data: string;
  hora: string;
  selecaoA: string;
  selecaoB: string;
  palpiteA: number;
  palpiteB: number;
  resultadoA: number | null;
  resultadoB: number | null;
  finalizado: boolean;
  acertouNaMosca: boolean;
  createdAt: string;
};

type PartidaResult = {
  id: string;
  placar_a: number | null;
  placar_b: number | null;
  status: string | null;
  inicia_em: string | null;
};

function jogoSlot(data: string, hora: string) {
  return `${data}T${hora}`;
}

function partidaSlot(iniciaEm: string | null) {
  if (!iniciaEm) return "";
  const brasilia = new Date(new Date(iniciaEm).getTime() - 3 * 60 * 60 * 1000);
  return brasilia.toISOString().slice(0, 16);
}

function mapearPartidasPorJogoId(partidas: PartidaResult[]) {
  const jogosPorSlot = new Map<string, typeof jogos>();
  [...jogos]
    .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))
    .forEach((jogo) => {
      const slot = jogoSlot(jogo.data, jogo.hora);
      jogosPorSlot.set(slot, [...(jogosPorSlot.get(slot) ?? []), jogo]);
    });

  const usadosPorSlot = new Map<string, number>();
  const map = new Map<string, PartidaResult>();

  partidas
    .slice()
    .sort((a, b) => String(a.inicia_em ?? "").localeCompare(String(b.inicia_em ?? "")))
    .forEach((partida) => {
      const slot = partidaSlot(partida.inicia_em);
      const candidatos = jogosPorSlot.get(slot);
      if (!candidatos?.length) return;
      const index = usadosPorSlot.get(slot) ?? 0;
      const jogo = candidatos[index];
      if (!jogo) return;
      map.set(jogo.id, partida);
      usadosPorSlot.set(slot, index + 1);
    });

  return map;
}

export async function getWinningPredictions(): Promise<WinningPrediction[]> {
  const { data: partidasData, error: partidasError } = await supabase
    .from("partidas" as never)
    .select("id,placar_a,placar_b,status,inicia_em")
    .in("status" as never, ["FT", "AET", "PEN"])
    .order("inicia_em" as never, { ascending: false });

  if (partidasError) {
    console.error("[WinningPredictions] partidas error:", partidasError.message);
    return [];
  }

  const partidas = (partidasData ?? []) as PartidaResult[];

  const resultadosPorJogo = mapearPartidasPorJogoId(partidas);
  const jogosFinalizadosIds = Array.from(resultadosPorJogo.keys());

  if (jogosFinalizadosIds.length === 0) return [];

  const { data: palpitesData, error: palpitesError } = await supabase
    .rpc("get_palpites_by_jogo_ids", { jogo_ids: jogosFinalizadosIds });

  if (palpitesError) {
    console.error("[WinningPredictions] palpites error:", palpitesError.message);
    return [];
  }
  const results = ((palpitesData ?? []) as Array<Record<string, unknown>>)
    .map((row) => {
      const jogo = jogos.find((item) => item.id === String(row.jogo_id));
      const resultado = resultadosPorJogo.get(String(row.jogo_id));
      if (!jogo || !resultado || !isFinishedMatchStatus(resultado.status)) return null;

      const palpite = {
        placarA: Number(row.placar_a ?? 0),
        placarB: Number(row.placar_b ?? 0),
      };

      const isMatch = palpite.placarA === Number(resultado.placar_a) && palpite.placarB === Number(resultado.placar_b);
      if (!isMatch) return null;

      return {
        id: String(row.id),
        usuarioId: String(row.usuario_id),
        usuarioNome: String(row.usuario_nome),
        jogoId: jogo.id,
        grupo: jogo.grupo,
        data: jogo.data,
        hora: jogo.hora,
        selecaoA: jogo.selecaoA,
        selecaoB: jogo.selecaoB,
        palpiteA: palpite.placarA,
        palpiteB: palpite.placarB,
        resultadoA: Number(resultado.placar_a ?? 0),
        resultadoB: Number(resultado.placar_b ?? 0),
        createdAt: String(row.criado_em),
      } satisfies WinningPrediction;
    })
    .filter((item): item is WinningPrediction => Boolean(item));
  return results;
}

export async function getAllPalpitesAdmin(): Promise<AdminPalpite[]> {
  const { data: partidasData, error: partidasError } = await supabase
    .from("partidas" as never)
    .select("id,placar_a,placar_b,status,inicia_em")
    .order("inicia_em" as never, { ascending: false });

  if (partidasError) return [];

  const partidas = (partidasData ?? []) as PartidaResult[];
  const resultadosPorJogo = mapearPartidasPorJogoId(partidas);

  const { data: palpitesData, error: palpitesError } = await supabase
    .rpc("get_all_palpites_familia_admin");

  if (palpitesError) return [];

  return ((palpitesData ?? []) as Array<Record<string, unknown>>)
    .map((row) => {
      const jogo = jogos.find((item) => item.id === String(row.jogo_id));
      if (!jogo) return null;

      const resultado = resultadosPorJogo.get(String(row.jogo_id));
      const finalizado = isFinishedMatchStatus(resultado?.status);
      const palpite = { placarA: Number(row.placar_a ?? 0), placarB: Number(row.placar_b ?? 0) };
      const acertouNaMosca = finalizado &&
        palpite.placarA === Number(resultado?.placar_a ?? -1) &&
        palpite.placarB === Number(resultado?.placar_b ?? -1);

      return {
        id: String(row.id),
        usuarioId: String(row.usuario_id),
        usuarioNome: String(row.usuario_nome),
        jogoId: jogo.id,
        grupo: jogo.grupo,
        data: jogo.data,
        hora: jogo.hora,
        selecaoA: jogo.selecaoA,
        selecaoB: jogo.selecaoB,
        palpiteA: palpite.placarA,
        palpiteB: palpite.placarB,
        resultadoA: finalizado ? (resultado?.placar_a ?? null) : null,
        resultadoB: finalizado ? (resultado?.placar_b ?? null) : null,
        finalizado,
        acertouNaMosca,
        createdAt: String(row.criado_em),
      } satisfies AdminPalpite;
    })
    .filter((item): item is AdminPalpite => Boolean(item));
}
