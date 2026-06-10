import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { selecoes } from "@/data/worldcup2026";
import { flagUrl } from "@/lib/flags";
import {
  SLOTS,
  FASE_LABEL,
  carregarBracket,
  salvarBracketPalpite,
  limparBracket,
  vencedorPrevisto,
  nomeSelecao,
  type FaseMataMata,
  type PalpiteMataMata,
  type SlotMataMata,
} from "@/lib/bracket";

const FASES_ORDEM: FaseMataMata[] = ["R32", "R16", "QF", "SF", "F"];

export function Chaveamento() {
  const [palpites, setPalpites] = useState<Record<string, PalpiteMataMata>>(() => carregarBracket());

  const slotsPorFase = useMemo(() => {
    const map = new Map<FaseMataMata, SlotMataMata[]>();
    SLOTS.forEach((s) => {
      const lista = map.get(s.fase) ?? [];
      lista.push(s);
      map.set(s.fase, lista);
    });
    return map;
  }, []);

  // Sugestão automática do time vencedor previsto na fase anterior
  const sugestoes = useMemo(() => {
    const out: Record<string, { a?: string; b?: string }> = {};
    SLOTS.forEach((s) => {
      out[s.id] = {
        a: s.fromA ? vencedorPrevisto(palpites[s.fromA]) : undefined,
        b: s.fromB ? vencedorPrevisto(palpites[s.fromB]) : undefined,
      };
    });
    // 3º lugar: perdedores das semis
    const perdedor = (slotId: string) => {
      const p = palpites[slotId];
      const v = vencedorPrevisto(p);
      if (!v || !p) return undefined;
      return v === p.selecaoA ? p.selecaoB : p.selecaoA;
    };
    out["T3-1"] = { a: perdedor("SF-1"), b: perdedor("SF-2") };
    return out;
  }, [palpites]);

  const salvar = (slotId: string, dados: Partial<PalpiteMataMata>) => {
    const atual = palpites[slotId] ?? { slotId, placarA: 0, placarB: 0 };
    const novo: PalpiteMataMata = { ...atual, ...dados, slotId };
    salvarBracketPalpite(novo);
    setPalpites((prev) => ({ ...prev, [slotId]: novo }));
  };

  const total = Object.keys(palpites).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5 shadow-card">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand">
            <Trophy className="h-3.5 w-3.5" /> Chaveamento da Copa 2026
          </div>
          <h2 className="mt-1 text-xl font-extrabold text-brand-dark">Monte sua árvore do mata-mata</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Os slots começam vazios. Conforme você palpita um confronto, o vencedor é sugerido
            automaticamente na fase seguinte.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{total}/31 palpites</Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm("Apagar todos os palpites do chaveamento?")) {
                limparBracket();
                setPalpites({});
                toast.success("Chaveamento limpo.");
              }
            }}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" /> Limpar
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="grid min-w-[1100px] grid-cols-5 gap-4">
          {FASES_ORDEM.map((fase) => {
            const lista = slotsPorFase.get(fase) ?? [];
            return (
              <div key={fase} className="flex flex-col">
                <div className="mb-3 text-center">
                  <div className="text-sm font-bold text-brand-dark">{FASE_LABEL[fase]}</div>
                  <div className="text-xs text-muted-foreground">{lista.length} {lista.length === 1 ? "jogo" : "jogos"}</div>
                </div>
                <div className={`flex flex-1 flex-col justify-around gap-3 ${fase === "F" ? "py-20" : ""}`}>
                  {lista.map((slot) => (
                    <BracketCard
                      key={slot.id}
                      slot={slot}
                      palpite={palpites[slot.id]}
                      sugestao={sugestoes[slot.id]}
                      onSalvar={(dados) => salvar(slot.id, dados)}
                      destaque={fase === "F"}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-brand">Extra</div>
            <h3 className="text-lg font-extrabold text-brand-dark">Disputa do 3º lugar</h3>
          </div>
          <Badge variant="secondary">Perdedores das semifinais</Badge>
        </div>
        <div className="max-w-md">
          <BracketCard
            slot={SLOTS.find((s) => s.id === "T3-1")!}
            palpite={palpites["T3-1"]}
            sugestao={sugestoes["T3-1"]}
            onSalvar={(dados) => salvar("T3-1", dados)}
          />
        </div>
      </div>
    </div>
  );
}

function BracketCard({
  slot,
  palpite,
  sugestao,
  onSalvar,
  destaque,
}: {
  slot: SlotMataMata;
  palpite?: PalpiteMataMata;
  sugestao?: { a?: string; b?: string };
  onSalvar: (dados: Partial<PalpiteMataMata>) => void;
  destaque?: boolean;
}) {
  const selA = palpite?.selecaoA ?? sugestao?.a;
  const selB = palpite?.selecaoB ?? sugestao?.b;
  const placarA = palpite?.placarA ?? 0;
  const placarB = palpite?.placarB ?? 0;

  const labelOuTime = (id: string | undefined, label: string | undefined) => {
    if (id) return nomeSelecao(id, selecoes);
    if (label) return label;
    return "A definir";
  };

  return (
    <div className={`rounded-xl border bg-background p-3 shadow-sm ${destaque ? "ring-2 ring-brand/30" : ""}`}>
      <div className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
        {slot.id}
      </div>
      <SlotLinha
        idAtual={selA}
        placar={placarA}
        label={labelOuTime(selA, slot.labelA)}
        outroId={selB}
        onSelecao={(v) => onSalvar({ selecaoA: v })}
        onPlacar={(v) => onSalvar({ placarA: v })}
      />
      <div className="my-1 text-center text-[10px] font-bold text-muted-foreground">x</div>
      <SlotLinha
        idAtual={selB}
        placar={placarB}
        label={labelOuTime(selB, slot.labelB)}
        outroId={selA}
        onSelecao={(v) => onSalvar({ selecaoB: v })}
        onPlacar={(v) => onSalvar({ placarB: v })}
      />
    </div>
  );
}

function SlotLinha({
  idAtual,
  placar,
  label,
  outroId,
  onSelecao,
  onPlacar,
}: {
  idAtual?: string;
  placar: number;
  label: string;
  outroId?: string;
  onSelecao: (v: string) => void;
  onPlacar: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {idAtual ? (
        <img src={flagUrl(idAtual, 80)} alt="" className="h-4 w-6 rounded-sm object-cover ring-1 ring-border" />
      ) : (
        <div className="h-4 w-6 rounded-sm bg-muted ring-1 ring-border" />
      )}
      <Select value={idAtual ?? ""} onValueChange={onSelecao}>
        <SelectTrigger className="h-8 flex-1 truncate text-xs">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {selecoes
            .filter((s) => s.id !== outroId)
            .map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.bandeiraEmoji} {s.nome}</SelectItem>
            ))}
        </SelectContent>
      </Select>
      <Input
        type="number"
        min={0}
        value={placar}
        onChange={(e) => onPlacar(Number(e.target.value))}
        className="h-8 w-12 px-1 text-center text-sm"
      />
    </div>
  );
}