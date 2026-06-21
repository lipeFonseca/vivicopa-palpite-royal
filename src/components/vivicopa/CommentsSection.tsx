import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, CheckCheck, Heart, Pencil, Reply, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { type Jogo } from "@/data/worldcup2026";
import {
  alternarCurtidaComentario,
  editarComentario,
  excluirComentario,
  marcarNotificacoesRespostaComoLidas,
  salvarComentario,
  type ComentarioJogo,
  type NotificacaoRespostaComentario,
} from "@/lib/comments";
import { vivicopaQueryKeys } from "@/hooks/useVivicopaQueries";

function inserirComentarioNoCache(
  comentarios: ComentarioJogo[] | undefined,
  novoComentario: ComentarioJogo,
): ComentarioJogo[] {
  const lista = comentarios ?? [];
  const atualizada = [novoComentario, ...lista];

  if (novoComentario.parentId == null) {
    return atualizada;
  }

  return atualizada.map((comentario) =>
    comentario.id === novoComentario.parentId
      ? { ...comentario, respostasCount: comentario.respostasCount + 1 }
      : comentario,
  );
}

function atualizarComentarioNoCache(
  comentarios: ComentarioJogo[] | undefined,
  comentarioAtualizado: ComentarioJogo,
): ComentarioJogo[] {
  return (comentarios ?? []).map((comentario) =>
    comentario.id === comentarioAtualizado.id
      ? {
          ...comentario,
          mensagem: comentarioAtualizado.mensagem,
          dataEdicao: comentarioAtualizado.dataEdicao,
        }
      : comentario,
  );
}

function removerComentarioDoCache(
  comentarios: ComentarioJogo[] | undefined,
  comentarioRemovido: ComentarioJogo,
): ComentarioJogo[] {
  const lista = (comentarios ?? []).filter((comentario) => comentario.id !== comentarioRemovido.id);

  if (comentarioRemovido.parentId == null) {
    return lista;
  }

  return lista.map((comentario) =>
    comentario.id === comentarioRemovido.parentId
      ? { ...comentario, respostasCount: Math.max(0, comentario.respostasCount - 1) }
      : comentario,
  );
}

function alternarCurtidaNoCache(
  comentarios: ComentarioJogo[] | undefined,
  comentarioAlvo: ComentarioJogo,
): ComentarioJogo[] {
  return (comentarios ?? []).map((comentario) => {
    if (comentario.id !== comentarioAlvo.id) return comentario;

    const curtidoPorMim = !comentario.curtidoPorMim;
    return {
      ...comentario,
      curtidoPorMim,
      curtidasCount: Math.max(0, comentario.curtidasCount + (curtidoPorMim ? 1 : -1)),
    };
  });
}

export function CommentReplyNotificationsMenu({
  notifications,
  unreadCount,
  onOpenGame,
  onChanged,
}: {
  notifications: NotificacaoRespostaComentario[];
  unreadCount: number;
  onOpenGame: (jogoId: string) => void;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  const marcarComoLida = async (ids?: string[]) => {
    setBusy(true);
    try {
      await marcarNotificacoesRespostaComoLidas(ids);
      await onChanged();
    } catch {
      toast.error("Nao foi possivel atualizar as notificacoes.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-brand/30 bg-white/80 text-brand transition hover:bg-brand-soft"
          aria-label="Abrir notificacoes de respostas"
          title="Notificacoes de respostas"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-black text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 max-w-[calc(100vw-2rem)] p-0">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black uppercase text-brand">Respostas</div>
              <div className="text-xs text-muted-foreground">
                {unreadCount > 0
                  ? `${unreadCount} nova${unreadCount === 1 ? "" : "s"}`
                  : "Tudo em dia"}
              </div>
            </div>
            {notifications.length > 0 && unreadCount > 0 && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs"
                disabled={busy}
                onClick={() => void marcarComoLida()}
              >
                <CheckCheck className="mr-1 h-3.5 w-3.5" />
                Marcar todas
              </Button>
            )}
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {notifications.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              Ninguem respondeu seus comentarios ainda.
            </div>
          )}
          {notifications.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`w-full rounded-xl border px-3 py-3 text-left transition hover:border-brand hover:bg-brand-soft/40 ${
                item.lidaEm == null
                  ? "border-brand/30 bg-brand-soft/20"
                  : "border-transparent bg-transparent"
              }`}
              onClick={async () => {
                if (item.lidaEm == null) {
                  await marcarComoLida([item.id]);
                }
                onOpenGame(item.jogoId);
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-brand-dark">
                    {item.usuarioOrigemNome} respondeu seu comentario
                  </div>
                  <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    Seu comentario: "{item.comentarioPaiMensagem}"
                  </div>
                  <div className="mt-1 line-clamp-2 text-sm text-foreground">
                    "{item.comentarioMensagem}"
                  </div>
                </div>
                <div className="shrink-0 text-[11px] text-muted-foreground">
                  {new Date(item.dataCriacao).toLocaleString("pt-BR")}
                </div>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CommentThreadItem({
  comentario,
  childrenMap,
  userId,
  userRole,
  onReply,
  onToggleLike,
  onDelete,
  onEdit,
  loadingCommentId,
}: {
  comentario: ComentarioJogo;
  childrenMap: Map<string, ComentarioJogo[]>;
  userId: string;
  userRole: "admin" | "user";
  onReply: (comentario: ComentarioJogo) => void;
  onToggleLike: (comentario: ComentarioJogo) => Promise<void>;
  onDelete: (comentario: ComentarioJogo) => Promise<void>;
  onEdit: (comentario: ComentarioJogo, mensagem: string) => Promise<void>;
  loadingCommentId: string | null;
}) {
  const [editando, setEditando] = useState(false);
  const [mensagemEdicao, setMensagemEdicao] = useState(comentario.mensagem);
  const respostas = childrenMap.get(comentario.id) ?? [];
  const podeGerenciar = comentario.usuarioId === userId || userRole === "admin";
  const podeExcluir = podeGerenciar && comentario.respostasCount === 0;

  useEffect(() => {
    setMensagemEdicao(comentario.mensagem);
  }, [comentario.mensagem]);

  const salvarEdicao = async () => {
    const conteudo = mensagemEdicao.trim();
    if (!conteudo || conteudo === comentario.mensagem) {
      setEditando(false);
      setMensagemEdicao(comentario.mensagem);
      return;
    }

    try {
      await onEdit(comentario, conteudo);
      setEditando(false);
    } catch {
      // O toast ja e exibido pelo manipulador pai.
    }
  };

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex justify-between gap-3 text-xs">
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-semibold text-brand-dark">{comentario.usuario}</span>
          {comentario.dataEdicao && (
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand">
              editado
            </span>
          )}
        </div>
        <span className="text-right text-muted-foreground">
          {new Date(comentario.dataCriacao).toLocaleString("pt-BR")}
        </span>
      </div>

      {editando ? (
        <div className="mt-2 space-y-2">
          <Textarea
            value={mensagemEdicao}
            onChange={(e) => setMensagemEdicao(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs"
              onClick={() => {
                setEditando(false);
                setMensagemEdicao(comentario.mensagem);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1 bg-gradient-brand px-2 text-xs text-white hover:opacity-90"
              disabled={loadingCommentId === comentario.id || !mensagemEdicao.trim()}
              onClick={() => void salvarEdicao()}
            >
              <Save className="h-3.5 w-3.5" />
              Salvar
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-1 text-sm italic">"{comentario.mensagem}"</div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={comentario.curtidoPorMim ? "secondary" : "ghost"}
          className="h-8 gap-1 px-2 text-xs"
          disabled={loadingCommentId === comentario.id}
          onClick={() => void onToggleLike(comentario)}
        >
          <Heart className={`h-3.5 w-3.5 ${comentario.curtidoPorMim ? "fill-current" : ""}`} />
          {comentario.curtidasCount}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 gap-1 px-2 text-xs"
          onClick={() => onReply(comentario)}
        >
          <Reply className="h-3.5 w-3.5" />
          Responder
        </Button>
        {podeGerenciar && !editando && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 gap-1 px-2 text-xs"
            onClick={() => setEditando(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Button>
        )}
        <span className="text-xs text-muted-foreground">
          {comentario.respostasCount} resposta{comentario.respostasCount === 1 ? "" : "s"}
        </span>
        {podeExcluir && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="ml-auto h-7 px-2 text-xs text-muted-foreground"
            disabled={loadingCommentId === comentario.id}
            onClick={() => void onDelete(comentario)}
          >
            Excluir
          </Button>
        )}
      </div>

      {respostas.length > 0 && (
        <div className="mt-3 space-y-2 border-l-2 border-brand/20 pl-3">
          {respostas.map((resposta) => (
            <CommentThreadItem
              key={resposta.id}
              comentario={resposta}
              childrenMap={childrenMap}
              userId={userId}
              userRole={userRole}
              onReply={onReply}
              onToggleLike={onToggleLike}
              onDelete={onDelete}
              onEdit={onEdit}
              loadingCommentId={loadingCommentId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ComentariosJogo({
  jogo,
  comentarios,
  userId,
  userRole,
  username,
  onSaved,
}: {
  jogo: Jogo;
  comentarios: ComentarioJogo[];
  userId: string;
  userRole: "admin" | "user";
  username: string;
  onSaved: () => void | Promise<void>;
}) {
  const queryClient = useQueryClient();
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [respondendoA, setRespondendoA] = useState<ComentarioJogo | null>(null);
  const [comentarioCarregandoId, setComentarioCarregandoId] = useState<string | null>(null);
  const lista = useMemo(
    () => comentarios.filter((comentario) => comentario.jogoId === jogo.id),
    [comentarios, jogo.id],
  );
  const childrenMap = useMemo(() => {
    const mapa = new Map<string, ComentarioJogo[]>();
    lista
      .filter((comentario) => comentario.parentId != null)
      .sort((a, b) => new Date(a.dataCriacao).getTime() - new Date(b.dataCriacao).getTime())
      .forEach((comentario) => {
        const parentId = comentario.parentId as string;
        mapa.set(parentId, [...(mapa.get(parentId) ?? []), comentario]);
      });
    return mapa;
  }, [lista]);
  const comentariosPrincipais = useMemo(
    () =>
      lista
        .filter((comentario) => comentario.parentId == null)
        .sort((a, b) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime()),
    [lista],
  );
  const emojisRapidos = [
    "🔥",
    "⚽",
    "😍",
    "😂",
    "🤣",
    "👏",
    "🙌",
    "😱",
    "😡",
    "😭",
    "🥶",
    "🤡",
    "🤯",
    "🏆",
    "🇧🇷",
    "💚",
    "💛",
    "💬",
  ];

  const inserirEmoji = (emoji: string) => {
    setMensagem((atual) => {
      const base = atual.trimEnd();
      return base ? `${base} ${emoji}` : emoji;
    });
  };

  const enviarComentario = async () => {
    const conteudo = mensagem.trim();
    if (!conteudo) return;
    setEnviando(true);
    try {
      const comentarioSalvo = await salvarComentario(
        {
          id: crypto.randomUUID(),
          usuario: username,
          jogoId: jogo.id,
          mensagem: conteudo,
          parentId: respondendoA?.id ?? null,
        },
        userId,
      );
      queryClient.setQueryData<ComentarioJogo[]>(vivicopaQueryKeys.comentarios, (atual) =>
        inserirComentarioNoCache(atual, comentarioSalvo),
      );
      setMensagem("");
      setRespondendoA(null);
      void onSaved();
    } catch {
      toast.error("Erro ao enviar comentario. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  const excluirComentarioSeguro = async (comentario: ComentarioJogo) => {
    setComentarioCarregandoId(comentario.id);
    try {
      await excluirComentario(comentario.id);
      queryClient.setQueryData<ComentarioJogo[]>(vivicopaQueryKeys.comentarios, (atual) =>
        removerComentarioDoCache(atual, comentario),
      );
      void onSaved();
    } catch {
      toast.error("Nao foi possivel excluir o comentario.");
    } finally {
      setComentarioCarregandoId(null);
    }
  };

  const curtirComentario = async (comentario: ComentarioJogo) => {
    setComentarioCarregandoId(comentario.id);
    try {
      await alternarCurtidaComentario(comentario.id, userId, comentario.curtidoPorMim);
      queryClient.setQueryData<ComentarioJogo[]>(vivicopaQueryKeys.comentarios, (atual) =>
        alternarCurtidaNoCache(atual, comentario),
      );
      void onSaved();
    } catch {
      toast.error("Nao foi possivel atualizar a curtida.");
    } finally {
      setComentarioCarregandoId(null);
    }
  };

  const editarComentarioSeguro = async (comentario: ComentarioJogo, novaMensagem: string) => {
    setComentarioCarregandoId(comentario.id);
    try {
      const comentarioAtualizado = await editarComentario(comentario.id, novaMensagem);
      queryClient.setQueryData<ComentarioJogo[]>(vivicopaQueryKeys.comentarios, (atual) =>
        atualizarComentarioNoCache(atual, comentarioAtualizado),
      );
      void onSaved();
    } catch {
      toast.error("Nao foi possivel editar o comentario.");
      throw new Error("Falha ao editar comentario");
    } finally {
      setComentarioCarregandoId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-brand-soft/40 p-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand">
          Nova mensagem
        </div>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {emojisRapidos.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => inserirEmoji(emoji)}
              className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-border bg-white px-2 text-[1.05rem] leading-none transition hover:border-brand hover:bg-brand-soft"
              aria-label={`Adicionar ${emoji}`}
              title={`Adicionar ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
        <Textarea
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          placeholder={
            respondendoA
              ? `Respondendo ${respondendoA.usuario}... emojis tambem funcionam 😄`
              : "Mande sua resenha para esse jogo... emojis tambem funcionam 😄"
          }
          rows={3}
        />
        {respondendoA && (
          <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-brand/20 bg-white/80 px-3 py-2">
            <div className="min-w-0 text-xs text-muted-foreground">
              Respondendo{" "}
              <span className="font-semibold text-brand-dark">{respondendoA.usuario}</span>: "
              {respondendoA.mensagem}"
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => setRespondendoA(null)}
            >
              Cancelar
            </Button>
          </div>
        )}
        <div className="mt-2 flex justify-end">
          <Button
            onClick={enviarComentario}
            disabled={enviando || !mensagem.trim()}
            className="bg-gradient-brand text-white hover:opacity-90"
          >
            {enviando ? "Enviando..." : respondendoA ? "Responder" : "Comentar"}
          </Button>
        </div>
      </div>
      {comentariosPrincipais.length === 0 && (
        <div className="py-6 text-center text-muted-foreground">Sem comentarios ainda.</div>
      )}
      {comentariosPrincipais.map((comentario) => (
        <CommentThreadItem
          key={comentario.id}
          comentario={comentario}
          childrenMap={childrenMap}
          userId={userId}
          userRole={userRole}
          onReply={setRespondendoA}
          onToggleLike={curtirComentario}
          onDelete={excluirComentarioSeguro}
          onEdit={editarComentarioSeguro}
          loadingCommentId={comentarioCarregandoId}
        />
      ))}
    </div>
  );
}
