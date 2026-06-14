import { supabase } from "@/integrations/supabase/client";

export interface Palpite {
  id: string;
  usuarioId: string;
  usuario: string;
  jogoId: string;
  selecaoA: string;
  selecaoB: string;
  placarA: number;
  placarB: number;
  dataCriacao: string;
}

function dbRowToPalpite(row: Record<string, unknown>): Palpite {
  return {
    id: row.id as string,
    usuarioId: row.usuario_id as string,
    usuario: row.usuario_nome as string,
    jogoId: row.jogo_id as string,
    selecaoA: row.selecao_a as string,
    selecaoB: row.selecao_b as string,
    placarA: row.placar_a as number,
    placarB: row.placar_b as number,
    dataCriacao: row.criado_em as string,
  };
}

function palpiteToDbRow(p: Palpite, userId: string) {
  return {
    id: p.id,
    usuario_id: userId,
    usuario_nome: p.usuario,
    jogo_id: p.jogoId,
    selecao_a: p.selecaoA,
    selecao_b: p.selecaoB,
    placar_a: p.placarA,
    placar_b: p.placarB,
    atualizado_em: new Date().toISOString(),
  };
}

export async function carregarPalpites(userId: string): Promise<Palpite[]> {
  const { data, error } = await supabase
    .from("palpites_familia" as never)
    .select("*")
    .eq("usuario_id", userId)
    .order("criado_em", { ascending: false });
  if (error) return [];
  return ((data as unknown) as Record<string, unknown>[]).map(dbRowToPalpite);
}

export async function salvarPalpite(p: Palpite, userId: string): Promise<void> {
  const { error } = await supabase
    .from("palpites_familia" as never)
    .insert(palpiteToDbRow(p, userId) as never);
  if (error) throw error;
}

export async function atualizarPalpite(p: Palpite, userId: string): Promise<void> {
  const { error } = await supabase
    .from("palpites_familia" as never)
    .update(palpiteToDbRow(p, userId) as never)
    .eq("id", p.id)
    .eq("usuario_id", userId);
  if (error) throw error;
}

export async function excluirPalpite(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("palpites_familia" as never)
    .delete()
    .eq("id", id)
    .eq("usuario_id", userId);
  if (error) throw error;
}
