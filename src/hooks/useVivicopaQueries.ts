import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { carregarComentarios, type ComentarioJogo } from "@/lib/comments";
import { carregarPalpites, type Palpite } from "@/lib/storage";

export const vivicopaQueryKeys = {
  comentarios: ["comentarios-jogo"] as const,
  meusPalpites: (userId: string) => ["meus-palpites", userId] as const,
  managedUsers: ["managed-users"] as const,
  copaPalpites: (userId: string) => ["copa-palpites", userId] as const,
  copaRanking: ["copa-ranking"] as const,
};

export type ManagedUser = {
  id: string;
  username: string;
  email: string | null;
  role: "admin" | "user";
  auth_email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
};

export type CopaPalpite = {
  id: string;
  usuario_id: string;
  partida_id: string;
  palpite_a: number;
  palpite_b: number;
};

export type CopaRankingRow = {
  usuario_id: string;
  jogos_pontuados: number;
  pontos: number;
};

export function useComentariosQuery() {
  return useQuery<ComentarioJogo[]>({
    queryKey: vivicopaQueryKeys.comentarios,
    queryFn: carregarComentarios,
    staleTime: 2 * 60 * 1000,
  });
}

export function useMeusPalpitesQuery(userId: string | null | undefined) {
  return useQuery<Palpite[]>({
    queryKey: vivicopaQueryKeys.meusPalpites(userId ?? ""),
    queryFn: () => carregarPalpites(userId ?? ""),
    enabled: Boolean(userId),
    staleTime: 60 * 1000,
  });
}

export function useManagedUsersQuery(enabled = true) {
  return useQuery<ManagedUser[]>({
    queryKey: vivicopaQueryKeys.managedUsers,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("manage-users", { method: "GET" });
      if (error) throw error;
      return ((data as { users?: ManagedUser[] } | null)?.users ?? []);
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCopaPalpitesQuery(userId: string | null | undefined) {
  return useQuery<CopaPalpite[]>({
    queryKey: vivicopaQueryKeys.copaPalpites(userId ?? ""),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("palpites")
        .select("*")
        .eq("usuario_id", userId ?? "");
      if (error) throw error;
      return (data ?? []) as CopaPalpite[];
    },
    enabled: Boolean(userId),
    staleTime: 60 * 1000,
  });
}

export function useCopaRankingQuery() {
  return useQuery<{ rows: CopaRankingRow[]; nomes: Record<string, string> }>({
    queryKey: vivicopaQueryKeys.copaRanking,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ranking" as never)
        .select("*")
        .order("pontos", { ascending: false });
      if (error) throw error;

      const rows = ((data ?? []) as unknown) as CopaRankingRow[];
      const ids = rows.map((row) => row.usuario_id);
      const nomes: Record<string, string> = {};

      if (ids.length > 0) {
        const { data: perfis } = await supabase
          .from("profiles" as never)
          .select("id, nome, full_name, display_name, email")
          .in("id" as never, ids as never);

        ((perfis ?? []) as any[]).forEach((perfil) => {
          nomes[perfil.id] =
            perfil.nome ??
            perfil.full_name ??
            perfil.display_name ??
            perfil.email ??
            String(perfil.id).slice(0, 8);
        });
      }

      return { rows, nomes };
    },
    staleTime: 5 * 60 * 1000,
  });
}
