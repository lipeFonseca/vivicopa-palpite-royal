import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Jogo } from "@/data/worldcup2026";
import { getSelecao } from "@/data/worldcup2026";
import { StylizedVersus } from "@/components/vivicopa/StylizedVersus";
import { flagAlt, flagUrl } from "@/lib/flags";
import { atualizarPalpite, salvarPalpite, type Palpite } from "@/lib/storage";
import { palpiteBloqueadoParaJogo } from "@/lib/matchLock";

interface Props {
  jogo: Jogo | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editar?: Palpite | null;
  userId: string;
  username: string;
}

export function PredictionModal({ jogo, open, onClose, onSaved, editar, userId, username }: Props) {
  const [placarA, setPlacarA] = useState(0);
  const [placarB, setPlacarB] = useState(0);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (editar) {
      setPlacarA(editar.placarA);
      setPlacarB(editar.placarB);
    } else {
      setPlacarA(0);
      setPlacarB(0);
    }
  }, [editar, open]);

  if (!jogo) return null;
  const a = getSelecao(jogo.selecaoA);
  const b = getSelecao(jogo.selecaoB);
  const bloqueado = palpiteBloqueadoParaJogo(jogo);
  const contextoPartida = jogo.grupo === "MATA_MATA" ? "Mata-mata" : `Grupo ${jogo.grupo}`;

  const getSaveErrorMessage = (error: unknown) => {
    if (typeof error === "object" && error != null) {
      const code = "code" in error ? String(error.code ?? "") : "";
      const message = "message" in error ? String(error.message ?? "") : "";
      if (code === "23505" || /duplicate|duplic/i.test(message)) {
        return "Voce ja tem um palpite para esse confronto. Reabra para editar.";
      }
      if (message) return message;
    }
    return "Erro ao salvar palpite. Tente novamente.";
  };

  const handleSave = async () => {
    if (bloqueado) {
      toast.error("Palpites encerrados para este jogo.");
      return;
    }

    setSalvando(true);
    const palpite: Palpite = {
      id: editar?.id ?? crypto.randomUUID(),
      usuarioId: userId,
      usuario: username,
      jogoId: jogo.id,
      selecaoA: jogo.selecaoA,
      selecaoB: jogo.selecaoB,
      placarA: Number(placarA) || 0,
      placarB: Number(placarB) || 0,
      dataCriacao: editar?.dataCriacao ?? new Date().toISOString(),
    };

    try {
      if (editar) await atualizarPalpite(palpite, userId);
      else await salvarPalpite(palpite, userId);
      toast.success("Palpite registrado! Agora é torcer!");
      onSaved();
      onClose();
    } catch (error) {
      toast.error(getSaveErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-brand-dark">
            {editar ? "Editar palpite" : "Dar palpite"} — {contextoPartida}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-brand-soft px-3 py-2 text-sm font-semibold text-brand-dark">
            Palpitando como: {username}
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
            <div>
              <Label className="flex items-center gap-2">
                {a && (
                  <img
                    src={flagUrl(a.id, 80)}
                    alt={flagAlt(a.id)}
                    className="h-4 w-6 rounded-[2px] border border-border object-cover shadow-sm"
                  />
                )}
                <span>{a?.nome ?? jogo.selecaoA}</span>
              </Label>
              <Input type="number" min={0} value={placarA} disabled={bloqueado} onChange={(e) => setPlacarA(Number(e.target.value))} />
            </div>
            <div className="flex items-center justify-center pb-2">
              <StylizedVersus compact />
            </div>
            <div>
              <Label className="flex items-center gap-2">
                {b && (
                  <img
                    src={flagUrl(b.id, 80)}
                    alt={flagAlt(b.id)}
                    className="h-4 w-6 rounded-[2px] border border-border object-cover shadow-sm"
                  />
                )}
                <span>{b?.nome ?? jogo.selecaoB}</span>
              </Label>
              <Input type="number" min={0} value={placarB} disabled={bloqueado} onChange={(e) => setPlacarB(Number(e.target.value))} />
            </div>
          </div>
          {bloqueado && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Palpites encerrados para este jogo.
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={salvando}>Cancelar</Button>
          <Button onClick={handleSave} disabled={salvando || bloqueado} className="bg-gradient-brand text-white hover:opacity-90">
            {salvando ? "Salvando..." : "Salvar palpite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
