import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, RefreshCw, Save, Trash2, Trophy, UserPlus, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  useAllPalpitesAdminQuery,
  useCronMonitorQuery,
  useManagedUsersQuery,
  vivicopaQueryKeys,
  type AdminPalpite,
  type CronMonitorJob,
  type CronMonitorRun,
  type ManagedUser,
} from "@/hooks/useVivicopaQueries";
import { getSelecao } from "@/data/worldcup2026";
import { type AuthProfile } from "@/store/authStore";
import { isValidEmail, isValidUsername, normalizeEmail, normalizeUsername } from "@/lib/auth";

type ManagedUserDraft = ManagedUser & { password?: string };

function AdminUsersPanel({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<ManagedUserDraft[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { data: loadedUsers = [], isLoading: loading, refetch } = useManagedUsersQuery();

  useEffect(() => {
    setUsers(loadedUsers.map((user) => ({ ...user, password: "" })));
  }, [loadedUsers]);

  useEffect(() => {
    const sync = () => {
      void queryClient.invalidateQueries({ queryKey: vivicopaQueryKeys.managedUsers });
    };
    window.addEventListener("vivicopa:users-changed", sync);
    return () => window.removeEventListener("vivicopa:users-changed", sync);
  }, [queryClient]);

  const atualizarDraft = (id: string, patch: Partial<ManagedUserDraft>) => {
    setUsers((current) => current.map((user) => (user.id === id ? { ...user, ...patch } : user)));
  };

  const salvarUsuario = async (user: ManagedUserDraft) => {
    const username = normalizeUsername(user.username);
    const email = normalizeEmail(user.email ?? "");

    if (!isValidUsername(username)) {
      toast.error(
        "Usuario deve ter 3 a 32 caracteres e usar apenas letras, numeros, ponto, hifen ou underline.",
      );
      return;
    }
    if (email && !isValidEmail(email)) {
      toast.error("Informe um e-mail valido.");
      return;
    }
    if (user.password && user.password.length < 6) {
      toast.error("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    setSavingId(user.id);
    const { error } = await supabase.functions.invoke("manage-users", {
      method: "PATCH",
      body: {
        id: user.id,
        username,
        email: email || null,
        role: user.role,
        password: user.password || undefined,
      },
    });
    setSavingId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Usuario atualizado.");
    await queryClient.invalidateQueries({ queryKey: vivicopaQueryKeys.managedUsers });
  };

  const apagarUsuario = async (user: ManagedUserDraft) => {
    if (user.id === currentUserId) {
      toast.error("Voce nao pode apagar o proprio usuario.");
      return;
    }
    const ok = window.confirm(
      `Apagar o usuario ${user.username}? Esta acao nao pode ser desfeita.`,
    );
    if (!ok) return;

    setDeletingId(user.id);
    const { error } = await supabase.functions.invoke("manage-users", {
      method: "DELETE",
      body: { id: user.id },
    });
    setDeletingId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Usuario apagado.");
    await queryClient.invalidateQueries({ queryKey: vivicopaQueryKeys.managedUsers });
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand">
          <Users className="h-3.5 w-3.5" /> Usuarios cadastrados
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            void refetch();
          }}
          disabled={loading}
        >
          <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      <div className="space-y-3">
        {users.map((user) => {
          const isSelf = user.id === currentUserId;
          return (
            <div
              key={user.id}
              className="grid gap-3 rounded-xl border border-border bg-brand-soft/40 p-3 lg:grid-cols-[1.1fr_1.4fr_120px_1fr_auto] lg:items-end"
            >
              <div>
                <Label htmlFor={`user-${user.id}`}>Usuario</Label>
                <Input
                  id={`user-${user.id}`}
                  value={user.username}
                  onChange={(e) => atualizarDraft(user.id, { username: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor={`email-${user.id}`}>E-mail de contato</Label>
                <Input
                  id={`email-${user.id}`}
                  type="email"
                  value={user.email ?? ""}
                  onChange={(e) => atualizarDraft(user.id, { email: e.target.value })}
                  placeholder="sem e-mail"
                />
              </div>
              <div>
                <Label>Perfil</Label>
                <Select
                  value={user.role}
                  onValueChange={(role) =>
                    atualizarDraft(user.id, { role: role as "admin" | "user" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuario</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor={`password-${user.id}`}>Nova senha</Label>
                <Input
                  id={`password-${user.id}`}
                  type="password"
                  value={user.password ?? ""}
                  onChange={(e) => atualizarDraft(user.id, { password: e.target.value })}
                  placeholder="manter atual"
                />
              </div>
              <div className="flex gap-2 lg:justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => salvarUsuario(user)}
                  disabled={savingId === user.id || deletingId === user.id}
                >
                  <Save className="mr-1 h-3.5 w-3.5" /> Salvar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => apagarUsuario(user)}
                  disabled={isSelf || savingId === user.id || deletingId === user.id}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Apagar
                </Button>
              </div>
            </div>
          );
        })}
        {!loading && users.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhum usuario encontrado.
          </div>
        )}
        {loading && users.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Carregando usuarios...
          </div>
        )}
      </div>
    </div>
  );
}

export function UsersTab({ currentUser }: { currentUser: AuthProfile }) {
  const [novoUsuario, setNovoUsuario] = useState("");
  const [senhaUsuario, setSenhaUsuario] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);
  const queryClient = useQueryClient();

  const criarUsuario = async (event: FormEvent) => {
    event.preventDefault();
    const username = normalizeUsername(novoUsuario);
    if (!isValidUsername(username)) {
      toast.error(
        "Usuario deve ter 3 a 32 caracteres e usar apenas letras, numeros, ponto, hifen ou underline.",
      );
      return;
    }
    if (senhaUsuario.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    setCreatingUser(true);
    try {
      const { error } = await supabase.functions.invoke("create-managed-user", {
        body: { username, password: senhaUsuario },
      });
      if (error) throw error;
      setNovoUsuario("");
      setSenhaUsuario("");
      await queryClient.invalidateQueries({ queryKey: vivicopaQueryKeys.managedUsers });
      toast.success(`Usuario ${username} criado.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel criar o usuario.");
    } finally {
      setCreatingUser(false);
    }
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={criarUsuario}
        className="rounded-2xl border border-border bg-card p-5 shadow-card"
      >
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand">
          <UserPlus className="h-3.5 w-3.5" /> Criar usuario
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div>
            <Label htmlFor="usuarios-novo-usuario">Usuario</Label>
            <Input
              id="usuarios-novo-usuario"
              value={novoUsuario}
              onChange={(e) => setNovoUsuario(e.target.value)}
              placeholder="ex: maria"
            />
          </div>
          <div>
            <Label htmlFor="usuarios-senha-inicial">Senha inicial</Label>
            <Input
              id="usuarios-senha-inicial"
              type="password"
              value={senhaUsuario}
              onChange={(e) => setSenhaUsuario(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={creatingUser}>
            <UserPlus className="mr-1 h-4 w-4" />
            {creatingUser ? "Criando..." : "Criar usuario"}
          </Button>
        </div>
      </form>

      <AdminUsersPanel currentUserId={currentUser.id} />
    </div>
  );
}

function formatAdminDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function cronJobLabel(jobname: string) {
  switch (jobname) {
    case "atualizar-placares-every-minute":
      return "Sync principal";
    case "atualizar-placares-fast-live-offset-30s":
      return "Sync ao vivo";
    case "atualizar-placares-seed-daily":
      return "Seed diaria";
    default:
      return jobname;
  }
}

function CronStatusBadge({ status }: { status?: string | null }) {
  const normalized = (status ?? "").toLowerCase();
  const ok = normalized === "succeeded";
  const label = status ?? "Sem execucao";

  return (
    <Badge
      className={
        ok
          ? "bg-emerald-600 text-white hover:bg-emerald-600"
          : "bg-amber-500 text-white hover:bg-amber-500"
      }
    >
      {label}
    </Badge>
  );
}

export function AdminCronMonitorPanel() {
  const { data, isLoading, isFetching, refetch, error } = useCronMonitorQuery(true);
  const [aberto, setAberto] = useState(false);

  const runs = data?.runs ?? [];
  const jobs = data?.jobs ?? [];
  const last24h = data?.last_24h;
  const partidasStatus = data?.partidas_status ?? [];

  return (
    <section className="site-admin-section overflow-hidden border border-border bg-card">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 p-5 text-left"
        onClick={() => setAberto((v) => !v)}
      >
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase text-brand">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Monitor de
            sincronizacao
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanha os cron jobs do placar ao vivo sem sobrecarregar o banco.
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-brand transition-transform duration-200 ${aberto ? "rotate-180" : ""}`}
        />
      </button>

      {aberto && (
        <div className="border-t border-border px-5 pb-5 pt-4">
          <div className="mb-4 flex items-center justify-end gap-2">
            <div className="text-xs text-muted-foreground">
              Atualizado: {formatAdminDateTime(data?.generated_at)}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`mr-1 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Nao foi possivel carregar o monitor do cron.
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-border bg-brand-soft/40 p-3">
              <div className="text-[11px] font-bold uppercase text-muted-foreground">
                Execucoes 24h
              </div>
              <div className="mt-1 text-2xl font-extrabold text-brand-dark">
                {last24h?.total ?? 0}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-emerald-50 p-3">
              <div className="text-[11px] font-bold uppercase text-emerald-700">Sucesso 24h</div>
              <div className="mt-1 text-2xl font-extrabold text-emerald-700">
                {last24h?.succeeded ?? 0}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-amber-50 p-3">
              <div className="text-[11px] font-bold uppercase text-amber-700">Falhas 24h</div>
              <div className="mt-1 text-2xl font-extrabold text-amber-700">
                {last24h?.failed ?? 0}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-brand-soft/40 p-3">
              <div className="text-[11px] font-bold uppercase text-muted-foreground">
                Ultima busca agendada
              </div>
              <div className="mt-1 text-sm font-bold text-brand-dark">
                {formatAdminDateTime(data?.sync_state?.ultima_busca)}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_1fr]">
            <div className="rounded-2xl border border-border">
              <div className="border-b border-border px-4 py-3 text-sm font-black uppercase text-brand">
                Jobs monitorados
              </div>
              <div className="divide-y divide-border">
                {jobs.map((job: CronMonitorJob) => (
                  <div
                    key={job.jobid}
                    className="grid gap-2 px-4 py-3 md:grid-cols-[1.4fr_auto_auto] md:items-center"
                  >
                    <div>
                      <div className="font-bold text-brand-dark">{cronJobLabel(job.jobname)}</div>
                      <div className="text-xs text-muted-foreground">{job.schedule}</div>
                    </div>
                    <CronStatusBadge status={job.last_status} />
                    <div className="text-right text-xs text-muted-foreground">
                      {job.active ? "Ativo" : "Inativo"} ·{" "}
                      {formatAdminDateTime(job.last_start_time)}
                    </div>
                  </div>
                ))}
                {!isLoading && jobs.length === 0 && (
                  <div className="px-4 py-4 text-sm text-muted-foreground">
                    Nenhum job monitorado.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border">
              <div className="border-b border-border px-4 py-3 text-sm font-black uppercase text-brand">
                Status das partidas
              </div>
              <div className="flex flex-wrap gap-2 px-4 py-4">
                {partidasStatus.map((item) => (
                  <div
                    key={item.status}
                    className="rounded-full border border-border bg-brand-soft/40 px-3 py-1 text-xs font-bold text-brand-dark"
                  >
                    {item.status}: {item.total}
                  </div>
                ))}
                {!isLoading && partidasStatus.length === 0 && (
                  <div className="text-sm text-muted-foreground">Sem dados de partidas.</div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-border">
            <div className="border-b border-border px-4 py-3 text-sm font-black uppercase text-brand">
              Ultimas execucoes
            </div>
            <div className="max-h-80 overflow-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-brand-soft/30 text-left text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Job</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Inicio</th>
                    <th className="px-4 py-2">Fim</th>
                    <th className="px-4 py-2">Retorno</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run: CronMonitorRun) => {
                    const matchedJob = jobs.find((job) => job.jobid === run.jobid);
                    return (
                      <tr key={`${run.jobid}-${run.runid}`} className="border-t border-border">
                        <td className="px-4 py-2 font-semibold text-brand-dark">
                          {matchedJob ? cronJobLabel(matchedJob.jobname) : `Job ${run.jobid}`}
                        </td>
                        <td className="px-4 py-2">
                          <CronStatusBadge status={run.status} />
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {formatAdminDateTime(run.start_time)}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {formatAdminDateTime(run.end_time)}
                        </td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">
                          {run.return_message || "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {!isLoading && runs.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-4 text-center text-sm text-muted-foreground"
                      >
                        Nenhuma execucao recente encontrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export function AdminPalpitesPanel() {
  const { data: allPalpites = [], isLoading } = useAllPalpitesAdminQuery(true);
  const [filtro, setFiltro] = useState<"todos" | "finalizados" | "acertos">("todos");
  const [aberto, setAberto] = useState(false);

  const lista = useMemo(() => {
    if (filtro === "finalizados") return allPalpites.filter((p) => p.finalizado);
    if (filtro === "acertos") return allPalpites.filter((p) => p.acertouNaMosca);
    return allPalpites;
  }, [allPalpites, filtro]);

  const porJogo = useMemo(() => {
    const m = new Map<string, AdminPalpite[]>();
    lista.forEach((p) => m.set(p.jogoId, [...(m.get(p.jogoId) ?? []), p]));
    return Array.from(m.entries())
      .map(([jogoId, palpites]) => ({ jogoId, palpites }))
      .sort((a, b) => {
        const pa = a.palpites[0];
        const pb = b.palpites[0];
        return (pb.data + pb.hora).localeCompare(pa.data + pa.hora);
      });
  }, [lista]);

  const totalAcertos = allPalpites.filter((p) => p.acertouNaMosca).length;

  return (
    <section className="site-admin-section overflow-hidden border border-border bg-card">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 p-5 text-left"
        onClick={() => setAberto((v) => !v)}
      >
        <div className="flex items-center gap-2 text-xs font-black uppercase text-brand">
          <Trophy className="h-4 w-4" /> Todos os palpites
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{allPalpites.length} palpites</span>
            <span>·</span>
            <span className="font-semibold text-[#8d6710]">{totalAcertos} acertaram na mosca</span>
          </div>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-brand transition-transform duration-200 ${aberto ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {aberto && (
        <div className="border-t border-border px-5 pb-5 pt-4">
          <div className="mb-4 flex gap-2">
            {(["todos", "finalizados", "acertos"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFiltro(f)}
                className={`rounded-full px-3 py-1 text-[11px] font-black uppercase transition ${filtro === f ? "bg-brand text-white" : "bg-brand-soft text-brand-dark hover:bg-brand/20"}`}
              >
                {f === "todos"
                  ? "Todos"
                  : f === "finalizados"
                    ? "Finalizados"
                    : "Acertaram na mosca"}
              </button>
            ))}
          </div>
          {isLoading && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Carregando palpites...
            </div>
          )}
          {!isLoading && porJogo.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Nenhum palpite encontrado.
            </div>
          )}
          <div className="space-y-4">
            {porJogo.map(({ jogoId, palpites: ps }) => {
              const primeiro = ps[0];
              const a = getSelecao(primeiro.selecaoA);
              const b = getSelecao(primeiro.selecaoB);
              const acertosDoJogo = ps.filter((p) => p.acertouNaMosca).length;
              return (
                <div
                  key={jogoId}
                  className="overflow-hidden rounded-xl border border-border bg-white/60"
                >
                  <div
                    className={`flex items-center justify-between px-4 py-2 text-xs font-black uppercase text-white ${primeiro.finalizado ? "bg-brand" : "bg-brand/60"}`}
                  >
                    <span>
                      {a?.nome ?? primeiro.selecaoA} × {b?.nome ?? primeiro.selecaoB} — Grupo{" "}
                      {primeiro.grupo} · {primeiro.data}
                    </span>
                    {primeiro.finalizado && (
                      <span className="ml-2 shrink-0 rounded-full bg-white/20 px-2 py-0.5">
                        {primeiro.resultadoA} – {primeiro.resultadoB}
                        {acertosDoJogo > 0 && ` · ${acertosDoJogo} na mosca`}
                      </span>
                    )}
                  </div>
                  <div className="divide-y divide-border/40">
                    {ps.map((p) => (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between px-4 py-2 text-sm ${p.acertouNaMosca ? "bg-[#fffbee]" : ""}`}
                      >
                        <span
                          className={`font-semibold ${p.acertouNaMosca ? "text-[#8d6710]" : "text-brand-dark"}`}
                        >
                          {p.usuarioNome}
                        </span>
                        <div className="flex items-center gap-3">
                          <span
                            className={`font-extrabold tabular-nums ${p.acertouNaMosca ? "text-[#b07e16]" : "text-brand"}`}
                          >
                            {p.palpiteA} – {p.palpiteB}
                          </span>
                          {p.acertouNaMosca && (
                            <span className="rounded-full border border-[#e6cf90] bg-[#fff3cf] px-2 py-0.5 text-[10px] font-black uppercase text-[#8d6710]">
                              Acertou na mosca
                            </span>
                          )}
                          {p.finalizado && !p.acertouNaMosca && (
                            <span className="text-[10px] text-muted-foreground">Errou</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
