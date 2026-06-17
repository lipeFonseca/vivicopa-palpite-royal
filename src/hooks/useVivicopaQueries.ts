import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { carregarComentarios, type ComentarioJogo } from "@/lib/comments";
import { carregarPalpites, type Palpite } from "@/lib/storage";
import { getWinningPredictions, getAllPalpitesAdmin, type WinningPrediction, type AdminPalpite } from "@/lib/api/winning-predictions.functions";

export type { WinningPrediction, AdminPalpite };

export const vivicopaQueryKeys = {
  comentarios: ["comentarios-jogo"] as const,
  meusPalpites: (userId: string) => ["meus-palpites", userId] as const,
  winningPredictions: ["winning-predictions"] as const,
  allPalpitesAdmin: ["all-palpites-admin"] as const,
  managedUsers: ["managed-users"] as const,
  cronMonitor: ["cron-monitor"] as const,
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

export type CronMonitorJob = {
  jobid: number;
  jobname: string;
  schedule: string;
  active: boolean;
  last_status: string | null;
  last_start_time: string | null;
  last_end_time: string | null;
  last_return_message: string | null;
};

export type CronMonitorRun = {
  jobid: number;
  runid: number;
  status: string | null;
  return_message: string | null;
  start_time: string | null;
  end_time: string | null;
  command: string | null;
};

export type CronMonitorPayload = {
  generated_at: string | null;
  jobs: CronMonitorJob[];
  runs: CronMonitorRun[];
  last_24h: {
    total: number;
    succeeded: number;
    failed: number;
  } | null;
  partidas_status: Array<{
    status: string;
    total: number;
  }>;
  sync_state: {
    ultima_busca: string | null;
    atualizado_em: string | null;
  } | null;
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

export function useWinningPredictionsQuery(userId: string | null | undefined) {
  return useQuery<WinningPrediction[]>({
    queryKey: [...vivicopaQueryKeys.winningPredictions, userId ?? ""],
    queryFn: () => getWinningPredictions(),
    enabled: Boolean(userId),
    staleTime: 0,
    gcTime: 0,
    refetchInterval: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useAllPalpitesAdminQuery(enabled = true) {
  return useQuery<AdminPalpite[]>({
    queryKey: vivicopaQueryKeys.allPalpitesAdmin,
    queryFn: () => getAllPalpitesAdmin(),
    enabled,
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
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

export function useCronMonitorQuery(enabled = true) {
  return useQuery<CronMonitorPayload>({
    queryKey: vivicopaQueryKeys.cronMonitor,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_cron_monitor");
      if (error) throw error;

      const payload = (data ?? {}) as Partial<CronMonitorPayload>;
      return {
        generated_at: payload.generated_at ?? null,
        jobs: Array.isArray(payload.jobs) ? payload.jobs : [],
        runs: Array.isArray(payload.runs) ? payload.runs : [],
        last_24h: payload.last_24h
          ? {
              total: Number(payload.last_24h.total ?? 0),
              succeeded: Number(payload.last_24h.succeeded ?? 0),
              failed: Number(payload.last_24h.failed ?? 0),
            }
          : null,
        partidas_status: Array.isArray(payload.partidas_status) ? payload.partidas_status : [],
        sync_state: payload.sync_state ?? null,
      };
    },
    enabled,
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
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
