import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Trophy, Flag, Users, MessageSquare, Calendar, ListChecks, Table as TableIcon, Home as HomeIcon, CalendarDays, MapPin, Award, GitBranch, Shield, LogOut, KeyRound, UserPlus, ImageIcon } from "lucide-react";
import { Slider } from "@/components/ui/slider";

import { Header } from "@/components/vivicopa/Header";
import { Footer } from "@/components/vivicopa/Footer";
import { GameCard } from "@/components/vivicopa/GameCard";
import { PredictionModal } from "@/components/vivicopa/PredictionModal";
import { ChaveamentoAutomatico } from "@/components/vivicopa/ChaveamentoAutomatico";
import { supabase } from "@/integrations/supabase/client";
import { selecoes, jogos, grupos, getSelecao, type Jogo, type Selecao } from "@/data/worldcup2026";
import { getStats } from "@/data/selecaoStats";
import { isValidUsername, normalizeUsername, usernameToEmail } from "@/lib/auth";
import { carregarPalpites, excluirPalpite, type Palpite } from "@/lib/storage";
import { flagUrl, flagAlt } from "@/lib/flags";

const LOGO_URL_KEY = "vivicopa:logo-url";
const LOGO_SIZE_KEY = "vivicopa:logo-size";
const LOGO_HEADER_SIZE_KEY = "vivicopa:logo-header-size";
const HEADER_BANNER_KEY = "vivicopa:header-banner-url";
const HERO_BANNER_KEY = "vivicopa:hero-banner-url";

const PAISES_SEDE = [
  { id: "usa", nome: "Estados Unidos" },
  { id: "can", nome: "Canadá" },
  { id: "mex", nome: "México" },
];

type AuthProfile = {
  id: string;
  username: string;
  role: "admin" | "user";
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vivicopa — Palpites da Copa 2026" },
      { name: "description", content: "Plataforma de palpites, comentários e seleções da Copa do Mundo FIFA 2026 para amigos e família." },
      { property: "og:title", content: "Vivicopa — Palpites da Copa 2026" },
      { property: "og:description", content: "Palpites, resenhas e emoção em cada jogo." },
    ],
  }),
  component: Vivicopa,
});

function Vivicopa() {
  const [authLoading, setAuthLoading] = useState(true);
  const [authProfile, setAuthProfile] = useState<AuthProfile | null>(null);
  const [aba, setAba] = useState("inicio");
  const [palpites, setPalpites] = useState<Palpite[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [jogoSel, setJogoSel] = useState<Jogo | null>(null);
  const [editar, setEditar] = useState<Palpite | null>(null);
  const [comentariosJogo, setComentariosJogo] = useState<Jogo | null>(null);
  const [selecaoModal, setSelecaoModal] = useState<Selecao | null>(null);
  const [filtroGrupoInicial, setFiltroGrupoInicial] = useState<string>("todos");

  const carregarSessao = async () => {
    setAuthLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      setAuthProfile(null);
      setAuthLoading(false);
      return;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, username, role")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      toast.error(error.message);
      setAuthProfile(null);
      setAuthLoading(false);
      return;
    }

    setAuthProfile({
      id: user.id,
      username: profile?.username ?? user.email?.split("@")[0] ?? "usuario",
      role: profile?.role === "admin" ? "admin" : "user",
    });
    setAuthLoading(false);
  };

  useEffect(() => {
    carregarSessao();
    const { data } = supabase.auth.onAuthStateChange(() => {
      carregarSessao();
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const refresh = async () => { setPalpites(await carregarPalpites()); };

  const carregarConfig = async () => {
    const { data } = await supabase.from("app_config" as never).select("chave, valor");
    if (!data) return;
    const cfg: Record<string, string> = {};
    (data as { chave: string; valor: string | null }[]).forEach((r) => { cfg[r.chave] = r.valor ?? ""; });
    if (cfg.logo_url !== undefined) {
      if (cfg.logo_url) localStorage.setItem(LOGO_URL_KEY, cfg.logo_url);
      else localStorage.removeItem(LOGO_URL_KEY);
    }
    if (cfg.logo_size) localStorage.setItem(LOGO_SIZE_KEY, cfg.logo_size);
    if (cfg.logo_header_size) localStorage.setItem(LOGO_HEADER_SIZE_KEY, cfg.logo_header_size);
    if (cfg.header_banner_url !== undefined) {
      if (cfg.header_banner_url) localStorage.setItem(HEADER_BANNER_KEY, cfg.header_banner_url);
      else localStorage.removeItem(HEADER_BANNER_KEY);
    }
    if (cfg.hero_banner_url !== undefined) {
      if (cfg.hero_banner_url) localStorage.setItem(HERO_BANNER_KEY, cfg.hero_banner_url);
      else localStorage.removeItem(HERO_BANNER_KEY);
    }
    window.dispatchEvent(new CustomEvent("vivicopa:logo-changed"));
  };

  useEffect(() => {
    if (authProfile) { refresh(); carregarConfig(); }
  }, [authProfile?.id]);

  const palpitesPorJogo = useMemo(() => {
    const m = new Map<string, number>();
    palpites.forEach((p) => m.set(p.jogoId, (m.get(p.jogoId) ?? 0) + 1));
    return m;
  }, [palpites]);

  const abrirPalpite = (j: Jogo, p?: Palpite) => { setJogoSel(j); setEditar(p ?? null); setModalOpen(true); };
  const abrirComentarios = (j: Jogo) => setComentariosJogo(j);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-soft px-4">
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-card">
          Carregando sessao...
        </div>
      </div>
    );
  }

  if (!authProfile) {
    return <LoginScreen onLoggedIn={carregarSessao} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-brand-soft">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3 shadow-card">
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-brand" />
            <span className="font-semibold text-brand-dark">{authProfile.username}</span>
            <Badge variant={authProfile.role === "admin" ? "default" : "secondary"}>
              {authProfile.role === "admin" ? "Admin" : "Usuario"}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await supabase.auth.signOut();
              setAuthProfile(null);
              setAba("inicio");
            }}
          >
            <LogOut className="mr-1 h-3.5 w-3.5" /> Sair
          </Button>
        </div>
        <Tabs value={aba} onValueChange={setAba} className="w-full">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-white p-1 shadow-card">
            <TabTrigger value="inicio" icon={<HomeIcon className="h-4 w-4" />}>Início</TabTrigger>
            <TabTrigger value="jogos" icon={<Calendar className="h-4 w-4" />}>Jogos</TabTrigger>
            <TabTrigger value="calendario" icon={<CalendarDays className="h-4 w-4" />}>Calendário</TabTrigger>
            <TabTrigger value="selecoes" icon={<Flag className="h-4 w-4" />}>Seleções</TabTrigger>
            <TabTrigger value="grupos" icon={<Users className="h-4 w-4" />}>Grupos</TabTrigger>
            <TabTrigger value="chaveamento" icon={<GitBranch className="h-4 w-4" />}>Chaveamento</TabTrigger>
            <TabTrigger value="titulos" icon={<Award className="h-4 w-4" />}>Títulos</TabTrigger>
            <TabTrigger value="meus" icon={<ListChecks className="h-4 w-4" />}>Meus Palpites</TabTrigger>
            <TabTrigger value="tabela" icon={<TableIcon className="h-4 w-4" />}>Tabela</TabTrigger>
            <TabTrigger value="comentarios" icon={<MessageSquare className="h-4 w-4" />}>Comentários</TabTrigger>
            {authProfile.role === "admin" && (
              <TabTrigger value="admin" icon={<Shield className="h-4 w-4" />}>Admin</TabTrigger>
            )}
          </TabsList>

          <TabsContent value="inicio" className="mt-6">
            <Inicio palpites={palpites} onJogos={() => setAba("jogos")} onPalpite={() => setAba("jogos")} />
          </TabsContent>

          <TabsContent value="jogos" className="mt-6">
            <JogosTab
              palpitesPorJogo={palpitesPorJogo}
              onPalpitar={(j) => abrirPalpite(j)}
              onComentarios={abrirComentarios}
              grupoInicial={filtroGrupoInicial}
              onConsumirGrupo={() => setFiltroGrupoInicial("todos")}
            />
          </TabsContent>

          <TabsContent value="calendario" className="mt-6">
            <CalendarioTab palpitesPorJogo={palpitesPorJogo} onPalpitar={(j) => abrirPalpite(j)} onComentarios={abrirComentarios} />
          </TabsContent>

          <TabsContent value="selecoes" className="mt-6">
            <SelecoesTab onAbrir={setSelecaoModal} />
          </TabsContent>

          <TabsContent value="grupos" className="mt-6">
            <GruposTab onVerJogos={(g) => { setFiltroGrupoInicial(g); setAba("jogos"); }} />
          </TabsContent>

          <TabsContent value="chaveamento" className="mt-6">
            <ChaveamentoAutomatico />
          </TabsContent>

          <TabsContent value="titulos" className="mt-6">
            <TitulosTab />
          </TabsContent>

          <TabsContent value="meus" className="mt-6">
            <MeusPalpitesTab palpites={palpites} onEditar={(p) => {
              const j = jogos.find((x) => x.id === p.jogoId);
              if (j) abrirPalpite(j, p);
            }} onExcluir={async (id) => { await excluirPalpite(id, authProfile.id); await refresh(); }} />
          </TabsContent>

          <TabsContent value="tabela" className="mt-6">
            <TabelaTab palpites={palpites} />
          </TabsContent>

          <TabsContent value="comentarios" className="mt-6">
            <ComentariosTab palpites={palpites} />
          </TabsContent>

          {authProfile.role === "admin" && (
            <TabsContent value="admin" className="mt-6">
              <AdminTab />
            </TabsContent>
          )}
        </Tabs>
      </main>
      <Footer />

      <PredictionModal jogo={jogoSel} open={modalOpen} onClose={() => setModalOpen(false)} onSaved={refresh} editar={editar} userId={authProfile.id} username={authProfile.username} />

      <Dialog open={!!comentariosJogo} onOpenChange={(o) => !o && setComentariosJogo(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-brand-dark">Comentários do jogo</DialogTitle>
          </DialogHeader>
          {comentariosJogo && (
            <ComentariosJogo jogo={comentariosJogo} palpites={palpites} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selecaoModal} onOpenChange={(o) => !o && setSelecaoModal(null)}>
        <DialogContent className="max-w-md">
          {selecaoModal && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-brand-dark">
                  <img src={flagUrl(selecaoModal.id, 160)} alt={flagAlt(selecaoModal.id)} className="h-10 w-14 rounded-md object-cover ring-1 ring-border" />
                  {selecaoModal.nome}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <div><span className="font-semibold">Grupo:</span> {selecaoModal.grupo}</div>
                <div><span className="font-semibold">Técnico:</span> {selecaoModal.tecnico}</div>
                <div className="flex gap-2">
                  <div className="flex-1 rounded-lg bg-brand-soft p-2 text-center">
                    <div className="text-lg font-extrabold text-brand-dark">{getStats(selecaoModal.id).participacoes}</div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Participações</div>
                  </div>
                  <div className="flex-1 rounded-lg bg-brand-soft p-2 text-center">
                    <div className="flex items-center justify-center gap-1 text-lg font-extrabold text-brand-dark">
                      <Trophy className="h-4 w-4 text-brand" />{getStats(selecaoModal.id).titulos}
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Títulos</div>
                  </div>
                </div>
                <div>
                  <div className="font-semibold">Jogadores:</div>
                  <ul className="mt-1 list-inside list-disc text-muted-foreground">
                    {selecaoModal.jogadores.map((j) => <li key={j}>{j}</li>)}
                  </ul>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}

function LoginScreen({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(() => localStorage.getItem(LOGO_URL_KEY) ?? "");
  const [logoSize, setLogoSize] = useState(() => Number(localStorage.getItem(LOGO_SIZE_KEY) || 80));

  useEffect(() => {
    supabase.from("app_config" as never).select("chave, valor")
      .in("chave" as never, ["logo_url", "logo_size"])
      .then(({ data }) => {
        if (!data) return;
        const cfg: Record<string, string> = {};
        (data as { chave: string; valor: string | null }[]).forEach((r) => { cfg[r.chave] = r.valor ?? ""; });
        if (cfg.logo_url !== undefined) setLogoUrl(cfg.logo_url);
        if (cfg.logo_size) setLogoSize(Number(cfg.logo_size));
      });
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const normalized = normalizeUsername(username);
    if (!isValidUsername(normalized)) {
      toast.error("Usuario deve ter 3 a 32 caracteres.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(normalized),
      password,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    onLoggedIn();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-soft px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-brand">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex items-center justify-center">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo Vivicopa"
                style={{ width: logoSize, height: logoSize }}
                className="object-contain"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-brand text-white">
                <Shield className="h-6 w-6" />
              </div>
            )}
          </div>
          <h1 className="text-2xl font-extrabold text-brand-dark">Login Vivicopa</h1>
          <p className="mt-1 text-sm text-muted-foreground">Entre com usuario e senha para acessar os palpites.</p>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="login-usuario">Usuario</Label>
            <Input
              id="login-usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div>
            <Label htmlFor="login-senha">Senha</Label>
            <Input
              id="login-senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
        </div>

        <Button type="submit" className="mt-5 w-full bg-gradient-brand text-white hover:opacity-90" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Primeiro acesso: usuario admin e senha admin123. Troque a senha depois de entrar.
        </p>
        <Toaster />
      </form>
    </div>
  );
}

function AdminTab() {
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [novoUsuario, setNovoUsuario] = useState("");
  const [senhaUsuario, setSenhaUsuario] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);

  const [logoUrl, setLogoUrl] = useState(() => localStorage.getItem(LOGO_URL_KEY) ?? "");
  const [logoSize, setLogoSize] = useState(() => Number(localStorage.getItem(LOGO_SIZE_KEY) || 80));
  const [logoHeaderSize, setLogoHeaderSize] = useState(() => Number(localStorage.getItem(LOGO_HEADER_SIZE_KEY) || 36));
  const [bannerUrl, setBannerUrl] = useState(() => localStorage.getItem(HEADER_BANNER_KEY) ?? "");
  const [heroBannerUrl, setHeroBannerUrl] = useState(() => localStorage.getItem(HERO_BANNER_KEY) ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const heroBannerInputRef = useRef<HTMLInputElement>(null);

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogoUrl((ev.target?.result as string) ?? "");
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleBannerFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setBannerUrl((ev.target?.result as string) ?? "");
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleHeroBannerFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setHeroBannerUrl((ev.target?.result as string) ?? "");
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const salvarLogo = async () => {
    const rows = [
      { chave: "logo_url", valor: logoUrl, atualizado_em: new Date().toISOString() },
      { chave: "logo_size", valor: String(logoSize), atualizado_em: new Date().toISOString() },
      { chave: "logo_header_size", valor: String(logoHeaderSize), atualizado_em: new Date().toISOString() },
      { chave: "header_banner_url", valor: bannerUrl, atualizado_em: new Date().toISOString() },
      { chave: "hero_banner_url", valor: heroBannerUrl, atualizado_em: new Date().toISOString() },
    ];
    const { error } = await supabase.from("app_config" as never).upsert(rows as never, { onConflict: "chave" });
    if (error) { toast.error("Erro ao salvar configurações."); return; }
    if (logoUrl) localStorage.setItem(LOGO_URL_KEY, logoUrl); else localStorage.removeItem(LOGO_URL_KEY);
    localStorage.setItem(LOGO_SIZE_KEY, String(logoSize));
    localStorage.setItem(LOGO_HEADER_SIZE_KEY, String(logoHeaderSize));
    if (bannerUrl) localStorage.setItem(HEADER_BANNER_KEY, bannerUrl); else localStorage.removeItem(HEADER_BANNER_KEY);
    if (heroBannerUrl) localStorage.setItem(HERO_BANNER_KEY, heroBannerUrl); else localStorage.removeItem(HERO_BANNER_KEY);
    window.dispatchEvent(new CustomEvent("vivicopa:logo-changed"));
    toast.success("Configurações salvas.");
  };

  const removerLogo = async () => {
    await supabase.from("app_config" as never).update({ valor: "", atualizado_em: new Date().toISOString() } as never).eq("chave" as never, "logo_url");
    localStorage.removeItem(LOGO_URL_KEY);
    setLogoUrl("");
    window.dispatchEvent(new CustomEvent("vivicopa:logo-changed"));
    toast.success("Logo removida.");
  };

  const removerBanner = async () => {
    await supabase.from("app_config" as never).update({ valor: "", atualizado_em: new Date().toISOString() } as never).eq("chave" as never, "header_banner_url");
    localStorage.removeItem(HEADER_BANNER_KEY);
    setBannerUrl("");
    window.dispatchEvent(new CustomEvent("vivicopa:logo-changed"));
    toast.success("Banner do cabeçalho removido.");
  };

  const removerHeroBanner = async () => {
    await supabase.from("app_config" as never).update({ valor: "", atualizado_em: new Date().toISOString() } as never).eq("chave" as never, "hero_banner_url");
    localStorage.removeItem(HERO_BANNER_KEY);
    setHeroBannerUrl("");
    window.dispatchEvent(new CustomEvent("vivicopa:logo-changed"));
    toast.success("Banner da tela inicial removido.");
  };

  const trocarSenha = async (event: FormEvent) => {
    event.preventDefault();
    if (novaSenha.length < 6) {
      toast.error("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      toast.error("As senhas nao conferem.");
      return;
    }

    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setSavingPassword(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setNovaSenha("");
    setConfirmarSenha("");
    toast.success("Senha alterada.");
  };

  const criarUsuario = async (event: FormEvent) => {
    event.preventDefault();
    const username = normalizeUsername(novoUsuario);
    if (!isValidUsername(username)) {
      toast.error("Usuario deve ter 3 a 32 caracteres e usar apenas letras, numeros, ponto, hifen ou underline.");
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
      toast.success(`Usuario ${username} criado.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel criar o usuario.");
    } finally {
      setCreatingUser(false);
    }
  };

  return (
    <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-2">
      <form onSubmit={trocarSenha} className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand">
          <KeyRound className="h-3.5 w-3.5" /> Trocar minha senha
        </div>
        <div className="space-y-3">
          <div>
            <Label htmlFor="nova-senha">Nova senha</Label>
            <Input id="nova-senha" type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="confirmar-senha">Confirmar senha</Label>
            <Input id="confirmar-senha" type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} />
          </div>
        </div>
        <Button type="submit" className="mt-4 w-full" disabled={savingPassword}>
          {savingPassword ? "Salvando..." : "Alterar senha"}
        </Button>
      </form>

      <form onSubmit={criarUsuario} className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand">
          <UserPlus className="h-3.5 w-3.5" /> Criar usuario
        </div>
        <div className="space-y-3">
          <div>
            <Label htmlFor="novo-usuario">Usuario</Label>
            <Input id="novo-usuario" value={novoUsuario} onChange={(e) => setNovoUsuario(e.target.value)} placeholder="ex: maria" />
          </div>
          <div>
            <Label htmlFor="senha-usuario">Senha inicial</Label>
            <Input id="senha-usuario" type="password" value={senhaUsuario} onChange={(e) => setSenhaUsuario(e.target.value)} />
          </div>
        </div>
        <Button type="submit" className="mt-4 w-full" disabled={creatingUser}>
          {creatingUser ? "Criando..." : "Criar usuario"}
        </Button>
      </form>
    </div>

    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand">
        <ImageIcon className="h-3.5 w-3.5" /> Personalizar logo da tela de login
      </div>
      <div className="grid gap-6 md:grid-cols-[1fr_180px]">
        <div className="space-y-4">
          <div>
            <Label>Imagem (arquivo ou URL)</Label>
            <div className="mt-1.5 flex gap-2">
              <Input
                value={logoUrl.startsWith("data:") ? "" : logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://... ou carregue um arquivo"
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                Carregar arquivo
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoFile}
              />
            </div>
            {logoUrl.startsWith("data:") && (
              <p className="mt-1 text-xs text-muted-foreground">Arquivo carregado localmente.</p>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Tamanho na tela de login</Label>
              <span className="text-sm font-bold text-brand">{logoSize}px</span>
            </div>
            <Slider
              min={40}
              max={500}
              step={1}
              value={[logoSize]}
              onValueChange={([v]) => setLogoSize(v)}
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>40px</span>
              <span>500px</span>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Tamanho na barra superior</Label>
              <span className="text-sm font-bold text-brand">{logoHeaderSize}px</span>
            </div>
            <Slider
              min={20}
              max={300}
              step={1}
              value={[logoHeaderSize]}
              onValueChange={([v]) => setLogoHeaderSize(v)}
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>20px</span>
              <span>300px</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="button" onClick={salvarLogo}>Salvar configurações</Button>
            {logoUrl && (
              <Button type="button" variant="outline" onClick={removerLogo}>Remover logo</Button>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <Label className="mb-1.5 block">Banner atrás do título (barra superior)</Label>
            <div className="flex gap-2">
              <Input
                value={bannerUrl.startsWith("data:") ? "" : bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="https://... ou carregue um arquivo"
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={() => bannerInputRef.current?.click()}>
                Carregar arquivo
              </Button>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBannerFile}
              />
            </div>
            {bannerUrl.startsWith("data:") && (
              <p className="mt-1 text-xs text-muted-foreground">Arquivo carregado localmente.</p>
            )}
            {bannerUrl && (
              <div className="mt-3 space-y-2">
                <div
                  className="flex h-14 items-center gap-3 overflow-hidden rounded-xl px-3"
                  style={{
                    backgroundImage: `url(${bannerUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    position: "relative",
                  }}
                >
                  <div className="absolute inset-0 rounded-xl" style={{ background: "rgba(0,0,0,0.30)" }} />
                  <div className="relative z-10 flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-brand text-white">
                    <Trophy className="h-4 w-4" />
                  </div>
                  <div className="relative z-10 leading-tight">
                    <div className="text-sm font-bold text-white">Vivicopa</div>
                    <div className="text-xs text-white/80">Palpites, resenhas e emoção em cada jogo.</div>
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={removerBanner}>Remover banner</Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-muted-foreground">Prévia</p>
          <div className="flex min-h-[120px] w-full items-center justify-center rounded-xl border border-dashed border-border bg-brand-soft p-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Prévia da logo"
                style={{ width: Math.min(logoSize, 140), height: Math.min(logoSize, 140) }}
                className="object-contain"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-brand text-white">
                <Shield className="h-6 w-6" />
              </div>
            )}
          </div>
          <p className="text-center text-xs text-muted-foreground">Tamanho real aplicado na tela de login</p>
        </div>
      </div>
    </div>

    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand">
        <ImageIcon className="h-3.5 w-3.5" /> Banner da tela inicial (retângulo azul)
      </div>
      <div className="space-y-4">
        <div>
          <Label>Imagem de fundo (arquivo ou URL)</Label>
          <div className="mt-1.5 flex gap-2">
            <Input
              value={heroBannerUrl.startsWith("data:") ? "" : heroBannerUrl}
              onChange={(e) => setHeroBannerUrl(e.target.value)}
              placeholder="https://... ou carregue um arquivo"
              className="flex-1"
            />
            <Button type="button" variant="outline" onClick={() => heroBannerInputRef.current?.click()}>
              Carregar arquivo
            </Button>
            <input
              ref={heroBannerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleHeroBannerFile}
            />
          </div>
          {heroBannerUrl.startsWith("data:") && (
            <p className="mt-1 text-xs text-muted-foreground">Arquivo carregado localmente.</p>
          )}
        </div>
        {heroBannerUrl && (
          <div className="space-y-3">
            <div
              className="relative flex h-28 items-start overflow-hidden rounded-2xl p-6"
              style={{ backgroundImage: `url(${heroBannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
            >
              <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(0,0,0,0.60) 0%, rgba(0,0,0,0.35) 100%)" }} />
              <div className="relative z-10">
                <div className="text-xs font-medium text-white/80">Copa do Mundo FIFA 2026</div>
                <div className="text-xl font-extrabold text-white">Bem-vindo à Vivicopa</div>
                <div className="mt-2 flex gap-2">
                  <span className="rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-brand-dark">Ver jogos</span>
                  <span className="rounded-md border border-white/40 bg-white/10 px-2 py-0.5 text-xs font-semibold text-white">Dar meu palpite</span>
                </div>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={removerHeroBanner}>Remover banner</Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Clique em "Salvar configurações" no painel acima para aplicar.
        </p>
      </div>
    </div>
    </div>
  );
}

function TabTrigger({ value, icon, children }: { value: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <TabsTrigger value={value} className="gap-1.5 data-[state=active]:bg-gradient-brand data-[state=active]:text-white data-[state=active]:shadow-brand">
      {icon}
      <span className="text-sm">{children}</span>
    </TabsTrigger>
  );
}

// ---------- HOOK: jogos de hoje + ao vivo via Supabase ----------
type PartidaDestaque = {
  id: string;
  time_a: string;
  time_b: string;
  placar_a: number;
  placar_b: number;
  status: string;
  inicia_em: string | null;
};

function useJogosHoje() {
  const [jogosHoje, setJogosHoje] = useState<PartidaDestaque[]>([]);
  const [tituloSecao, setTituloSecao] = useState("Jogos de Hoje");
  const [flagMap, setFlagMap] = useState<Record<string, string>>({});

  const fetchJogos = useCallback(async () => {
    try {
      const sb = supabase as any;
      // Janela "hoje" em horário de Brasília (UTC-3)
      const brasiliaHoje = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const inicioHoje = new Date(brasiliaHoje + "T03:00:00.000Z");
      const fimHoje = new Date(inicioHoje.getTime() + 24 * 60 * 60 * 1000);

      const { data: hoje } = await sb
        .from("partidas")
        .select("id, time_a, time_b, placar_a, placar_b, status, inicia_em")
        .gte("inicia_em", inicioHoje.toISOString())
        .lt("inicia_em", fimHoje.toISOString())
        .order("inicia_em", { ascending: true });

      if (hoje && hoje.length > 0) {
        setJogosHoje(hoje as PartidaDestaque[]);
        setTituloSecao("Jogos de Hoje");
        return;
      }

      // Sem jogos hoje: pega os próximos 3 jogos
      const { data: proximos } = await sb
        .from("partidas")
        .select("id, time_a, time_b, placar_a, placar_b, status, inicia_em")
        .in("status", ["NS"])
        .gte("inicia_em", new Date().toISOString())
        .order("inicia_em", { ascending: true })
        .limit(3);

      setJogosHoje((proximos as PartidaDestaque[] | null) ?? []);
      setTituloSecao("Próximos Jogos");
    } catch {
      setJogosHoje([]);
    }
  }, []);

  useEffect(() => {
    (supabase as any)
      .from("selecoes")
      .select("nome, area_bandeira, escudo_url")
      .then(({ data }: { data: { nome: string; area_bandeira: string | null; escudo_url: string | null }[] | null }) => {
        if (!data) return;
        const map: Record<string, string> = {};
        data.forEach((s) => { map[s.nome] = s.area_bandeira ?? s.escudo_url ?? ""; });
        setFlagMap(map);
      })
      .catch(() => {});

    fetchJogos();

    const ch = (supabase as any)
      .channel("jogos-hoje")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "partidas" }, fetchJogos)
      .subscribe();

    return () => { (supabase as any).removeChannel(ch); };
  }, [fetchJogos]);

  return { jogosHoje, tituloSecao, flagMap };
}

function JogoRow({ jogo, flagMap }: { jogo: PartidaDestaque; flagMap: Record<string, string> }) {
  const isLive = jogo.status === "LIVE" || jogo.status === "HT";
  const isFinished = ["FT", "AET", "PEN"].includes(jogo.status);
  const hora = jogo.inicia_em
    ? new Date(jogo.inicia_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })
    : "";

  return (
    <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 ${isLive ? "bg-red-50 ring-1 ring-red-200" : "bg-muted/40"}`}>
      <div className="w-12 flex-shrink-0 text-center">
        {isLive ? (
          <div className="flex items-center justify-center gap-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
            </span>
            <span className="text-[10px] font-bold text-red-500">{jogo.status === "HT" ? "HT" : "LIVE"}</span>
          </div>
        ) : (
          <span className={`text-xs font-medium ${isFinished ? "text-muted-foreground" : "text-brand"}`}>{hora}</span>
        )}
      </div>

      <div className="flex flex-1 items-center justify-end gap-2">
        <span className={`truncate text-xs font-semibold ${isFinished ? "text-muted-foreground" : "text-foreground"}`}>{jogo.time_a}</span>
        {flagMap[jogo.time_a] ? (
          <img src={flagMap[jogo.time_a]} alt={jogo.time_a} className="h-8 w-12 flex-shrink-0 rounded object-cover ring-1 ring-border" />
        ) : (
          <div className="h-8 w-12 flex-shrink-0 rounded bg-brand-soft" />
        )}
      </div>

      <div className="w-14 flex-shrink-0 text-center">
        {isLive || isFinished ? (
          <span className={`text-sm font-extrabold tabular-nums ${isLive ? "text-red-500" : "text-muted-foreground"}`}>
            {jogo.placar_a} – {jogo.placar_b}
          </span>
        ) : (
          <span className="text-xs font-bold text-muted-foreground">vs</span>
        )}
      </div>

      <div className="flex flex-1 items-center gap-2">
        {flagMap[jogo.time_b] ? (
          <img src={flagMap[jogo.time_b]} alt={jogo.time_b} className="h-8 w-12 flex-shrink-0 rounded object-cover ring-1 ring-border" />
        ) : (
          <div className="h-8 w-12 flex-shrink-0 rounded bg-brand-soft" />
        )}
        <span className={`truncate text-xs font-semibold ${isFinished ? "text-muted-foreground" : "text-foreground"}`}>{jogo.time_b}</span>
      </div>
    </div>
  );
}

// ---------- INÍCIO ----------
function Inicio({ palpites, onJogos, onPalpite }: { palpites: Palpite[]; onJogos: () => void; onPalpite: () => void }) {
  const [heroBannerUrl, setHeroBannerUrl] = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem(HERO_BANNER_KEY) ?? "") : "",
  );

  useEffect(() => {
    const sync = () => setHeroBannerUrl(localStorage.getItem(HERO_BANNER_KEY) ?? "");
    window.addEventListener("vivicopa:logo-changed", sync);
    return () => window.removeEventListener("vivicopa:logo-changed", sync);
  }, []);

  const { jogosHoje, tituloSecao, flagMap } = useJogosHoje();

  const proximo = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    return [...jogos].sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))
      .find((j) => j.data >= hoje) ?? jogos[0];
  }, []);
  const pa = getSelecao(proximo.selecaoA);
  const pb = getSelecao(proximo.selecaoB);

  return (
    <div className="space-y-6">
      <div
        className={`relative overflow-hidden rounded-3xl p-8 text-white shadow-brand ${heroBannerUrl ? "" : "bg-gradient-hero"}`}
        style={heroBannerUrl ? { backgroundImage: `url(${heroBannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      >
        {heroBannerUrl && (
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(0,0,0,0.60) 0%, rgba(0,0,0,0.35) 100%)" }} />
        )}
        <div className="relative z-10 pb-12">
          <div className="flex items-center gap-2 text-sm font-medium opacity-90">
            <Trophy className="h-4 w-4" /> Copa do Mundo FIFA 2026
          </div>
          <h1 className="mt-2 text-4xl font-extrabold leading-tight md:text-5xl">Bem-vindo à Vivicopa</h1>
          <p className="mt-2 max-w-xl text-white/90">
            Vamos palpitar juntos!
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={onJogos} className="bg-white text-brand-dark hover:bg-white/90">Ver jogos</Button>
            <Button onClick={onPalpite} variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20">
              Dar meu palpite
            </Button>
          </div>
        </div>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden py-2"
          style={{
            maskImage: "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
          }}
        >
          <div
            className="flex gap-2"
            style={{ animation: "vivicopa-marquee 50s linear infinite", width: "max-content" }}
          >
            {[...selecoes, ...selecoes].map((s, i) => (
              <img
                key={`${s.id}-${i}`}
                src={flagUrl(s.id, 80)}
                alt=""
                className="h-5 w-8 flex-shrink-0 rounded-sm object-cover opacity-35 ring-1 ring-white/30"
                loading="lazy"
              />
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand">
          <MapPin className="h-3.5 w-3.5" /> Países-sede da Copa 2026
        </div>
        <div className="grid grid-cols-3 gap-3">
          {PAISES_SEDE.map((p) => (
            <div key={p.id} className="flex flex-col items-center gap-2 rounded-xl bg-brand-soft p-3 text-center">
              <img src={flagUrl(p.id, 160)} alt={flagAlt(p.id)} className="h-14 w-20 rounded-md object-cover shadow-md ring-1 ring-border" />
              <div className="text-sm font-bold text-brand-dark">{p.nome}</div>
              <Badge className="bg-gradient-brand text-[10px] text-white hover:opacity-90">Anfitrião</Badge>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Seleções" value={selecoes.length} />
        <StatCard label="Jogos (fase de grupos)" value={jogos.length} />
        <StatCard label="Palpites cadastrados" value={palpites.length} />
        <StatCard label="Grupos" value={grupos.length} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand">{tituloSecao}</span>
          {jogosHoje.some((j) => j.status === "LIVE" || j.status === "HT") && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-red-500">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
              </span>
              Ao vivo
            </span>
          )}
        </div>
        {jogosHoje.length > 0 ? (
          <div className="flex flex-col gap-2">
            {jogosHoje.map((j) => <JogoRow key={j.id} jogo={j} flagMap={flagMap} />)}
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex flex-col items-center text-center">
              <img src={flagUrl(proximo.selecaoA, 160)} alt={flagAlt(proximo.selecaoA)} className="h-16 w-24 rounded-md object-cover shadow-md ring-1 ring-border" />
              <div className="mt-2 text-sm font-bold text-brand-dark">{pa?.nome}</div>
            </div>
            <div className="text-center text-xs text-muted-foreground">
              <div className="text-lg font-extrabold text-brand">vs</div>
              <div className="mt-1">{proximo.data}</div>
              <div>{proximo.hora}</div>
              <div className="mt-1 max-w-[140px] text-[11px]">{proximo.estadio}</div>
            </div>
            <div className="flex flex-col items-center text-center">
              <img src={flagUrl(proximo.selecaoB, 160)} alt={flagAlt(proximo.selecaoB)} className="h-16 w-24 rounded-md object-cover shadow-md ring-1 ring-border" />
              <div className="mt-2 text-sm font-bold text-brand-dark">{pb?.nome}</div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand">
          <Flag className="h-3.5 w-3.5" /> Seleções participantes
        </div>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-12">
          {selecoes.map((s) => (
            <div key={s.id} className="flex flex-col items-center gap-1" title={s.nome}>
              <img src={flagUrl(s.id, 80)} alt={flagAlt(s.id)} loading="lazy" className="h-8 w-12 rounded-sm object-cover ring-1 ring-border" />
              <div className="truncate text-[10px] text-muted-foreground">{s.nome}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="text-3xl font-extrabold text-brand-dark">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

// ---------- JOGOS ----------
function JogosTab({ palpitesPorJogo, onPalpitar, onComentarios, grupoInicial = "todos", onConsumirGrupo }: {
  palpitesPorJogo: Map<string, number>;
  onPalpitar: (j: Jogo) => void;
  onComentarios: (j: Jogo) => void;
  grupoInicial?: string;
  onConsumirGrupo?: () => void;
}) {
  const [filtroGrupo, setFiltroGrupo] = useState(grupoInicial);
  const [filtroData, setFiltroData] = useState("");
  const [filtroSelecao, setFiltroSelecao] = useState("todas");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  useEffect(() => {
    if (grupoInicial && grupoInicial !== "todos") {
      setFiltroGrupo(grupoInicial);
      onConsumirGrupo?.();
    }
  }, [grupoInicial, onConsumirGrupo]);

  const lista = useMemo(() => {
    return jogos.filter((j) => {
      if (filtroGrupo !== "todos" && j.grupo !== filtroGrupo) return false;
      if (filtroData && j.data !== filtroData) return false;
      if (filtroSelecao !== "todas" && j.selecaoA !== filtroSelecao && j.selecaoB !== filtroSelecao) return false;
      const tem = (palpitesPorJogo.get(j.id) ?? 0) > 0;
      if (filtroStatus === "com" && !tem) return false;
      if (filtroStatus === "sem" && tem) return false;
      return true;
    }).sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
  }, [filtroGrupo, filtroData, filtroSelecao, filtroStatus, palpitesPorJogo]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-3 shadow-card md:grid-cols-4">
        <div>
          <Label className="text-xs">Grupo</Label>
          <Select value={filtroGrupo} onValueChange={setFiltroGrupo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {grupos.map((g) => <SelectItem key={g} value={g}>Grupo {g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Data</Label>
          <Input type="date" value={filtroData} onChange={(e) => setFiltroData(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Seleção</Label>
          <Select value={filtroSelecao} onValueChange={setFiltroSelecao}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="todas">Todas</SelectItem>
              {selecoes.map((s) => <SelectItem key={s.id} value={s.id}>{s.bandeiraEmoji} {s.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="com">Com palpite</SelectItem>
              <SelectItem value="sem">Sem palpite</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {lista.map((j) => (
          <GameCard key={j.id} jogo={j} qtdPalpites={palpitesPorJogo.get(j.id) ?? 0}
            onPalpitar={onPalpitar} onComentarios={onComentarios} />
        ))}
        {lista.length === 0 && <div className="col-span-full py-10 text-center text-muted-foreground">Nenhum jogo encontrado com esses filtros.</div>}
      </div>
    </div>
  );
}

// ---------- SELEÇÕES ----------
function SelecoesTab({ onAbrir }: { onAbrir: (s: Selecao) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {selecoes.map((s) => {
        const st = getStats(s.id);
        return (
          <div key={s.id} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:shadow-brand">
            <div className="flex items-center justify-center bg-brand-soft p-4">
              <img src={flagUrl(s.id, 160)} alt={flagAlt(s.id)} loading="lazy" className="h-20 w-32 rounded-md object-cover shadow-md ring-1 ring-border" />
            </div>
            <div className="flex flex-1 flex-col p-4">
              <div className="font-bold text-brand-dark">{s.nome}</div>
              <Badge className="mt-1 w-fit bg-brand-light text-brand-dark hover:bg-brand-light">Grupo {s.grupo}</Badge>
              <div className="mt-2 text-xs text-muted-foreground">Técnico: {s.tecnico}</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-md bg-brand-soft/70 p-1.5">
                  <div className="text-sm font-extrabold text-brand-dark">{st.participacoes}</div>
                  <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Copas</div>
                </div>
                <div className="rounded-md bg-brand-soft/70 p-1.5">
                  <div className="flex items-center justify-center gap-0.5 text-sm font-extrabold text-brand-dark">
                    <Trophy className="h-3 w-3 text-brand" />{st.titulos}
                  </div>
                  <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Títulos</div>
                </div>
              </div>
              <Button onClick={() => onAbrir(s)} className="mt-3 bg-gradient-brand text-white hover:opacity-90">Ver elenco</Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- HOOK: classificação ao vivo por grupo ----------
type EntradaClassificacao = {
  nome: string;
  j: number; v: number; e: number; d: number;
  gp: number; gc: number; sg: number; pts: number;
};

function useClassificacaoGrupos() {
  const [partidasGrupo, setPartidasGrupo] = useState<Array<{
    time_a: string; time_b: string; placar_a: number; placar_b: number; status: string; grupo: string;
  }>>([]);
  const [flagMapGrupos, setFlagMapGrupos] = useState<Record<string, string>>({});

  const fetchPartidasGrupo = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("partidas")
      .select("time_a,time_b,placar_a,placar_b,status,grupo")
      .not("grupo", "is", null);
    setPartidasGrupo(data ?? []);
  }, []);

  useEffect(() => {
    (supabase as any)
      .from("selecoes")
      .select("nome,area_bandeira,escudo_url")
      .then(({ data }: { data: { nome: string; area_bandeira: string | null; escudo_url: string | null }[] | null }) => {
        if (!data) return;
        const map: Record<string, string> = {};
        data.forEach((s) => { map[s.nome] = s.area_bandeira ?? s.escudo_url ?? ""; });
        setFlagMapGrupos(map);
      });

    fetchPartidasGrupo();

    const ch = (supabase as any)
      .channel("classificacao-grupos")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "partidas" }, fetchPartidasGrupo)
      .subscribe();

    return () => { (supabase as any).removeChannel(ch); };
  }, [fetchPartidasGrupo]);

  const classificacaoPorGrupo = useMemo(() => {
    const FINISHED = new Set(["FT", "AET", "PEN"]);
    const tabelas: Record<string, Record<string, EntradaClassificacao>> = {};

    for (const p of partidasGrupo) {
      if (!p.grupo) continue;
      if (!tabelas[p.grupo]) tabelas[p.grupo] = {};
      for (const nome of [p.time_a, p.time_b]) {
        if (!tabelas[p.grupo][nome])
          tabelas[p.grupo][nome] = { nome, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0, pts: 0 };
      }
      if (!FINISHED.has(p.status)) continue;
      const a = tabelas[p.grupo][p.time_a];
      const b = tabelas[p.grupo][p.time_b];
      a.j++; b.j++;
      a.gp += p.placar_a; a.gc += p.placar_b;
      b.gp += p.placar_b; b.gc += p.placar_a;
      a.sg = a.gp - a.gc; b.sg = b.gp - b.gc;
      if (p.placar_a > p.placar_b) { a.v++; a.pts += 3; b.d++; }
      else if (p.placar_b > p.placar_a) { b.v++; b.pts += 3; a.d++; }
      else { a.e++; a.pts++; b.e++; b.pts++; }
    }

    const sorted: Record<string, EntradaClassificacao[]> = {};
    for (const [grupo, tabela] of Object.entries(tabelas)) {
      sorted[grupo] = Object.values(tabela).sort((x, y) =>
        y.pts !== x.pts ? y.pts - x.pts : y.sg !== x.sg ? y.sg - x.sg : y.gp - x.gp
      );
    }
    return sorted;
  }, [partidasGrupo]);

  return { classificacaoPorGrupo, flagMapGrupos };
}

// ---------- GRUPOS ----------
function GruposTab({ onVerJogos }: { onVerJogos: (grupo: string) => void }) {
  const { classificacaoPorGrupo, flagMapGrupos } = useClassificacaoGrupos();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {grupos.map((g) => {
        const tabela = classificacaoPorGrupo[`GROUP_${g}`] ?? [];
        return (
          <div key={g} className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-lg font-extrabold text-brand-dark">Grupo {g}</div>
              <Badge className="bg-brand-light text-brand-dark hover:bg-brand-light">{tabela.length || 4} seleções</Badge>
            </div>

            <div className="mb-1 grid grid-cols-[1.25rem_1fr_1.75rem_1.75rem_1.75rem_2rem] items-center gap-x-1 px-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span>#</span>
              <span>Seleção</span>
              <span className="text-center">J</span>
              <span className="text-center">SG</span>
              <span className="text-center">GP</span>
              <span className="text-center font-bold">Pts</span>
            </div>

            <ul className="space-y-1">
              {tabela.map((entry, idx) => (
                <li
                  key={entry.nome}
                  className={`grid grid-cols-[1.25rem_1fr_1.75rem_1.75rem_1.75rem_2rem] items-center gap-x-1 rounded-lg px-2 py-1.5 text-xs ${
                    idx < 2 ? "bg-green-50 ring-1 ring-green-100" : "bg-brand-soft/40"
                  }`}
                >
                  <span className={`text-center text-[10px] font-bold ${idx < 2 ? "text-green-600" : "text-muted-foreground"}`}>
                    {idx + 1}
                  </span>
                  <div className="flex min-w-0 items-center gap-1.5">
                    {flagMapGrupos[entry.nome] ? (
                      <img src={flagMapGrupos[entry.nome]} alt={entry.nome} className="h-4 w-6 flex-shrink-0 rounded-sm object-cover ring-1 ring-border" />
                    ) : (
                      <div className="h-4 w-6 flex-shrink-0 rounded-sm bg-muted" />
                    )}
                    <span className="truncate font-medium">{entry.nome}</span>
                  </div>
                  <span className="text-center text-[11px]">{entry.j}</span>
                  <span className="text-center text-[11px]">{entry.sg > 0 ? `+${entry.sg}` : entry.sg}</span>
                  <span className="text-center text-[11px]">{entry.gp}</span>
                  <span className={`text-center text-[11px] font-extrabold tabular-nums ${entry.pts > 0 ? "text-brand" : ""}`}>
                    {entry.pts}
                  </span>
                </li>
              ))}
            </ul>

            <Button onClick={() => onVerJogos(g)} variant="outline" className="mt-3 w-full text-xs">
              Ver jogos do grupo
            </Button>
          </div>
        );
      })}
    </div>
  );
}

// ---------- MEUS PALPITES ----------
function MeusPalpitesTab({ palpites, onEditar, onExcluir }: {
  palpites: Palpite[];
  onEditar: (p: Palpite) => void;
  onExcluir: (id: string) => void;
}) {
  const [nome, setNome] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("vivicopa:usuario") ?? "" : ""));
  const meus = palpites.filter((p) => p.usuario.toLowerCase() === nome.trim().toLowerCase());

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <Label htmlFor="nome">Seu nome</Label>
        <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Digite seu nome para ver seus palpites" />
      </div>

      {nome.trim() === "" ? (
        <div className="py-10 text-center text-muted-foreground">Informe seu nome para ver seus palpites.</div>
      ) : meus.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground">Você ainda não fez palpites.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {meus.map((p) => {
            const j = jogos.find((x) => x.id === p.jogoId);
            const a = getSelecao(p.selecaoA);
            const b = getSelecao(p.selecaoB);
            return (
              <div key={p.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <Badge className="bg-brand-light text-brand-dark hover:bg-brand-light">Grupo {j?.grupo}</Badge>
                  <span className="text-muted-foreground">{new Date(p.dataCriacao).toLocaleDateString("pt-BR")}</span>
                </div>
                <div className="flex items-center justify-around text-center">
                  <PalpiteTime selecaoId={p.selecaoA} nome={a?.nome} />
                  <div className="text-2xl font-extrabold text-brand">{p.placarA} x {p.placarB}</div>
                  <PalpiteTime selecaoId={p.selecaoB} nome={b?.nome} />
                </div>
                {p.comentario && <div className="mt-2 rounded-lg bg-brand-soft p-2 text-sm italic">"{p.comentario}"</div>}
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => onEditar(p)}>Editar</Button>
                  <Button size="sm" variant="destructive" className="flex-1" onClick={() => onExcluir(p.id)}>Excluir</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- TABELA ----------
function TabelaTab({ palpites }: { palpites: Palpite[] }) {
  const [fUsuario, setFUsuario] = useState("");
  const [fGrupo, setFGrupo] = useState("todos");
  const [fSelecao, setFSelecao] = useState("todas");
  const [fJogo, setFJogo] = useState("todos");

  const lista = useMemo(() => {
    return palpites.filter((p) => {
      const j = jogos.find((x) => x.id === p.jogoId);
      if (!j) return false;
      if (fUsuario && !p.usuario.toLowerCase().includes(fUsuario.toLowerCase())) return false;
      if (fGrupo !== "todos" && j.grupo !== fGrupo) return false;
      if (fSelecao !== "todas" && p.selecaoA !== fSelecao && p.selecaoB !== fSelecao) return false;
      if (fJogo !== "todos" && p.jogoId !== fJogo) return false;
      return true;
    }).sort((a, b) => b.dataCriacao.localeCompare(a.dataCriacao));
  }, [palpites, fUsuario, fGrupo, fSelecao, fJogo]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-3 shadow-card md:grid-cols-4">
        <div>
          <Label className="text-xs">Usuário</Label>
          <Input value={fUsuario} onChange={(e) => setFUsuario(e.target.value)} placeholder="Buscar nome..." />
        </div>
        <div>
          <Label className="text-xs">Grupo</Label>
          <Select value={fGrupo} onValueChange={setFGrupo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {grupos.map((g) => <SelectItem key={g} value={g}>Grupo {g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Seleção</Label>
          <Select value={fSelecao} onValueChange={setFSelecao}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="todas">Todas</SelectItem>
              {selecoes.map((s) => <SelectItem key={s.id} value={s.id}>{s.bandeiraEmoji} {s.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Jogo</Label>
          <Select value={fJogo} onValueChange={setFJogo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="todos">Todos</SelectItem>
              {jogos.map((j) => {
                const a = getSelecao(j.selecaoA); const b = getSelecao(j.selecaoB);
                return <SelectItem key={j.id} value={j.id}>{a?.nome} x {b?.nome}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-gradient-brand text-white">
            <tr className="text-left">
              <Th>Usuário</Th><Th>Grupo</Th><Th>Jogo</Th><Th>Data</Th>
              <Th>Palpite</Th><Th>Comentário</Th><Th>Registro</Th>
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => {
              const j = jogos.find((x) => x.id === p.jogoId);
              const a = getSelecao(p.selecaoA); const b = getSelecao(p.selecaoB);
              return (
                <tr key={p.id} className="border-t border-border odd:bg-brand-soft/50">
                  <Td className="font-semibold">{p.usuario}</Td>
                  <Td>{j?.grupo}</Td>
                  <Td>
                    <div className="flex min-w-[240px] flex-wrap items-center gap-1.5">
                      <TabelaTime selecaoId={p.selecaoA} nome={a?.nome} />
                      <span className="px-0.5 text-xs font-semibold text-muted-foreground">x</span>
                      <TabelaTime selecaoId={p.selecaoB} nome={b?.nome} />
                    </div>
                  </Td>
                  <Td>{j?.data}</Td>
                  <Td className="font-bold text-brand">{p.placarA} x {p.placarB}</Td>
                  <Td className="max-w-[200px] truncate italic text-muted-foreground">{p.comentario || "—"}</Td>
                  <Td className="text-xs text-muted-foreground">{new Date(p.dataCriacao).toLocaleDateString("pt-BR")}</Td>
                </tr>
              );
            })}
            {lista.length === 0 && (
              <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">Nenhum palpite ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PalpiteTime({ selecaoId, nome }: { selecaoId: string; nome?: string }) {
  const src = flagUrl(selecaoId, 160);

  return (
    <div className="flex w-24 flex-col items-center gap-1.5">
      {src ? (
        <img
          src={src}
          alt={flagAlt(selecaoId)}
          className="h-8 w-11 rounded-[3px] border border-border object-cover shadow-sm"
          loading="lazy"
        />
      ) : (
        <div className="h-8 w-11 rounded-[3px] border border-dashed border-border bg-brand-soft" />
      )}
      <div className="max-w-full truncate text-xs font-semibold">{nome ?? selecaoId}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide">{children}</th>;
}

function TabelaTime({ selecaoId, nome }: { selecaoId: string; nome?: string }) {
  const src = flagUrl(selecaoId, 80);

  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {src && (
        <img
          src={src}
          alt={flagAlt(selecaoId)}
          className="h-3.5 w-5 rounded-[2px] border border-border object-cover shadow-sm"
          loading="lazy"
        />
      )}
      <span>{nome ?? selecaoId}</span>
    </span>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}

// ---------- COMENTÁRIOS ----------
function ComentariosTab({ palpites }: { palpites: Palpite[] }) {
  const [fJogo, setFJogo] = useState("todos");
  const [fUsuario, setFUsuario] = useState("");
  const com = palpites.filter((p) => p.comentario && p.comentario.trim() !== "");
  const lista = com.filter((p) => {
    if (fJogo !== "todos" && p.jogoId !== fJogo) return false;
    if (fUsuario && !p.usuario.toLowerCase().includes(fUsuario.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 rounded-2xl border border-border bg-card p-3 shadow-card md:grid-cols-2">
        <div>
          <Label className="text-xs">Usuário</Label>
          <Input value={fUsuario} onChange={(e) => setFUsuario(e.target.value)} placeholder="Buscar nome..." />
        </div>
        <div>
          <Label className="text-xs">Jogo</Label>
          <Select value={fJogo} onValueChange={setFJogo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="todos">Todos</SelectItem>
              {jogos.map((j) => {
                const a = getSelecao(j.selecaoA); const b = getSelecao(j.selecaoB);
                return <SelectItem key={j.id} value={j.id}>{a?.nome} x {b?.nome}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        {lista.map((p) => {
          const j = jogos.find((x) => x.id === p.jogoId);
          const a = getSelecao(p.selecaoA); const b = getSelecao(p.selecaoB);
          return (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center justify-between text-xs">
                <div className="font-semibold text-brand-dark">{p.usuario}</div>
                <div className="text-muted-foreground">{new Date(p.dataCriacao).toLocaleDateString("pt-BR")}</div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Grupo {j?.grupo} · {a?.bandeiraEmoji} {a?.nome} x {b?.nome} {b?.bandeiraEmoji}
              </div>
              <div className="mt-2 rounded-lg bg-brand-soft p-3 text-sm italic">"{p.comentario}"</div>
            </div>
          );
        })}
        {lista.length === 0 && <div className="py-10 text-center text-muted-foreground">Nenhum comentário ainda.</div>}
      </div>
    </div>
  );
}

function ComentariosJogo({ jogo, palpites }: { jogo: Jogo; palpites: Palpite[] }) {
  const lista = palpites.filter((p) => p.jogoId === jogo.id && p.comentario && p.comentario.trim() !== "");
  if (lista.length === 0) return <div className="py-6 text-center text-muted-foreground">Sem comentários ainda.</div>;
  return (
    <div className="space-y-2">
      {lista.map((p) => (
        <div key={p.id} className="rounded-lg border border-border p-3">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-brand-dark">{p.usuario}</span>
            <span className="text-muted-foreground">{p.placarA} x {p.placarB}</span>
          </div>
          <div className="mt-1 text-sm italic">"{p.comentario}"</div>
        </div>
      ))}
    </div>
  );
}

// ---------- CALENDÁRIO ----------
function CalendarioTab({ palpitesPorJogo, onPalpitar, onComentarios }: {
  palpitesPorJogo: Map<string, number>;
  onPalpitar: (j: Jogo) => void;
  onComentarios: (j: Jogo) => void;
}) {
  const porDia = useMemo(() => {
    const map = new Map<string, Jogo[]>();
    [...jogos]
      .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))
      .forEach((j) => {
        const arr = map.get(j.data) ?? [];
        arr.push(j);
        map.set(j.data, arr);
      });
    return Array.from(map.entries());
  }, []);

  const hojeIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand">
          <CalendarDays className="h-3.5 w-3.5" /> Calendário completo da fase de grupos
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Todos os horários em horário de Brasília.</p>
      </div>

      {porDia.map(([data, lista]) => {
        const isHoje = data === hojeIso;
        const isPassado = data < hojeIso;
        return (
          <div key={data} className="space-y-3">
            <div className={`sticky top-0 z-10 flex items-center gap-2 rounded-xl px-4 py-2 shadow-card ${isHoje ? "bg-gradient-brand text-white" : isPassado ? "bg-muted text-muted-foreground" : "bg-card text-brand-dark"}`}>
              <CalendarDays className="h-4 w-4" />
              <div className="text-sm font-bold capitalize">{formatarDataLonga(data)}</div>
              <Badge className={`ml-auto ${isHoje ? "bg-white/20 text-white hover:bg-white/20" : "bg-brand-light text-brand-dark hover:bg-brand-light"}`}>
                {lista.length} {lista.length === 1 ? "jogo" : "jogos"}
              </Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {lista.map((j) => {
                const a = getSelecao(j.selecaoA); const b = getSelecao(j.selecaoB);
                return (
                  <div key={j.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-card">
                    <div className="text-center">
                      <div className="text-base font-extrabold text-brand">{j.hora}</div>
                      <Badge className="bg-brand-light text-[10px] text-brand-dark hover:bg-brand-light">G {j.grupo}</Badge>
                    </div>
                    <div className="flex flex-1 items-center justify-center gap-2 text-sm">
                      <div className="flex flex-col items-center text-center">
                        <img src={flagUrl(j.selecaoA, 80)} alt={flagAlt(j.selecaoA)} className="h-7 w-10 rounded-sm object-cover ring-1 ring-border" />
                        <div className="mt-1 text-[11px] font-semibold">{a?.nome}</div>
                      </div>
                      <span className="text-xs text-muted-foreground">x</span>
                      <div className="flex flex-col items-center text-center">
                        <img src={flagUrl(j.selecaoB, 80)} alt={flagAlt(j.selecaoB)} className="h-7 w-10 rounded-sm object-cover ring-1 ring-border" />
                        <div className="mt-1 text-[11px] font-semibold">{b?.nome}</div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground" title={`${j.estadio} — ${j.cidade}`}>
                        <MapPin className="h-3 w-3 text-brand" />
                        <span className="max-w-[110px] truncate">{j.cidade}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => onPalpitar(j)}>Palpitar</Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => onComentarios(j)} aria-label="Comentários">
                          <MessageSquare className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {(palpitesPorJogo.get(j.id) ?? 0) > 0 && (
                        <span className="text-[10px] font-semibold text-brand">{palpitesPorJogo.get(j.id)} palpite(s)</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatarDataLonga(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, day));
  return date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
}

// ---------- TÍTULOS ----------
function TitulosTab() {
  const ranking = useMemo(() => {
    return [...selecoes]
      .map((s) => ({ s, ...getStats(s.id) }))
      .sort((a, b) => b.titulos - a.titulos || b.participacoes - a.participacoes || a.s.nome.localeCompare(b.s.nome));
  }, []);
  const maxTit = Math.max(1, ...ranking.map((r) => r.titulos));
  const campeas = ranking.filter((r) => r.titulos > 0);
  const totalTitulos = campeas.reduce((acc, r) => acc + r.titulos, 0);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand">
          <Trophy className="h-3.5 w-3.5" /> Títulos de Copa do Mundo
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Ranking histórico de títulos das 48 seleções da Copa 2026. {campeas.length} já foram campeãs, somando {totalTitulos} taças.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-4 text-sm font-bold text-brand-dark">Gráfico de títulos</div>
        <div className="space-y-2">
          {ranking.map((r) => {
            const pct = (r.titulos / maxTit) * 100;
            return (
              <div key={r.s.id} className="flex items-center gap-2">
                <img src={flagUrl(r.s.id, 80)} alt={flagAlt(r.s.id)} className="h-5 w-7 rounded-sm object-cover ring-1 ring-border" />
                <div className="w-32 truncate text-xs font-semibold text-brand-dark">{r.s.nome}</div>
                <div className="relative flex-1 h-5 rounded-full bg-brand-soft overflow-hidden">
                  {r.titulos > 0 && (
                    <div
                      className="h-full rounded-full bg-gradient-brand transition-all"
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  )}
                </div>
                <div className="w-10 text-right text-xs font-extrabold text-brand-dark tabular-nums">{r.titulos}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-3 text-sm font-bold text-brand-dark">Participações em Copas do Mundo</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gradient-brand text-white">
              <tr className="text-left">
                <Th>#</Th><Th>Seleção</Th><Th>Grupo</Th><Th>Participações</Th><Th>Títulos</Th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, i) => (
                <tr key={r.s.id} className="border-t border-border odd:bg-brand-soft/50">
                  <Td className="font-semibold">{i + 1}</Td>
                  <Td>
                    <span className="flex items-center gap-2">
                      <img src={flagUrl(r.s.id, 80)} alt={flagAlt(r.s.id)} className="h-5 w-7 rounded-sm object-cover ring-1 ring-border" />
                      <span className="font-semibold">{r.s.nome}</span>
                    </span>
                  </Td>
                  <Td>{r.s.grupo}</Td>
                  <Td className="font-bold">{r.participacoes}</Td>
                  <Td className="font-extrabold text-brand">
                    <span className="inline-flex items-center gap-1">
                      {r.titulos > 0 && <Trophy className="h-3.5 w-3.5" />}{r.titulos}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

