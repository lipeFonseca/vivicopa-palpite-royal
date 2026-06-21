import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSelecao, jogos } from "@/data/worldcup2026";
import { type ComentarioJogo } from "@/lib/comments";

export function AdminCommentsTab({ comentarios }: { comentarios: ComentarioJogo[] }) {
  const [fJogo, setFJogo] = useState("todos");
  const [fUsuario, setFUsuario] = useState("");

  const lista = comentarios.filter((comentario) => {
    if (fJogo !== "todos" && comentario.jogoId !== fJogo) return false;
    if (fUsuario && !comentario.usuario.toLowerCase().includes(fUsuario.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 rounded-2xl border border-border bg-card p-3 shadow-card md:grid-cols-2">
        <div>
          <Label className="text-xs">Usuario</Label>
          <Input
            value={fUsuario}
            onChange={(e) => setFUsuario(e.target.value)}
            placeholder="Buscar nome..."
          />
        </div>
        <div>
          <Label className="text-xs">Jogo</Label>
          <Select value={fJogo} onValueChange={setFJogo}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="todos">Todos</SelectItem>
              {jogos.map((jogo) => {
                const a = getSelecao(jogo.selecaoA);
                const b = getSelecao(jogo.selecaoB);
                return (
                  <SelectItem key={jogo.id} value={jogo.id}>
                    {a?.nome} VS {b?.nome}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        {lista.map((comentario) => {
          const jogo = jogos.find((item) => item.id === comentario.jogoId);
          const a = jogo ? getSelecao(jogo.selecaoA) : null;
          const b = jogo ? getSelecao(jogo.selecaoB) : null;

          return (
            <div
              key={comentario.id}
              className="rounded-2xl border border-border bg-card p-4 shadow-card"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="font-semibold text-brand-dark">{comentario.usuario}</div>
                <div className="text-muted-foreground">
                  {new Date(comentario.dataCriacao).toLocaleDateString("pt-BR")}
                </div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Grupo {jogo?.grupo} · {a?.bandeiraEmoji} {a?.nome} VS {b?.nome} {b?.bandeiraEmoji}
              </div>
              <div className="mt-2 rounded-lg bg-brand-soft p-3 text-sm italic">
                "{comentario.mensagem}"
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-muted-foreground">
                <span>
                  {comentario.curtidasCount} curtida{comentario.curtidasCount === 1 ? "" : "s"}
                </span>
                <span>
                  {comentario.respostasCount} resposta{comentario.respostasCount === 1 ? "" : "s"}
                </span>
                {comentario.parentId && <span>Resposta</span>}
              </div>
            </div>
          );
        })}
        {lista.length === 0 && (
          <div className="py-10 text-center text-muted-foreground">Nenhum comentario ainda.</div>
        )}
      </div>
    </div>
  );
}
