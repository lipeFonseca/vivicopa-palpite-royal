import { useState } from "react";
import { BarChart3, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";

export type MatchStats = {
  posse: number | null;
  chutes: number | null;
  chutes_no_gol: number | null;
  escanteios: number | null;
  faltas: number | null;
  amarelos: number | null;
  vermelhos: number | null;
  impedimentos: number | null;
  defesas: number | null;
};

type Props = {
  teamA: string;
  teamB: string;
  statsA?: MatchStats | null;
  statsB?: MatchStats | null;
  live?: boolean;
  compact?: boolean;
};

const STAT_ROWS: Array<{ key: keyof MatchStats; label: string; percent?: boolean; lowerIsBetter?: boolean }> = [
  { key: "posse", label: "Posse", percent: true },
  { key: "chutes", label: "Finalizacoes" },
  { key: "chutes_no_gol", label: "No gol" },
  { key: "escanteios", label: "Escanteios" },
  { key: "defesas", label: "Defesas" },
  { key: "impedimentos", label: "Impedimentos", lowerIsBetter: true },
  { key: "faltas", label: "Faltas", lowerIsBetter: true },
  { key: "amarelos", label: "Amarelos", lowerIsBetter: true },
  { key: "vermelhos", label: "Vermelhos", lowerIsBetter: true },
];

export function MatchStatsDropdown({ teamA, teamB, statsA, statsB, live = false, compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const hasStats = Boolean(statsA || statsB);

  return (
    <div className="w-full">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={`w-full rounded-none border-brand/25 bg-white/65 font-black uppercase text-brand-dark hover:bg-white ${compact ? "h-7 text-[9px]" : "h-8 text-[10px]"}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
        Estatisticas
        {live && <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />}
        <ChevronDown className={`ml-auto h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>
      {open && (
        <div className="mt-2 rounded-lg border border-brand/15 bg-white/85 p-2 shadow-sm">
          {hasStats ? (
            <>
              <div className="mb-2 grid grid-cols-[3rem_1fr_3rem] gap-2 text-[9px] font-black uppercase text-muted-foreground">
                <span className="truncate text-left">{teamA}</span>
                <span className="text-center">{live ? "Ao vivo" : "Jogo"}</span>
                <span className="truncate text-right">{teamB}</span>
              </div>
              <div className="space-y-1.5">
                {STAT_ROWS.map((row) => (
                  <StatRow
                    key={row.key}
                    label={row.label}
                    a={statsA?.[row.key] ?? null}
                    b={statsB?.[row.key] ?? null}
                    percent={row.percent}
                    lowerIsBetter={row.lowerIsBetter}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="px-2 py-3 text-center text-[10px] font-semibold text-muted-foreground">
              Estatisticas ainda indisponiveis.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatRow({
  label,
  a,
  b,
  percent = false,
  lowerIsBetter = false,
}: {
  label: string;
  a: number | null;
  b: number | null;
  percent?: boolean;
  lowerIsBetter?: boolean;
}) {
  const aValue = typeof a === "number" ? a : 0;
  const bValue = typeof b === "number" ? b : 0;
  const total = aValue + bValue;
  const aWidth = total > 0 ? Math.max(8, (aValue / total) * 100) : 50;
  const aBetter = a != null && b != null && (lowerIsBetter ? aValue < bValue : aValue > bValue);
  const bBetter = a != null && b != null && (lowerIsBetter ? bValue < aValue : bValue > aValue);

  return (
    <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center gap-2 text-[10px]">
      <span className={`text-left font-black tabular-nums ${aBetter ? "text-emerald-700" : "text-foreground"}`}>
        {formatValue(a, percent)}
      </span>
      <div>
        <div className="mb-0.5 text-center font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="flex h-1.5 overflow-hidden rounded-full bg-brand/10">
          <div className="bg-brand" style={{ width: `${aWidth}%` }} />
          <div className="bg-emerald-500" style={{ width: `${100 - aWidth}%` }} />
        </div>
      </div>
      <span className={`text-right font-black tabular-nums ${bBetter ? "text-emerald-700" : "text-foreground"}`}>
        {formatValue(b, percent)}
      </span>
    </div>
  );
}

function formatValue(value: number | null, percent: boolean) {
  if (value == null) return "-";
  if (!percent) return String(value);
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}
