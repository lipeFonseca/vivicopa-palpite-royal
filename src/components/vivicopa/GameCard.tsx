import { useState } from "react";
import { Calendar, MapPin, MessageSquare, Clock, ChevronDown, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Jogo } from "@/data/worldcup2026";
import { getSelecao } from "@/data/worldcup2026";
import { flagUrl, flagAlt } from "@/lib/flags";

interface Props {
  jogo: Jogo;
  qtdPalpites: number;
  onPalpitar: (j: Jogo) => void;
  onComentarios: (j: Jogo) => void;
}

export function GameCard({ jogo, qtdPalpites, onPalpitar, onComentarios }: Props) {
  const a = getSelecao(jogo.selecaoA);
  const b = getSelecao(jogo.selecaoB);
  const temPalpite = qtdPalpites > 0;
  const [aberto, setAberto] = useState(false);

  return (
    <div className={`overflow-hidden rounded-2xl border bg-card shadow-card transition hover:shadow-brand ${temPalpite ? "border-brand/40" : "border-border"}`}>
      <div className="flex items-center justify-between bg-gradient-brand px-4 py-2 text-white">
        <Badge className="bg-white/20 text-white hover:bg-white/20">Grupo {jogo.grupo}</Badge>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${temPalpite ? "bg-white text-brand-dark" : "bg-white/20 text-white"}`}>
          {qtdPalpites} palpite{qtdPalpites === 1 ? "" : "s"}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-4">
        <div className="flex flex-col items-center text-center">
          <img
            src={flagUrl(jogo.selecaoA, 160)}
            alt={flagAlt(jogo.selecaoA)}
            loading="lazy"
            className="h-16 w-24 rounded-md object-cover shadow-md ring-1 ring-border"
          />
          <div className="mt-2 text-sm font-bold text-brand-dark">{a?.nome}</div>
        </div>
        <div className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          vs
        </div>
        <div className="flex flex-col items-center text-center">
          <img
            src={flagUrl(jogo.selecaoB, 160)}
            alt={flagAlt(jogo.selecaoB)}
            loading="lazy"
            className="h-16 w-24 rounded-md object-cover shadow-md ring-1 ring-border"
          />
          <div className="mt-2 text-sm font-bold text-brand-dark">{b?.nome}</div>
        </div>
      </div>

      <div className="space-y-1 border-t border-border bg-brand-soft/60 px-4 py-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-brand" />{formatarData(jogo.data)}</div>
        <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-brand" />{jogo.hora} (Brasília)</div>
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="mt-1 flex w-full items-center justify-between rounded-md border border-brand/20 bg-white/60 px-2 py-1 text-[11px] font-semibold text-brand-dark transition hover:bg-white"
          aria-expanded={aberto}
        >
          <span className="flex items-center gap-1.5"><Info className="h-3.5 w-3.5" /> Mais informações</span>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${aberto ? "rotate-180" : ""}`} />
        </button>
        {aberto && (
          <div className="mt-2 space-y-1 rounded-md bg-white/70 p-2">
            <div className="flex items-start gap-1.5"><MapPin className="mt-0.5 h-3.5 w-3.5 text-brand" /><span><b className="text-brand-dark">{jogo.estadio}</b><br />{jogo.cidade}</span></div>
            <div className="text-[11px]">Rodada {jogo.rodada} · Grupo {jogo.grupo}</div>
          </div>
        )}
      </div>

      <div className="flex gap-2 p-4 pt-3">
        <Button onClick={() => onPalpitar(jogo)} className="flex-1 bg-gradient-brand text-white hover:opacity-90">
          Dar palpite
        </Button>
        <Button onClick={() => onComentarios(jogo)} variant="outline" size="icon" aria-label="Ver comentários">
          <MessageSquare className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function formatarData(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
