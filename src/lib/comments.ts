import { supabase } from "@/integrations/supabase/client";

export interface ComentarioJogo {
  id: string;
  usuarioId: string;
  usuario: string;
  jogoId: string;
  mensagem: string;
  dataCriacao: string;
}

function dbRowToComentario(row: Record<string, unknown>): ComentarioJogo {
  return {
    id: row.id as string,
    usuarioId: row.usuario_id as string,
    usuario: row.usuario_nome as string,
    jogoId: row.jogo_id as string,
    mensagem: row.mensagem as string,
    dataCriacao: row.criado_em as string,
  };
}

export async function carregarComentarios(): Promise<ComentarioJogo[]> {
  const { data, error } = await supabase
    .from("comentarios_jogo" as never)
    .select("*")
    .order("criado_em", { ascending: false });
  if (error) return [];
  return ((data as unknown) as Record<string, unknown>[]).map(dbRowToComentario);
}

export async function salvarComentario(
  comentario: Pick<ComentarioJogo, "id" | "usuario" | "jogoId" | "mensagem">,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("comentarios_jogo" as never)
    .insert({
      id: comentario.id,
      usuario_id: userId,
      usuario_nome: comentario.usuario,
      jogo_id: comentario.jogoId,
      mensagem: comentario.mensagem,
    } as never);
  if (error) throw error;
}

export async function excluirComentario(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("comentarios_jogo" as never)
    .delete()
    .eq("id", id)
    .eq("usuario_id", userId);
  if (error) throw error;
}
