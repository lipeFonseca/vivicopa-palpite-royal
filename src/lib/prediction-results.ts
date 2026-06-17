import type { Palpite } from "@/lib/storage";

export type MatchLikeResult = {
  placar_a?: number | null;
  placar_b?: number | null;
  status?: string | null;
};

const FINISHED_STATUSES = new Set(["FT", "AET", "PEN"]);

export function isFinishedMatchStatus(status?: string | null) {
  return FINISHED_STATUSES.has(status ?? "");
}

export function isExactPrediction(
  palpite: Pick<Palpite, "placarA" | "placarB">,
  resultado?: MatchLikeResult | null,
) {
  if (!resultado || !isFinishedMatchStatus(resultado.status)) return false;
  return palpite.placarA === (resultado.placar_a ?? null) && palpite.placarB === (resultado.placar_b ?? null);
}
