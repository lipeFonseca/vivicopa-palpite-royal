import type { Jogo } from "@/data/worldcup2026";

const LIVE_STATUSES = new Set(["LIVE", "HT", "ET", "PEN_LIVE", "1H", "2H", "BT", "P"]);
const FINISHED_STATUSES = new Set(["FT", "AET", "PEN"]);

export function getJogoInicio(jogo: Jogo) {
  return new Date(`${jogo.data}T${jogo.hora}:00-03:00`);
}

export function jogoJaComecou(jogo: Jogo, now = new Date(), iniciaEmApi?: string | null) {
  const inicio = iniciaEmApi ? new Date(iniciaEmApi) : getJogoInicio(jogo);
  return Number.isFinite(inicio.getTime()) && inicio.getTime() <= now.getTime();
}

export function statusBloqueiaPalpite(status?: string | null) {
  if (!status) return false;
  return status !== "NS" || LIVE_STATUSES.has(status) || FINISHED_STATUSES.has(status);
}

export function palpiteBloqueadoParaJogo(
  jogo: Jogo,
  resultado?: { status?: string | null; inicia_em?: string | null } | null,
  now = new Date(),
) {
  return jogoJaComecou(jogo, now, resultado?.inicia_em) || statusBloqueiaPalpite(resultado?.status);
}
