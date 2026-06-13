import { useState } from "react";
import { Calendar, MapPin, MessageSquare, Clock, ChevronDown, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Jogo } from "@/data/worldcup2026";
import { getSelecao } from "@/data/worldcup2026";
import { flagUrl, flagAlt } from "@/lib/flags";
import { palpiteBloqueadoParaJogo } from "@/lib/matchLock";

export type GameResult = {
  placar_a: number;
  placar_b: number;
  status: string;
  inicia_em?: string | null;
  minuto?: number | null;
  acrescimos?: number | null;
};

interface Props {
  jogo: Jogo;
  qtdPalpites: number;
  resultado?: GameResult;
  onPalpitar: (j: Jogo) => void;
  onComentarios: (j: Jogo) => void;
}

export function GameCard({ jogo, qtdPalpites, resultado, onPalpitar, onComentarios }: Props) {
  const a = getSelecao(jogo.selecaoA);
  const b = getSelecao(jogo.selecaoB);
  const temPalpite = qtdPalpites > 0;
  const isLive = ["LIVE", "HT", "ET", "PEN_LIVE"].includes(resultado?.status ?? "");
  const isFinished = ["FT", "AET", "PEN"].includes(resultado?.status ?? "");
  const palpiteBloqueado = palpiteBloqueadoParaJogo(jogo, resultado);
  const mostrarPlacar = Boolean(resultado && (isLive || isFinished));
  const statusLabel =
    resultado?.status === "HT"
      ? "Intervalo"
      : isLive
        ? "Ao vivo"
        : isFinished
          ? "Finalizado"
          : palpiteBloqueado
            ? "Palpites encerrados"
            : null;
  const [aberto, setAberto] = useState(false);

  return (
    <div
      className={`editorial-game-card overflow-hidden border bg-card shadow-card transition hover:-translate-y-0.5 hover:shadow-brand ${isLive ? "border-red-300 ring-1 ring-red-100" : temPalpite ? "border-brand/40" : "border-black/10"}`}
    >
      <div
        className={`flex items-center justify-between px-4 py-2 text-white ${isLive ? "bg-red-600" : "bg-brand"}`}
      >
        <Badge className="rounded-none bg-white/15 text-[10px] font-black uppercase text-white hover:bg-white/15">
          Grupo {jogo.grupo}
        </Badge>
        <span
          className={`px-2 py-0.5 text-[10px] font-black uppercase ${temPalpite ? "bg-[var(--site-accent)] text-white" : "bg-white/15 text-white"}`}
        >
          {qtdPalpites} palpite{qtdPalpites === 1 ? "" : "s"}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-4">
        <div className="flex flex-col items-center text-center">
          <img
            src={flagUrl(jogo.selecaoA, 160)}
            alt={flagAlt(jogo.selecaoA)}
            loading="lazy"
            className="h-14 w-20 object-cover shadow-sm ring-1 ring-black/10"
          />
          <div className="mt-2 text-xs font-black uppercase text-brand-dark">{a?.nome}</div>
        </div>
        <div className="text-center">
          {mostrarPlacar ? (
            <div
              className={`text-xl font-extrabold tabular-nums ${isLive ? "text-red-500" : "text-brand-dark"}`}
            >
              {resultado?.placar_a} – {resultado?.placar_b}
            </div>
          ) : (
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              vs
            </div>
          )}
          {statusLabel && (
            <div
              className={`mt-1 text-[10px] font-bold uppercase ${isLive ? "text-red-500" : "text-muted-foreground"}`}
            >
              {statusLabel}
            </div>
          )}
        </div>
        <div className="flex flex-col items-center text-center">
          <img
            src={flagUrl(jogo.selecaoB, 160)}
            alt={flagAlt(jogo.selecaoB)}
            loading="lazy"
            className="h-14 w-20 object-cover shadow-sm ring-1 ring-black/10"
          />
          <div className="mt-2 text-xs font-black uppercase text-brand-dark">{b?.nome}</div>
        </div>
      </div>

      <div className="space-y-1 border-t border-black/10 bg-[var(--site-surface)]/70 px-4 py-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-brand" />
          {formatarData(jogo.data)}
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-brand" />
          {jogo.hora} (Brasília)
        </div>
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="mt-1 flex w-full items-center justify-between border border-brand/20 bg-white/50 px-2 py-1 text-[11px] font-semibold text-brand-dark transition hover:bg-white"
          aria-expanded={aberto}
        >
          <span className="flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5" /> Mais informações
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${aberto ? "rotate-180" : ""}`}
          />
        </button>
        {aberto && (
          <div className="mt-2 space-y-1 bg-white/70 p-2">
            <div className="flex items-start gap-1.5">
              <MapPin className="mt-0.5 h-3.5 w-3.5 text-brand" />
              <span>
                <b className="text-brand-dark">{jogo.estadio}</b>
                <br />
                {jogo.cidade}
              </span>
            </div>
            <div className="text-[11px]">
              Rodada {jogo.rodada} · Grupo {jogo.grupo}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-2 p-4 pt-3">
        <Button
          onClick={() => onPalpitar(jogo)}
          disabled={palpiteBloqueado}
          className="w-full rounded-none bg-brand text-xs font-black uppercase text-white hover:opacity-90"
        >
          {palpiteBloqueado ? "Palpites encerrados" : "Dar palpite"}
        </Button>
        <Button
          onClick={() => onComentarios(jogo)}
          variant="outline"
          className="w-full rounded-none text-xs font-black uppercase"
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          Comentários
        </Button>
      </div>
    </div>
  );
}

function formatarData(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
