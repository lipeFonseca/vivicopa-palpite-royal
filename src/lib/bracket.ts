import type { Selecao } from "@/data/worldcup2026";

export type FaseMataMata =
  | "R32"
  | "R16"
  | "QF"
  | "SF"
  | "F"
  | "T3";

export interface SlotMataMata {
  id: string;
  fase: FaseMataMata;
  ordem: number;
  // referências ao slot que alimenta cada lado (vencedor)
  fromA?: string;
  fromB?: string;
  // rótulos quando vêm da fase de grupos
  labelA?: string;
  labelB?: string;
}

export interface PalpiteMataMata {
  slotId: string;
  selecaoA?: string;
  selecaoB?: string;
  placarA: number;
  placarB: number;
}

const KEY = "vivicopa:mata-mata";

export const FASE_LABEL: Record<FaseMataMata, string> = {
  R32: "16-avos de final",
  R16: "Oitavas de final",
  QF: "Quartas de final",
  SF: "Semifinais",
  F: "Final",
  T3: "Disputa do 3º lugar",
};

// Pareamentos genéricos do formato de 32 times da Copa 2026.
// Os rótulos (1A, 2B, 3C/E/F, etc.) servem só como dica visual — o usuário
// escolhe livremente quem vai para cada slot.
const R32_LABELS: Array<[string, string]> = [
  ["1A", "2B"], ["1C", "3D/E/F"], ["1E", "2F"], ["1G", "3A/B/C/D"],
  ["1I", "2J"], ["1K", "3E/F/G/H"], ["2C", "2E"], ["1B", "3G/H/I/J"],
  ["1D", "2D"], ["1F", "2H"], ["1H", "3F/I/J/K"], ["2A", "2I"],
  ["1J", "2K"], ["1L", "3D/H/I/L"], ["2G", "2L"], ["3A/B/C/D/F", "3B/E/F/I"],
];

function mk(id: string, fase: FaseMataMata, ordem: number, extra: Partial<SlotMataMata> = {}): SlotMataMata {
  return { id, fase, ordem, ...extra };
}

export const SLOTS: SlotMataMata[] = (() => {
  const out: SlotMataMata[] = [];
  // R32: 16 jogos
  R32_LABELS.forEach(([a, b], i) => {
    out.push(mk(`R32-${i + 1}`, "R32", i + 1, { labelA: a, labelB: b }));
  });
  // R16: 8 jogos, cada um alimentado por 2 jogos do R32
  for (let i = 0; i < 8; i++) {
    out.push(mk(`R16-${i + 1}`, "R16", i + 1, {
      fromA: `R32-${i * 2 + 1}`,
      fromB: `R32-${i * 2 + 2}`,
    }));
  }
  // QF: 4 jogos
  for (let i = 0; i < 4; i++) {
    out.push(mk(`QF-${i + 1}`, "QF", i + 1, {
      fromA: `R16-${i * 2 + 1}`,
      fromB: `R16-${i * 2 + 2}`,
    }));
  }
  // SF: 2 jogos
  for (let i = 0; i < 2; i++) {
    out.push(mk(`SF-${i + 1}`, "SF", i + 1, {
      fromA: `QF-${i * 2 + 1}`,
      fromB: `QF-${i * 2 + 2}`,
    }));
  }
  // Final
  out.push(mk("F-1", "F", 1, { fromA: "SF-1", fromB: "SF-2" }));
  // 3º lugar
  out.push(mk("T3-1", "T3", 1, { fromA: "SF-1", fromB: "SF-2" }));
  return out;
})();

export function carregarBracket(): Record<string, PalpiteMataMata> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, PalpiteMataMata>) : {};
  } catch {
    return {};
  }
}

export function salvarBracketPalpite(p: PalpiteMataMata) {
  const atual = carregarBracket();
  atual[p.slotId] = p;
  localStorage.setItem(KEY, JSON.stringify(atual));
}

export function limparBracket() {
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
}

// Determina vencedor previsto (com base no palpite) para propagar nomes
// para a próxima fase. Empate => prioriza lado A (apenas dica visual).
export function vencedorPrevisto(p?: PalpiteMataMata): string | undefined {
  if (!p?.selecaoA && !p?.selecaoB) return undefined;
  if (!p?.selecaoA) return p?.selecaoB;
  if (!p?.selecaoB) return p?.selecaoA;
  if ((p.placarA ?? 0) >= (p.placarB ?? 0)) return p.selecaoA;
  return p.selecaoB;
}

export function nomeSelecao(id: string | undefined, selecoes: Selecao[]): string {
  if (!id) return "";
  return selecoes.find((s) => s.id === id)?.nome ?? "";
}