import { jogos, type Jogo } from "@/data/worldcup2026";
import { resolveTeamIdByName } from "@/lib/teamNames";

type PartidaCatalogoLike = {
  id: string;
  time_a?: string | null;
  time_b?: string | null;
  inicia_em?: string | null;
  fase?: string | null;
};

const FASES_MATA_MATA = new Set([
  "LAST_32",
  "LAST_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "THIRD_PLACE",
  "FINAL",
]);

export function isFaseMataMata(fase?: string | null) {
  return Boolean(fase && FASES_MATA_MATA.has(fase));
}

export function partidaParaJogoDinamico(partida: PartidaCatalogoLike): Jogo | null {
  const selecaoA = resolveTeamIdByName(partida.time_a);
  const selecaoB = resolveTeamIdByName(partida.time_b);
  if (!selecaoA || !selecaoB || !partida.inicia_em) return null;

  const inicio = new Date(partida.inicia_em);
  if (!Number.isFinite(inicio.getTime())) return null;

  const brasilia = new Date(inicio.getTime() - 3 * 60 * 60 * 1000);
  const iso = brasilia.toISOString();

  return {
    id: partida.id,
    rodada: 1,
    grupo: "MATA_MATA",
    data: iso.slice(0, 10),
    hora: iso.slice(11, 16),
    estadio: "Mata-mata da Copa 2026",
    cidade: "A definir",
    selecaoA,
    selecaoB,
  };
}

export function construirCatalogoJogos(partidas: PartidaCatalogoLike[] = []) {
  const catalogo = new Map<string, Jogo>(jogos.map((jogo) => [jogo.id, jogo]));

  partidas.forEach((partida) => {
    if (catalogo.has(partida.id) || !isFaseMataMata(partida.fase)) return;
    const jogo = partidaParaJogoDinamico(partida);
    if (jogo) catalogo.set(jogo.id, jogo);
  });

  return catalogo;
}

export function resolverJogoPorId(jogoId: string, partidas: PartidaCatalogoLike[] = []) {
  return construirCatalogoJogos(partidas).get(jogoId) ?? null;
}
