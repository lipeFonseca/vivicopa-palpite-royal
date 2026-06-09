import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { Jogo } from "@/data/worldcup2026";
import { getSelecao } from "@/data/worldcup2026";
import { salvarPalpite, atualizarPalpite, type Palpite } from "@/lib/storage";

interface Props {
  jogo: Jogo | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editar?: Palpite | null;
}

export function PredictionModal({ jogo, open, onClose, onSaved, editar }: Props) {
  const [usuario, setUsuario] = useState("");
  const [placarA, setPlacarA] = useState(0);
  const [placarB, setPlacarB] = useState(0);
  const [comentario, setComentario] = useState("");

  useEffect(() => {
    if (editar) {
      setUsuario(editar.usuario);
      setPlacarA(editar.placarA);
      setPlacarB(editar.placarB);
      setComentario(editar.comentario ?? "");
    } else {
      setUsuario(localStorage.getItem("vivicopa:usuario") ?? "");
      setPlacarA(0);
      setPlacarB(0);
      setComentario("");
    }
  }, [editar, open]);

  if (!jogo) return null;
  const a = getSelecao(jogo.selecaoA);
  const b = getSelecao(jogo.selecaoB);

  const handleSave = () => {
    if (!usuario.trim()) {
      toast.error("Informe seu nome");
      return;
    }
    localStorage.setItem("vivicopa:usuario", usuario.trim());
    const palpite: Palpite = {
      id: editar?.id ?? crypto.randomUUID(),
      usuario: usuario.trim(),
      jogoId: jogo.id,
      selecaoA: jogo.selecaoA,
      selecaoB: jogo.selecaoB,
      placarA: Number(placarA) || 0,
      placarB: Number(placarB) || 0,
      comentario: comentario.trim() || undefined,
      dataCriacao: editar?.dataCriacao ?? new Date().toISOString(),
    };
    if (editar) atualizarPalpite(palpite);
    else salvarPalpite(palpite);
    toast.success("Palpite registrado! Agora é torcer!");
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-brand-dark">
            {editar ? "Editar palpite" : "Dar palpite"} — Grupo {jogo.grupo}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="usuario">Seu nome</Label>
            <Input id="usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="Ex: João" />
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
            <div>
              <Label className="flex items-center gap-1">
                <span>{a?.bandeiraEmoji}</span> {a?.nome}
              </Label>
              <Input type="number" min={0} value={placarA} onChange={(e) => setPlacarA(Number(e.target.value))} />
            </div>
            <div className="pb-2 text-lg font-bold text-brand">x</div>
            <div>
              <Label className="flex items-center gap-1">
                <span>{b?.bandeiraEmoji}</span> {b?.nome}
              </Label>
              <Input type="number" min={0} value={placarB} onChange={(e) => setPlacarB(Number(e.target.value))} />
            </div>
          </div>
          <div>
            <Label htmlFor="coment">Comentário (opcional)</Label>
            <Textarea id="coment" value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Mande sua resenha..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} className="bg-gradient-brand text-white hover:opacity-90">Salvar palpite</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
