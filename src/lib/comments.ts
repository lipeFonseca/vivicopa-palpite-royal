import { supabase } from "@/integrations/supabase/client";

export interface ComentarioJogo {
  id: string;
  usuarioId: string;
  usuario: string;
  jogoId: string;
  mensagem: string;
  parentId: string | null;
  dataCriacao: string;
  dataEdicao: string | null;
  curtidasCount: number;
  respostasCount: number;
  curtidoPorMim: boolean;
}

export interface NotificacaoRespostaComentario {
  id: string;
  tipo: "comentario_resposta";
  usuarioDestinoId: string;
  usuarioOrigemId: string;
  usuarioOrigemNome: string;
  comentarioId: string;
  comentarioPaiId: string;
  jogoId: string;
  comentarioMensagem: string;
  comentarioPaiMensagem: string;
  lidaEm: string | null;
  dataCriacao: string;
}

function dbRowToComentario(row: Record<string, unknown>): ComentarioJogo {
  return {
    id: row.id as string,
    usuarioId: row.usuario_id as string,
    usuario: row.usuario_nome as string,
    jogoId: row.jogo_id as string,
    mensagem: row.mensagem as string,
    parentId: (row.parent_id as string | null) ?? null,
    dataCriacao: row.criado_em as string,
    dataEdicao: (row.editado_em as string | null) ?? null,
    curtidasCount: Number(row.curtidas_count ?? 0),
    respostasCount: Number(row.respostas_count ?? 0),
    curtidoPorMim: Boolean(row.curtido_por_mim),
  };
}

export async function carregarComentarios(): Promise<ComentarioJogo[]> {
  const { data, error } = await supabase.rpc("listar_comentarios_jogo");
  if (error) throw error;
  return (data as unknown as Record<string, unknown>[]).map(dbRowToComentario);
}

export async function salvarComentario(
  comentario: Pick<ComentarioJogo, "id" | "usuario" | "jogoId" | "mensagem" | "parentId">,
  userId: string,
): Promise<ComentarioJogo> {
  const { data, error } = await supabase
    .from("comentarios_jogo" as never)
    .insert({
      id: comentario.id,
      usuario_id: userId,
      usuario_nome: comentario.usuario,
      jogo_id: comentario.jogoId,
      mensagem: comentario.mensagem,
      parent_id: comentario.parentId,
    } as never)
    .select("id, usuario_id, usuario_nome, jogo_id, mensagem, parent_id, criado_em, editado_em")
    .single();
  if (error) throw error;
  return dbRowToComentario({
    ...(data as Record<string, unknown>),
    curtidas_count: 0,
    respostas_count: 0,
    curtido_por_mim: false,
  });
}

export async function excluirComentario(id: string): Promise<void> {
  const { error } = await supabase.rpc("excluir_comentario_jogo", {
    alvo_id: id,
  });
  if (error) throw error;
}

export async function editarComentario(id: string, mensagem: string): Promise<ComentarioJogo> {
  const { data, error } = await supabase.rpc("editar_comentario_jogo", {
    alvo_id: id,
    nova_mensagem: mensagem,
  });
  if (error) throw error;
  return dbRowToComentario({
    ...(data as Record<string, unknown>),
    curtidas_count: 0,
    respostas_count: 0,
    curtido_por_mim: false,
  });
}

export async function alternarCurtidaComentario(
  comentarioId: string,
  userId: string,
  curtidoPorMim: boolean,
): Promise<void> {
  if (curtidoPorMim) {
    const { error } = await supabase
      .from("comentario_curtidas" as never)
      .delete()
      .eq("comentario_id", comentarioId)
      .eq("usuario_id", userId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("comentario_curtidas" as never).insert({
    comentario_id: comentarioId,
    usuario_id: userId,
  } as never);
  if (error) throw error;
}

function dbRowToNotificacao(row: Record<string, unknown>): NotificacaoRespostaComentario {
  return {
    id: row.id as string,
    tipo: "comentario_resposta",
    usuarioDestinoId: row.usuario_destino_id as string,
    usuarioOrigemId: row.usuario_origem_id as string,
    usuarioOrigemNome: row.usuario_origem_nome as string,
    comentarioId: row.comentario_id as string,
    comentarioPaiId: row.comentario_pai_id as string,
    jogoId: row.jogo_id as string,
    comentarioMensagem: row.comentario_mensagem as string,
    comentarioPaiMensagem: row.comentario_pai_mensagem as string,
    lidaEm: (row.lida_em as string | null) ?? null,
    dataCriacao: row.criado_em as string,
  };
}

export async function carregarNotificacoesRespostaComentario(
  limitCount = 20,
): Promise<NotificacaoRespostaComentario[]> {
  const { data, error } = await supabase.rpc("listar_notificacoes_respostas", {
    limit_count: limitCount,
  });
  if (error) throw error;
  return (data as unknown as Record<string, unknown>[]).map(dbRowToNotificacao);
}

export async function marcarNotificacoesRespostaComoLidas(ids?: string[]): Promise<void> {
  let query = supabase
    .from("notificacoes_usuario" as never)
    .update({ lida_em: new Date().toISOString() } as never)
    .is("lida_em", null);

  if (ids != null && ids.length > 0) {
    query = query.in("id", ids);
  }

  const { error } = await query;
  if (error) throw error;
}
