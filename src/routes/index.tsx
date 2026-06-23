import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  Trophy,
  Flag,
  Users,
  MessageSquare,
  Calendar,
  ListChecks,
  Table as TableIcon,
  Home as HomeIcon,
  CalendarDays,
  MapPin,
  Award,
  GitBranch,
  Shield,
  KeyRound,
  UserPlus,
  ImageIcon,
  RefreshCw,
  Save,
  Trash2,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";

import { Header } from "@/components/vivicopa/Header";
import { Footer } from "@/components/vivicopa/Footer";
import { GameCard, type GameResult } from "@/components/vivicopa/GameCard";
import { PredictionModal } from "@/components/vivicopa/PredictionModal";
import {
  ChaveamentoAutomatico,
  USAR_SIMULACAO_KEY,
} from "@/components/vivicopa/ChaveamentoAutomatico";
import { AdminCommentsTab } from "@/components/vivicopa/AdminCommentsTab";
import {
  AdminCronMonitorPanel,
  AdminPalpitesPanel,
  UsersTab,
} from "@/components/vivicopa/AdminSection";
import {
  CommentReplyNotificationsMenu,
  ComentariosJogo,
} from "@/components/vivicopa/CommentsSection";
import { StylizedVersus } from "@/components/vivicopa/StylizedVersus";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore, type AuthProfile } from "@/store/authStore";
import { useConfigStore } from "@/store/configStore";
import {
  useEspnBrazilPlayerTotals,
  usePartidasComPlacarAoVivo,
  useEspnTournamentScorers,
  useJogosHojeStore,
  usePartidasGrupo,
  usePartidasResultados,
  useSelecoesFlagMap,
} from "@/hooks/usePartidas";
import {
  useComentariosQuery,
  useCommentReplyNotificationsQuery,
  useMeusPalpitesQuery,
  useWinningPredictionsQuery,
  vivicopaQueryKeys,
  type WinningPrediction,
} from "@/hooks/useVivicopaQueries";
import { selecoes, jogos, grupos, getSelecao, type Jogo, type Selecao } from "@/data/worldcup2026";
import { getStats } from "@/data/selecaoStats";
import {
  isValidEmail,
  isValidUsername,
  normalizeEmail,
  normalizeUsername,
  usernameToEmail,
} from "@/lib/auth";
import { excluirPalpite, type Palpite } from "@/lib/storage";
import { flagUrl, flagAlt, flagUrlFromFifaCode } from "@/lib/flags";
import { palpiteBloqueadoParaJogo } from "@/lib/matchLock";
import { getCanonicalTeamName, resolveTeamIdByName } from "@/lib/teamNames";
import {
  buildBrazilHighlights,
  buildTournamentHighlights,
  buildTournamentHighlightsWithScorers,
  type HomeHighlightCard,
} from "@/lib/homeHighlights";
import {
  applySiteTheme,
  DEFAULT_SITE_THEME,
  HOME_SECONDARY_IMAGE_KEY,
  readSiteTheme,
  SITE_ACCENT_KEY,
  SITE_PRIMARY_KEY,
  SITE_SUBTITLE_KEY,
  SITE_SURFACE_KEY,
  SITE_TITLE_KEY,
  SITE_TITLE_TRACKING_KEY,
  storeSiteTheme,
} from "@/lib/siteTheme";
import { isFinishedMatchStatus } from "@/lib/prediction-results";

const STORAGE_BUCKET = "imagens-app";
const STORAGE_MAX_BYTES = 5_000_000;

const LOGO_URL_KEY = "vivicopa:logo-url";
const LOGO_SIZE_KEY = "vivicopa:logo-size";
const LOGO_HEADER_SIZE_KEY = "vivicopa:logo-header-size";
const HEADER_BANNER_KEY = "vivicopa:header-banner-url";
const HERO_BANNER_KEY = "vivicopa:hero-banner-url";
const HERO_BANNER_POS_KEY = "vivicopa:hero-banner-pos";
const HERO_WASH_KEY = "vivicopa:hero-wash-intensity";
const HERO_WASH_WIDTH_KEY = "vivicopa:hero-wash-width";
const HOME_SECONDARY_POS_KEY = "vivicopa:home-secondary-pos";
const FAVICON_URL_KEY = "vivicopa:favicon-url";
const LOGIN_BACKGROUND_KEY = "vivicopa:login-background-url";

const parsePos = (s: string): { x: number; y: number } => {
  const parts = (s ?? "").split(" ").map(Number);
  return { x: isNaN(parts[0]) ? 50 : parts[0], y: isNaN(parts[1]) ? 50 : parts[1] };
};
const formatPos = (x: number, y: number) => `${x} ${y}`;
const posCSS = (s: string) => {
  const p = parsePos(s);
  return `${p.x}% ${p.y}%`;
};
const washGradient = (width: number) =>
  `linear-gradient(90deg, var(--site-surface) 0%, color-mix(in srgb, var(--site-surface) 75%, transparent) ${Math.round(width * 0.5)}%, color-mix(in srgb, var(--site-surface) 22%, transparent) ${Math.round(width * 0.8)}%, transparent ${width}%)`;

// Polling centralizado no usePartidasStore — não usar aqui

const PAISES_SEDE = [
  { id: "usa", nome: "Estados Unidos" },
  { id: "can", nome: "Canadá" },
  { id: "mex", nome: "México" },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vivicopa — Palpites da Copa 2026" },
      {
        name: "description",
        content:
          "Plataforma de palpites, comentários e seleções da Copa do Mundo FIFA 2026 para amigos e família.",
      },
      { property: "og:title", content: "Vivicopa — Palpites da Copa 2026" },
      { property: "og:description", content: "Palpites, resenhas e emoção em cada jogo." },
    ],
  }),
  component: Vivicopa,
});

function applyFavicon(url: string) {
  if (typeof document === "undefined") return;
  const selector = "link[rel='icon'][data-vivicopa='true']";
  let link = document.querySelector<HTMLLinkElement>(selector);
  if (!url) {
    link?.remove();
    return;
  }
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    link.dataset.vivicopa = "true";
    document.head.appendChild(link);
  }
  link.href = url;
}

function useConfiguredFavicon() {
  useEffect(() => {
    const sync = () => applyFavicon(localStorage.getItem(FAVICON_URL_KEY) ?? "");
    sync();
    window.addEventListener("vivicopa:favicon-changed", sync);
    window.addEventListener("vivicopa:logo-changed", sync);
    return () => {
      window.removeEventListener("vivicopa:favicon-changed", sync);
      window.removeEventListener("vivicopa:logo-changed", sync);
    };
  }, []);
}
function applyConfigToLocalStorage(cfg: Record<string, string>) {
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
  if (cfg.hero_banner_position) localStorage.setItem(HERO_BANNER_POS_KEY, cfg.hero_banner_position);
  if (cfg.hero_wash_intensity !== undefined) localStorage.setItem(HERO_WASH_KEY, String(cfg.hero_wash_intensity));
  if (cfg.hero_wash_width !== undefined) localStorage.setItem(HERO_WASH_WIDTH_KEY, String(cfg.hero_wash_width));
  if (cfg.home_secondary_image_position)
    localStorage.setItem(HOME_SECONDARY_POS_KEY, cfg.home_secondary_image_position);
  if (cfg.favicon_url !== undefined) {
    if (cfg.favicon_url) localStorage.setItem(FAVICON_URL_KEY, cfg.favicon_url);
    else localStorage.removeItem(FAVICON_URL_KEY);
  }
  if (cfg.login_background_url !== undefined) {
    if (cfg.login_background_url)
      localStorage.setItem(LOGIN_BACKGROUND_KEY, cfg.login_background_url);
    else localStorage.removeItem(LOGIN_BACKGROUND_KEY);
  }
  const themeKeys = [
    ["site_title", SITE_TITLE_KEY],
    ["site_subtitle", SITE_SUBTITLE_KEY],
    ["site_primary", SITE_PRIMARY_KEY],
    ["site_accent", SITE_ACCENT_KEY],
    ["site_surface", SITE_SURFACE_KEY],
    ["site_title_tracking", SITE_TITLE_TRACKING_KEY],
    ["home_secondary_image", HOME_SECONDARY_IMAGE_KEY],
  ] as const;
  themeKeys.forEach(([dbKey, storageKey]) => {
    if (cfg[dbKey] === undefined) return;
    if (cfg[dbKey]) localStorage.setItem(storageKey, cfg[dbKey]);
    else localStorage.removeItem(storageKey);
  });
  applySiteTheme();
  window.dispatchEvent(new CustomEvent("vivicopa:logo-changed"));
  window.dispatchEvent(new CustomEvent("vivicopa:favicon-changed"));
}

function LazyTabPanel({
  value,
  activeTab,
  children,
}: {
  value: string;
  activeTab: string;
  children: React.ReactNode;
}) {
  const [wasActive, setWasActive] = useState(false);
  useEffect(() => {
    if (activeTab === value) setWasActive(true);
  }, [activeTab, value]);
  if (!wasActive) return null;
  return <>{children}</>;
}

function Vivicopa() {
  useConfiguredFavicon();
  useEffect(() => {
    const syncTheme = () => applySiteTheme();
    syncTheme();
    window.addEventListener("vivicopa:theme-changed", syncTheme);
    return () => window.removeEventListener("vivicopa:theme-changed", syncTheme);
  }, []);

  const authStore = useAuthStore();
  const authProfile = authStore.profile;
  const authLoading = authStore.loading;
  const configStore = useConfigStore();
  const queryClient = useQueryClient();

  // Bootstrap único: init auth + config
  useEffect(() => {
    useAuthStore.getState().init();
  }, []);

  // Aplica config ao localStorage assim que carregada
  useEffect(() => {
    if (configStore.loaded) {
      applyConfigToLocalStorage(configStore.config);
    }
  }, [configStore.loaded]);

  // Carrega config após auth inicializar
  useEffect(() => {
    if (authStore.initialized) {
      useConfigStore.getState().load();
    }
  }, [authStore.initialized]);

  const [aba, setAba] = useState("inicio");
  const [modalOpen, setModalOpen] = useState(false);
  const [jogoSel, setJogoSel] = useState<Jogo | null>(null);
  const [editar, setEditar] = useState<Palpite | null>(null);
  const [comentariosJogo, setComentariosJogo] = useState<Jogo | null>(null);
  const [selecaoModal, setSelecaoModal] = useState<Selecao | null>(null);
  const [filtroGrupoInicial, setFiltroGrupoInicial] = useState<string>("todos");
  const { partidas: partidasResultados } = usePartidasResultados();
  const resultadosPorJogo = useMemo(
    () =>
      mapearPartidasPorJogos(
        partidasResultados.map((p) => ({
          ...p,
          placar_a: p.placar_a ?? 0,
          placar_b: p.placar_b ?? 0,
        })) as JogoResultado[],
      ),
    [partidasResultados],
  );
  const { data: palpites = [] } = useMeusPalpitesQuery(authProfile?.id);
  const { data: comentarios = [] } = useComentariosQuery(Boolean(authProfile?.id));
  const { data: notificacoesRespostaComentario = [] } = useCommentReplyNotificationsQuery(
    Boolean(authProfile?.id),
  );
  const { data: winningPredictions = [] } = useWinningPredictionsQuery(authProfile?.id);
  const notificacoesNaoLidas = useMemo(
    () => notificacoesRespostaComentario.filter((item) => item.lidaEm == null),
    [notificacoesRespostaComentario],
  );

  const palpitesPorJogo = useMemo(() => {
    const m = new Map<string, number>();
    palpites.forEach((p) => m.set(p.jogoId, (m.get(p.jogoId) ?? 0) + 1));
    return m;
  }, [palpites]);

  const meusAcertosPorJogo = useMemo(() => {
    const meuIds = new Set(
      winningPredictions
        .filter((item) => item.usuarioId === authProfile?.id)
        .map((item) => item.jogoId),
    );
    const m = new Map<string, Palpite>();
    palpites.forEach((p) => {
      if (meuIds.has(p.jogoId)) m.set(p.jogoId, p);
    });
    return m;
  }, [palpites, winningPredictions, authProfile?.id]);

  const acertadoresPorJogo = useMemo(() => {
    const m = new Map<string, WinningPrediction[]>();
    winningPredictions.forEach((item) => {
      m.set(item.jogoId, [...(m.get(item.jogoId) ?? []), item]);
    });
    return m;
  }, [winningPredictions]);

  const abrirPalpite = (j: Jogo, p?: Palpite) => {
    if (palpiteBloqueadoParaJogo(j, resultadosPorJogo.get(j.id))) {
      toast.error("Palpites encerrados para este jogo.");
      return;
    }
    setJogoSel(j);
    setEditar(p ?? null);
    setModalOpen(true);
  };
  const abrirComentarios = (j: Jogo) => setComentariosJogo(j);
  const abrirComentariosPorJogoId = (jogoId: string) => {
    const jogo = jogos.find((item) => item.id === jogoId);
    if (jogo) setComentariosJogo(jogo);
  };
  const atualizarComentariosENotificacoes = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: vivicopaQueryKeys.comentarios }),
      queryClient.invalidateQueries({ queryKey: vivicopaQueryKeys.notificacoesRespostaComentario }),
    ]);
  };

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
    return (
      <LoginScreen
        onLoggedIn={() => {
          /* onAuthStateChange SIGNED_IN já atualiza o store */
        }}
      />
    );
  }

  return (
    <div className="vivicopa-site flex min-h-screen flex-col bg-brand-soft">
      <Tabs value={aba} onValueChange={setAba} className="flex min-h-screen w-full flex-col">
        <Header
          username={authProfile.username}
          role={authProfile.role}
          actions={
            <CommentReplyNotificationsMenu
              notifications={notificacoesRespostaComentario}
              unreadCount={notificacoesNaoLidas.length}
              onOpenGame={abrirComentariosPorJogoId}
              onChanged={atualizarComentariosENotificacoes}
            />
          }
          mobileCenter={<HeaderMobileWidget userId={authProfile.id} />}
          onLogout={async () => {
            await supabase.auth.signOut();
            useAuthStore.getState().clear();
            setAba("inicio");
          }}
          navigation={
            <TabsList className="site-nav flex h-auto w-full flex-nowrap justify-start gap-x-5 bg-transparent p-0">
              <TabTrigger value="inicio" icon={<HomeIcon className="h-4 w-4" />}>
                Início
              </TabTrigger>
              <TabTrigger value="destaques" icon={<Trophy className="h-4 w-4" />}>
                Destaques
              </TabTrigger>
              <TabTrigger value="jogos" icon={<Calendar className="h-4 w-4" />}>
                Jogos
              </TabTrigger>
              <TabTrigger value="calendario" icon={<CalendarDays className="h-4 w-4" />}>
                Calendário
              </TabTrigger>
              <TabTrigger value="selecoes" icon={<Flag className="h-4 w-4" />}>
                Seleções
              </TabTrigger>
              <TabTrigger value="grupos" icon={<Users className="h-4 w-4" />}>
                Grupos
              </TabTrigger>
              <TabTrigger value="meus" icon={<ListChecks className="h-4 w-4" />}>
                Palpites
              </TabTrigger>
              <TabTrigger value="comentarios" icon={<MessageSquare className="h-4 w-4" />}>
                Comentários
              </TabTrigger>
              <TabTrigger value="chaveamento" icon={<GitBranch className="h-4 w-4" />}>
                Chaves
              </TabTrigger>
              <TabTrigger value="titulos" icon={<Award className="h-4 w-4" />}>
                Títulos
              </TabTrigger>
              <TabTrigger value="tabela" icon={<TableIcon className="h-4 w-4" />}>
                Tabela
              </TabTrigger>
              {authProfile.role === "admin" && (
                <>
                  <TabTrigger value="usuarios" icon={<Users className="h-4 w-4" />}>
                    Usuários
                  </TabTrigger>
                  <TabTrigger value="admin" icon={<Shield className="h-4 w-4" />}>
                    Admin
                  </TabTrigger>
                </>
              )}
            </TabsList>
          }
          mobileNavContent={(close) => {
            const tabs = [
              { value: "inicio", label: "Início", icon: <HomeIcon className="h-4 w-4" /> },
              { value: "destaques", label: "Destaques", icon: <Trophy className="h-4 w-4" /> },
              { value: "jogos", label: "Jogos", icon: <Calendar className="h-4 w-4" /> },
              {
                value: "calendario",
                label: "Calendário",
                icon: <CalendarDays className="h-4 w-4" />,
              },
              { value: "selecoes", label: "Seleções", icon: <Flag className="h-4 w-4" /> },
              { value: "grupos", label: "Grupos", icon: <Users className="h-4 w-4" /> },
              { value: "meus", label: "Palpites", icon: <ListChecks className="h-4 w-4" /> },
              {
                value: "comentarios",
                label: "Comentários",
                icon: <MessageSquare className="h-4 w-4" />,
              },
              { value: "chaveamento", label: "Chaves", icon: <GitBranch className="h-4 w-4" /> },
              { value: "titulos", label: "Títulos", icon: <Award className="h-4 w-4" /> },
              { value: "tabela", label: "Tabela", icon: <TableIcon className="h-4 w-4" /> },
              ...(authProfile.role === "admin"
                ? [
                    { value: "usuarios", label: "Usuários", icon: <Users className="h-4 w-4" /> },
                    { value: "admin", label: "Admin", icon: <Shield className="h-4 w-4" /> },
                  ]
                : []),
            ];
            return (
              <nav className="flex flex-col gap-0.5 p-4 pt-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                      aba === tab.value
                        ? "bg-gradient-brand text-white"
                        : "text-foreground hover:bg-brand-soft"
                    }`}
                    onClick={() => {
                      setAba(tab.value);
                      close();
                    }}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </nav>
            );
          }}
        />
        <main className="site-main w-full flex-1">
          <TabsContent value="inicio" className="mt-0">
            <Inicio
              palpites={palpites}
              winningPredictions={winningPredictions}
              isAdmin={authProfile.role === "admin"}
              onDestaques={() => setAba("destaques")}
              onJogos={() => setAba("jogos")}
              onPalpite={(jogo) => (jogo ? abrirPalpite(jogo) : setAba("jogos"))}
              onComentarios={abrirComentarios}
            />
          </TabsContent>

          <TabsContent
            value="destaques"
            className="site-tab-content mt-0 px-5 py-6 sm:px-8 lg:px-12"
          >
            <LazyTabPanel value="destaques" activeTab={aba}>
              <DestaquesTab />
            </LazyTabPanel>
          </TabsContent>

          <TabsContent value="jogos" className="site-tab-content mt-0 px-5 py-6 sm:px-8 lg:px-12">
            <LazyTabPanel value="jogos" activeTab={aba}>
              <JogosTab
                palpitesPorJogo={palpitesPorJogo}
                meusAcertosPorJogo={meusAcertosPorJogo}
                acertadoresPorJogo={acertadoresPorJogo}
                onPalpitar={(j) => abrirPalpite(j)}
                onComentarios={abrirComentarios}
                resultadosPorJogo={resultadosPorJogo}
                grupoInicial={filtroGrupoInicial}
                onConsumirGrupo={() => setFiltroGrupoInicial("todos")}
              />
            </LazyTabPanel>
          </TabsContent>

          <TabsContent
            value="calendario"
            className="site-tab-content mt-0 px-5 py-6 sm:px-8 lg:px-12"
          >
            <LazyTabPanel value="calendario" activeTab={aba}>
              <CalendarioTab
                palpitesPorJogo={palpitesPorJogo}
                onPalpitar={(j) => abrirPalpite(j)}
                onComentarios={abrirComentarios}
                resultadosPorJogo={resultadosPorJogo}
              />
            </LazyTabPanel>
          </TabsContent>

          <TabsContent
            value="selecoes"
            className="site-tab-content mt-0 px-5 py-6 sm:px-8 lg:px-12"
          >
            <LazyTabPanel value="selecoes" activeTab={aba}>
              <SelecoesTab onAbrir={setSelecaoModal} />
            </LazyTabPanel>
          </TabsContent>

          <TabsContent value="grupos" className="site-tab-content mt-0 px-5 py-6 sm:px-8 lg:px-12">
            <LazyTabPanel value="grupos" activeTab={aba}>
              <GruposTab
                onVerJogos={(g) => {
                  setFiltroGrupoInicial(g);
                  setAba("jogos");
                }}
              />
            </LazyTabPanel>
          </TabsContent>

          <TabsContent
            value="chaveamento"
            className="site-tab-content mt-0 px-5 py-6 sm:px-8 lg:px-12"
          >
            <LazyTabPanel value="chaveamento" activeTab={aba}>
              <ChaveamentoAutomatico allowSimulation={authProfile.role === "admin"} />
            </LazyTabPanel>
          </TabsContent>

          <TabsContent value="titulos" className="site-tab-content mt-0 px-5 py-6 sm:px-8 lg:px-12">
            <LazyTabPanel value="titulos" activeTab={aba}>
              <TitulosTab />
            </LazyTabPanel>
          </TabsContent>

          <TabsContent value="meus" className="site-tab-content mt-0 px-5 py-6 sm:px-8 lg:px-12">
            <LazyTabPanel value="meus" activeTab={aba}>
              <MeusPalpitesTab
                usuario={authProfile}
                palpites={palpites}
                resultadosPorJogo={resultadosPorJogo}
                acertadoresPorJogo={acertadoresPorJogo}
                onEditar={(p) => {
                  const j = jogos.find((x) => x.id === p.jogoId);
                  if (j) abrirPalpite(j, p);
                }}
                onExcluir={async (p) => {
                  const j = jogos.find((x) => x.id === p.jogoId);
                  if (j && palpiteBloqueadoParaJogo(j, resultadosPorJogo.get(j.id))) {
                    toast.error("Palpites encerrados para este jogo.");
                    return;
                  }
                  await excluirPalpite(p.id, authProfile.id);
                  await queryClient.invalidateQueries({
                    queryKey: vivicopaQueryKeys.meusPalpites(authProfile.id),
                  });
                }}
                meusAcertosPorJogo={meusAcertosPorJogo}
              />
            </LazyTabPanel>
          </TabsContent>

          <TabsContent value="tabela" className="site-tab-content mt-0 px-5 py-6 sm:px-8 lg:px-12">
            <LazyTabPanel value="tabela" activeTab={aba}>
              <TabelaTab usuario={authProfile} palpites={palpites} />
            </LazyTabPanel>
          </TabsContent>

          <TabsContent
            value="comentarios"
            className="site-tab-content mt-0 px-5 py-6 sm:px-8 lg:px-12"
          >
            <LazyTabPanel value="comentarios" activeTab={aba}>
              <AdminCommentsTab comentarios={comentarios} />
            </LazyTabPanel>
          </TabsContent>

          {authProfile.role === "admin" && (
            <>
              <TabsContent
                value="usuarios"
                className="site-tab-content mt-0 px-5 py-6 sm:px-8 lg:px-12"
              >
                <LazyTabPanel value="usuarios" activeTab={aba}>
                  <UsersTab currentUser={authProfile} />
                </LazyTabPanel>
              </TabsContent>
              <TabsContent
                value="admin"
                className="site-tab-content mt-0 px-5 py-6 sm:px-8 lg:px-12"
              >
                <LazyTabPanel value="admin" activeTab={aba}>
                  <AdminTab />
                </LazyTabPanel>
              </TabsContent>
            </>
          )}
        </main>
      </Tabs>
      <Footer />

      <PredictionModal
        jogo={jogoSel}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          void queryClient.invalidateQueries({
            queryKey: vivicopaQueryKeys.meusPalpites(authProfile.id),
          });
        }}
        editar={editar}
        userId={authProfile.id}
        username={authProfile.username}
      />

      <Dialog open={!!comentariosJogo} onOpenChange={(o) => !o && setComentariosJogo(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-brand-dark">Comentários do jogo</DialogTitle>
          </DialogHeader>
          {comentariosJogo && (
            <ComentariosJogo
              jogo={comentariosJogo}
              comentarios={comentarios}
              userId={authProfile.id}
              userRole={authProfile.role}
              username={authProfile.username}
              onSaved={atualizarComentariosENotificacoes}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selecaoModal} onOpenChange={(o) => !o && setSelecaoModal(null)}>
        <DialogContent className="max-w-md">
          {selecaoModal && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-brand-dark">
                  <img
                    src={flagUrl(selecaoModal.id, 160)}
                    alt={flagAlt(selecaoModal.id)}
                    className="h-10 w-14 rounded-md object-cover ring-1 ring-border"
                  />
                  {selecaoModal.nome}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-semibold">Grupo:</span> {selecaoModal.grupo}
                </div>
                <div>
                  <span className="font-semibold">Técnico:</span> {selecaoModal.tecnico}
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 rounded-lg bg-brand-soft p-2 text-center">
                    <div className="text-lg font-extrabold text-brand-dark">
                      {getStats(selecaoModal.id).participacoes}
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Participações
                    </div>
                  </div>
                  <div className="flex-1 rounded-lg bg-brand-soft p-2 text-center">
                    <div className="flex items-center justify-center gap-1 text-lg font-extrabold text-brand-dark">
                      <Trophy className="h-4 w-4 text-brand" />
                      {getStats(selecaoModal.id).titulos}
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Títulos
                    </div>
                  </div>
                </div>
                <div>
                  <div className="font-semibold">Jogadores:</div>
                  <ul className="mt-1 list-inside list-disc text-muted-foreground">
                    {selecaoModal.jogadores.map((j) => (
                      <li key={j}>{j}</li>
                    ))}
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
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { config, loaded: configLoaded } = useConfigStore();
  const logoUrl =
    configLoaded && config.logo_url !== undefined
      ? config.logo_url
      : (localStorage.getItem(LOGO_URL_KEY) ?? "");
  const logoSize =
    configLoaded && config.logo_size
      ? Number(config.logo_size)
      : Number(localStorage.getItem(LOGO_SIZE_KEY) || 80);
  const loginBackgroundUrl =
    configLoaded && config.login_background_url !== undefined
      ? config.login_background_url
      : (localStorage.getItem(LOGIN_BACKGROUND_KEY) ?? "");

  useEffect(() => {
    useConfigStore.getState().load();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedUsername = normalizeUsername(username);
    const normalizedEmail = normalizeEmail(email);

    if (!isValidUsername(normalizedUsername)) {
      toast.error(
        "Usuario deve ter 3 a 32 caracteres e usar apenas letras, numeros, ponto, hifen ou underline.",
      );
      return;
    }

    if (password.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (mode === "signup") {
      if (!isValidEmail(normalizedEmail)) {
        toast.error("Informe um e-mail valido para cadastro.");
        return;
      }
      if (password !== confirmPassword) {
        toast.error("As senhas nao conferem.");
        return;
      }

      setLoading(true);
      const { error: createError } = await supabase.functions.invoke("create-managed-user", {
        body: {
          publicSignup: true,
          username: normalizedUsername,
          email: normalizedEmail,
          password,
        },
      });

      if (createError) {
        setLoading(false);
        toast.error(createError.message);
        return;
      }
    } else {
      setLoading(true);
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(normalizedUsername),
      password,
    });
    setLoading(false);

    if (error) {
      toast.error("Usuario ou senha incorretos.");
      return;
    }

    if (mode === "signup") toast.success("Conta criada com sucesso.");
    onLoggedIn();
  };

  const isSignup = mode === "signup";

  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-brand-soft bg-cover bg-center bg-no-repeat px-4 py-8"
      style={
        loginBackgroundUrl ? { backgroundImage: 'url("' + loginBackgroundUrl + '")' } : undefined
      }
    >
      {loginBackgroundUrl && <div className="absolute inset-0 bg-black/35" aria-hidden="true" />}
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-sm rounded-2xl border border-white/70 bg-card/95 p-6 shadow-brand backdrop-blur-sm"
      >
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
          <h1 className="text-2xl font-extrabold text-brand-dark">
            {isSignup ? "Criar conta" : "Login Vivicopa"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignup
              ? "Crie seu usuario e informe um e-mail de contato."
              : "Entre com usuario e senha para acessar os palpites."}
          </p>
        </div>

        <div className="mb-4 grid grid-cols-2 rounded-xl bg-brand-soft p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-lg px-3 py-2 text-sm font-bold transition ${!isSignup ? "bg-white text-brand shadow-card" : "text-muted-foreground"}`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded-lg px-3 py-2 text-sm font-bold transition ${isSignup ? "bg-white text-brand shadow-card" : "text-muted-foreground"}`}
          >
            Criar conta
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="login-usuario">Usuario</Label>
            <Input
              id="login-usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="ex: maria"
              required
            />
          </div>
          {isSignup && (
            <div>
              <Label htmlFor="cadastro-email">E-mail</Label>
              <Input
                id="cadastro-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="voce@email.com"
                required
              />
            </div>
          )}
          <div>
            <Label htmlFor="login-senha">Senha</Label>
            <Input
              id="login-senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
            />
          </div>
          {isSignup && (
            <div>
              <Label htmlFor="confirmar-cadastro-senha">Confirmar senha</Label>
              <Input
                id="confirmar-cadastro-senha"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
          )}
        </div>

        <Button
          type="submit"
          className="mt-5 w-full bg-gradient-brand text-white hover:opacity-90"
          disabled={loading}
        >
          {loading
            ? isSignup
              ? "Criando..."
              : "Entrando..."
            : isSignup
              ? "Criar conta"
              : "Entrar"}
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {isSignup
            ? "O e-mail sera usado apenas para comunicacoes futuras."
            : "Ainda nao tem conta? Use a aba Criar conta."}
        </p>
        <Toaster />
      </form>
    </div>
  );
}
function AdminTab() {
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [confirmandoLimpeza, setConfirmandoLimpeza] = useState(false);
  const [limpando, setLimpando] = useState(false);

  const [logoUrl, setLogoUrl] = useState(() => localStorage.getItem(LOGO_URL_KEY) ?? "");
  const [loginBackgroundUrl, setLoginBackgroundUrl] = useState(
    () => localStorage.getItem(LOGIN_BACKGROUND_KEY) ?? "",
  );
  const [logoSize, setLogoSize] = useState(() => Number(localStorage.getItem(LOGO_SIZE_KEY) || 80));
  const [logoHeaderSize, setLogoHeaderSize] = useState(() =>
    Number(localStorage.getItem(LOGO_HEADER_SIZE_KEY) || 58),
  );
  const [bannerUrl, setBannerUrl] = useState(() => localStorage.getItem(HEADER_BANNER_KEY) ?? "");
  const [heroBannerUrl, setHeroBannerUrl] = useState(
    () => localStorage.getItem(HERO_BANNER_KEY) ?? "",
  );
  const [heroBannerPos, setHeroBannerPos] = useState(() =>
    parsePos(localStorage.getItem(HERO_BANNER_POS_KEY) ?? ""),
  );
  const [heroWashIntensity, setHeroWashIntensity] = useState(
    () => Number(localStorage.getItem(HERO_WASH_KEY) ?? 75),
  );
  const [heroWashWidth, setHeroWashWidth] = useState(
    () => Number(localStorage.getItem(HERO_WASH_WIDTH_KEY) ?? 50),
  );
  const [homeSecondaryPos, setHomeSecondaryPos] = useState(() =>
    parsePos(localStorage.getItem(HOME_SECONDARY_POS_KEY) ?? ""),
  );
  const [faviconUrl, setFaviconUrl] = useState(() => localStorage.getItem(FAVICON_URL_KEY) ?? "");
  const initialTheme = readSiteTheme();
  const [siteTitle, setSiteTitle] = useState(initialTheme.title);
  const [siteSubtitle, setSiteSubtitle] = useState(initialTheme.subtitle);
  const [sitePrimary, setSitePrimary] = useState(initialTheme.primary);
  const [siteAccent, setSiteAccent] = useState(initialTheme.accent);
  const [siteSurface, setSiteSurface] = useState(initialTheme.surface);
  const [siteTitleTracking, setSiteTitleTracking] = useState(initialTheme.titleTracking);
  const [homeSecondaryImage, setHomeSecondaryImage] = useState(
    () => localStorage.getItem(HOME_SECONDARY_IMAGE_KEY) ?? "",
  );
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const heroBannerInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const loginBackgroundInputRef = useRef<HTMLInputElement>(null);
  const homeSecondaryInputRef = useRef<HTMLInputElement>(null);

  const storagePathFromUrl = (url: string): string | null => {
    const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
    const idx = url.indexOf(marker);
    return idx >= 0 ? decodeURIComponent(url.slice(idx + marker.length)) : null;
  };

  const uploadImageToStorage = async (
    file: File,
    chave: string,
    oldUrl: string,
    setter: (url: string) => void,
  ) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem válido.");
      return;
    }
    if (file.size > STORAGE_MAX_BYTES) {
      toast.error("A imagem deve ter no máximo 5 MB.");
      return;
    }
    setUploading(true);
    try {
      // Remove arquivo anterior do Storage (se for do nosso bucket)
      if (oldUrl) {
        const oldPath = storagePathFromUrl(oldUrl);
        if (oldPath) await supabase.storage.from(STORAGE_BUCKET).remove([oldPath]);
      }
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const path = `${chave}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { contentType: file.type });
      if (uploadError) {
        toast.error("Erro ao fazer upload da imagem.");
        return;
      }
      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      setter(data.publicUrl);
    } finally {
      setUploading(false);
    }
  };

  const makeFileHandler =
    (chave: string, oldUrl: string, setter: (url: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.currentTarget.files?.[0];
      e.currentTarget.value = "";
      if (file) void uploadImageToStorage(file, chave, oldUrl, setter);
    };

  const handleLogoFile = makeFileHandler("logo_url", logoUrl, setLogoUrl);
  const handleBannerFile = makeFileHandler("header_banner_url", bannerUrl, setBannerUrl);
  const handleHeroBannerFile = makeFileHandler("hero_banner_url", heroBannerUrl, setHeroBannerUrl);
  const handleHomeSecondaryFile = makeFileHandler(
    "home_secondary_image",
    homeSecondaryImage,
    setHomeSecondaryImage,
  );
  const handleLoginBackgroundFile = makeFileHandler(
    "login_background_url",
    loginBackgroundUrl,
    setLoginBackgroundUrl,
  );
  const handleFaviconFile = makeFileHandler("favicon_url", faviconUrl, setFaviconUrl);
  const salvarLogo = async () => {
    const imageValues = [
      logoUrl,
      loginBackgroundUrl,
      bannerUrl,
      heroBannerUrl,
      faviconUrl,
      homeSecondaryImage,
    ];
    const validDataUrl = (value: string) =>
      /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i.test(value);
    const validRemoteUrl = (value: string) => /^https?:\/\//i.test(value);
    if (imageValues.some((value) => value && !validDataUrl(value) && !validRemoteUrl(value))) {
      toast.error("Use uma URL http(s) válida ou carregue um arquivo de imagem.");
      return;
    }
    const rows = [
      { chave: "logo_url", valor: logoUrl, atualizado_em: new Date().toISOString() },
      { chave: "logo_size", valor: String(logoSize), atualizado_em: new Date().toISOString() },
      {
        chave: "logo_header_size",
        valor: String(logoHeaderSize),
        atualizado_em: new Date().toISOString(),
      },
      { chave: "header_banner_url", valor: bannerUrl, atualizado_em: new Date().toISOString() },
      { chave: "hero_banner_url", valor: heroBannerUrl, atualizado_em: new Date().toISOString() },
      {
        chave: "hero_banner_position",
        valor: formatPos(heroBannerPos.x, heroBannerPos.y),
        atualizado_em: new Date().toISOString(),
      },
      { chave: "hero_wash_intensity", valor: String(heroWashIntensity), atualizado_em: new Date().toISOString() },
      { chave: "hero_wash_width", valor: String(heroWashWidth), atualizado_em: new Date().toISOString() },
      {
        chave: "home_secondary_image_position",
        valor: formatPos(homeSecondaryPos.x, homeSecondaryPos.y),
        atualizado_em: new Date().toISOString(),
      },
      { chave: "favicon_url", valor: faviconUrl, atualizado_em: new Date().toISOString() },
      {
        chave: "login_background_url",
        valor: loginBackgroundUrl,
        atualizado_em: new Date().toISOString(),
      },
      {
        chave: "site_title",
        valor: siteTitle.trim() || DEFAULT_SITE_THEME.title,
        atualizado_em: new Date().toISOString(),
      },
      {
        chave: "site_subtitle",
        valor: siteSubtitle.trim() || DEFAULT_SITE_THEME.subtitle,
        atualizado_em: new Date().toISOString(),
      },
      { chave: "site_primary", valor: sitePrimary, atualizado_em: new Date().toISOString() },
      { chave: "site_accent", valor: siteAccent, atualizado_em: new Date().toISOString() },
      { chave: "site_surface", valor: siteSurface, atualizado_em: new Date().toISOString() },
      {
        chave: "site_title_tracking",
        valor: String(siteTitleTracking),
        atualizado_em: new Date().toISOString(),
      },
      {
        chave: "home_secondary_image",
        valor: homeSecondaryImage,
        atualizado_em: new Date().toISOString(),
      },
    ];
    const { error } = await supabase
      .from("app_config" as never)
      .upsert(rows as never, { onConflict: "chave" });
    if (error) {
      toast.error("Erro ao salvar configurações.");
      return;
    }
    if (logoUrl) localStorage.setItem(LOGO_URL_KEY, logoUrl);
    else localStorage.removeItem(LOGO_URL_KEY);
    localStorage.setItem(LOGO_SIZE_KEY, String(logoSize));
    localStorage.setItem(LOGO_HEADER_SIZE_KEY, String(logoHeaderSize));
    if (bannerUrl) localStorage.setItem(HEADER_BANNER_KEY, bannerUrl);
    else localStorage.removeItem(HEADER_BANNER_KEY);
    if (heroBannerUrl) localStorage.setItem(HERO_BANNER_KEY, heroBannerUrl);
    else localStorage.removeItem(HERO_BANNER_KEY);
    localStorage.setItem(HERO_BANNER_POS_KEY, formatPos(heroBannerPos.x, heroBannerPos.y));
    localStorage.setItem(HERO_WASH_KEY, String(heroWashIntensity));
    localStorage.setItem(HERO_WASH_WIDTH_KEY, String(heroWashWidth));
    localStorage.setItem(HOME_SECONDARY_POS_KEY, formatPos(homeSecondaryPos.x, homeSecondaryPos.y));
    if (faviconUrl) localStorage.setItem(FAVICON_URL_KEY, faviconUrl);
    else localStorage.removeItem(FAVICON_URL_KEY);
    if (loginBackgroundUrl) localStorage.setItem(LOGIN_BACKGROUND_KEY, loginBackgroundUrl);
    else localStorage.removeItem(LOGIN_BACKGROUND_KEY);
    storeSiteTheme({
      title: siteTitle.trim() || DEFAULT_SITE_THEME.title,
      subtitle: siteSubtitle.trim() || DEFAULT_SITE_THEME.subtitle,
      primary: sitePrimary,
      accent: siteAccent,
      surface: siteSurface,
      titleTracking: siteTitleTracking,
    });
    if (homeSecondaryImage) localStorage.setItem(HOME_SECONDARY_IMAGE_KEY, homeSecondaryImage);
    else localStorage.removeItem(HOME_SECONDARY_IMAGE_KEY);
    window.dispatchEvent(new CustomEvent("vivicopa:logo-changed"));
    window.dispatchEvent(new CustomEvent("vivicopa:favicon-changed"));
    toast.success("Configurações salvas.");
  };

  const removerImagem = async (
    chave: string,
    url: string,
    localKey: string,
    setter: (v: string) => void,
    evento?: string,
    mensagem?: string,
  ) => {
    const path = storagePathFromUrl(url);
    if (path) await supabase.storage.from(STORAGE_BUCKET).remove([path]);
    await supabase
      .from("app_config" as never)
      .update({ valor: "", atualizado_em: new Date().toISOString() } as never)
      .eq("chave" as never, chave);
    localStorage.removeItem(localKey);
    setter("");
    if (evento) window.dispatchEvent(new CustomEvent(evento));
    toast.success(mensagem ?? "Imagem removida.");
  };

  const removerLogo = () =>
    removerImagem(
      "logo_url",
      logoUrl,
      LOGO_URL_KEY,
      setLogoUrl,
      "vivicopa:logo-changed",
      "Logo removida.",
    );
  const removerBanner = () =>
    removerImagem(
      "header_banner_url",
      bannerUrl,
      HEADER_BANNER_KEY,
      setBannerUrl,
      "vivicopa:logo-changed",
      "Banner do cabeçalho removido.",
    );
  const removerHeroBanner = () =>
    removerImagem(
      "hero_banner_url",
      heroBannerUrl,
      HERO_BANNER_KEY,
      setHeroBannerUrl,
      "vivicopa:logo-changed",
      "Banner da tela inicial removido.",
    );
  const removerLoginBackground = () =>
    removerImagem(
      "login_background_url",
      loginBackgroundUrl,
      LOGIN_BACKGROUND_KEY,
      setLoginBackgroundUrl,
      undefined,
      "Fundo da tela de login removido.",
    );
  const removerFavicon = () =>
    removerImagem(
      "favicon_url",
      faviconUrl,
      FAVICON_URL_KEY,
      setFaviconUrl,
      "vivicopa:favicon-changed",
      "Favicon removido.",
    );
  const removerHomeSecondaryImage = () =>
    removerImagem(
      "home_secondary_image",
      homeSecondaryImage,
      HOME_SECONDARY_IMAGE_KEY,
      setHomeSecondaryImage,
      "vivicopa:logo-changed",
      "Imagem removida.",
    );
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

  return (
    <div className="space-y-4">
      <AdminPalpitesPanel />
      <AdminCronMonitorPanel />
      <section className="site-admin-section border border-border bg-card p-5">
        <div className="mb-5 flex items-center gap-2 text-xs font-black uppercase text-brand">
          <ImageIcon className="h-4 w-4" /> Identidade visual do projeto
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <Label htmlFor="site-title">Título do projeto</Label>
              <Input
                id="site-title"
                value={siteTitle}
                onChange={(e) => setSiteTitle(e.target.value)}
                maxLength={40}
              />
            </div>
            <div>
              <Label htmlFor="site-subtitle">Subtítulo</Label>
              <Input
                id="site-subtitle"
                value={siteSubtitle}
                onChange={(e) => setSiteSubtitle(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="pt-2">
              <div className="mb-1 flex items-center justify-between text-xs font-semibold">
                <span>Espaçamento entre letras do título</span>
                <span className="text-brand">{siteTitleTracking.toFixed(3)}em</span>
              </div>
              <Slider
                min={0}
                max={0.12}
                step={0.002}
                value={[siteTitleTracking]}
                onValueChange={([v]) => setSiteTitleTracking(v)}
              />
              <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
                <span>Mais fechado</span>
                <span>Mais aberto</span>
              </div>
            </div>
            <div className="mt-5">
              <p className="mb-2 text-xs font-bold uppercase text-muted-foreground">
                Paletas elegantes
              </p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    {
                      nome: "Esmeralda",
                      primary: "#1F4D35",
                      accent: "#C59A3A",
                      surface: "#EEE9DC",
                    },
                    {
                      nome: "Azul Royal",
                      primary: "#0D3461",
                      accent: "#D4AF37",
                      surface: "#EEF3FA",
                    },
                    { nome: "Bordô", primary: "#6B1A2A", accent: "#C5833A", surface: "#FAF0EE" },
                    { nome: "Carvão", primary: "#2C2C2C", accent: "#D4AF37", surface: "#F4F0EA" },
                    { nome: "Petróleo", primary: "#1B4B5A", accent: "#C59A3A", surface: "#EEF5F7" },
                    { nome: "Roxo", primary: "#4A1E6B", accent: "#D4AF37", surface: "#F5F0FA" },
                    { nome: "Vermelho", primary: "#8B1A1A", accent: "#D4AF37", surface: "#FAF0F0" },
                    { nome: "Musgo", primary: "#3D5A3E", accent: "#B5946A", surface: "#F2EDE4" },
                  ] as const
                ).map((p) => {
                  const ativo =
                    sitePrimary === p.primary &&
                    siteAccent === p.accent &&
                    siteSurface === p.surface;
                  return (
                    <button
                      key={p.nome}
                      type="button"
                      title={p.nome}
                      onClick={() => {
                        setSitePrimary(p.primary);
                        setSiteAccent(p.accent);
                        setSiteSurface(p.surface);
                      }}
                      className={`flex flex-col items-center gap-1 rounded border-2 px-2 py-1.5 transition ${ativo ? "border-brand" : "border-transparent hover:border-border"}`}
                    >
                      <div className="flex gap-0.5">
                        <span className="h-4 w-4 rounded-sm" style={{ background: p.primary }} />
                        <span className="h-4 w-4 rounded-sm" style={{ background: p.accent }} />
                        <span
                          className="h-4 w-4 rounded-sm border border-border/40"
                          style={{ background: p.surface }}
                        />
                      </div>
                      <span className="text-[9px] font-bold uppercase text-muted-foreground">
                        {p.nome}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                ["Cor principal", sitePrimary, setSitePrimary],
                ["Cor de destaque", siteAccent, setSiteAccent],
                ["Cor de fundo", siteSurface, setSiteSurface],
              ].map(([label, value, setter]) => (
                <label key={label as string} className="space-y-1 text-sm font-semibold">
                  <span>{label as string}</span>
                  <span className="flex h-10 items-center gap-2 border border-border bg-white px-2">
                    <input
                      type="color"
                      value={value as string}
                      onChange={(e) => (setter as (value: string) => void)(e.target.value)}
                      className="h-7 w-9 cursor-pointer border-0 bg-transparent p-0"
                    />
                    <span className="text-xs uppercase text-muted-foreground">
                      {value as string}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between gap-3">
              <Label>Imagem 2: próximos jogos</Label>
              {homeSecondaryImage && (
                <Button type="button" variant="ghost" size="sm" onClick={removerHomeSecondaryImage}>
                  Remover
                </Button>
              )}
            </div>
            <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
              <Input
                value={homeSecondaryImage.startsWith("data:") ? "" : homeSecondaryImage}
                onChange={(e) => setHomeSecondaryImage(e.target.value)}
                placeholder="https://... ou carregue um arquivo"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                onClick={() => homeSecondaryInputRef.current?.click()}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Carregar arquivo"}
              </Button>
              <input
                ref={homeSecondaryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleHomeSecondaryFile}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Usada ao lado da agenda. Prefira uma foto horizontal com até 5 MB.
            </p>
            {homeSecondaryImage.startsWith("data:") && (
              <p className="mt-1 text-xs text-amber-600">
                Imagem em Base64 legado â€” carregue um novo arquivo para migrar para o Storage.
              </p>
            )}
            <div
              className="mt-3 aspect-[16/7] w-full border border-dashed border-border bg-brand-soft bg-cover"
              style={
                homeSecondaryImage
                  ? {
                      backgroundImage: "url(" + homeSecondaryImage + ")",
                      backgroundPosition: `${homeSecondaryPos.x}% ${homeSecondaryPos.y}%`,
                    }
                  : undefined
              }
            >
              {!homeSecondaryImage && (
                <div className="flex h-full items-center justify-center text-xs font-semibold uppercase text-muted-foreground">
                  Espaço da segunda imagem
                </div>
              )}
            </div>
            {homeSecondaryImage && (
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs font-semibold">
                    <span>Posição horizontal</span>
                    <span className="text-brand">{homeSecondaryPos.x}%</span>
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[homeSecondaryPos.x]}
                    onValueChange={([v]) => setHomeSecondaryPos((p) => ({ ...p, x: v }))}
                  />
                  <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
                    <span>Esquerda</span>
                    <span>Direita</span>
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs font-semibold">
                    <span>Posição vertical</span>
                    <span className="text-brand">{homeSecondaryPos.y}%</span>
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[homeSecondaryPos.y]}
                    onValueChange={([v]) => setHomeSecondaryPos((p) => ({ ...p, y: v }))}
                  />
                  <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
                    <span>Topo</span>
                    <span>Base</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <Button type="button" onClick={salvarLogo}>
            <Save className="mr-2 h-4 w-4" /> Salvar identidade e imagens
          </Button>
          <span className="text-xs text-muted-foreground">
            As imagens são armazenadas no Supabase Storage do projeto.
          </span>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <form
          onSubmit={trocarSenha}
          className="rounded-2xl border border-border bg-card p-5 shadow-card"
        >
          <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand">
            <KeyRound className="h-3.5 w-3.5" /> Trocar minha senha
          </div>
          <div className="space-y-3">
            <div>
              <Label htmlFor="nova-senha">Nova senha</Label>
              <Input
                id="nova-senha"
                type="password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="confirmar-senha">Confirmar senha</Label>
              <Input
                id="confirmar-senha"
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" className="mt-4 w-full" disabled={savingPassword}>
            {savingPassword ? "Salvando..." : "Alterar senha"}
          </Button>
        </form>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand">
          <ImageIcon className="h-3.5 w-3.5" /> Editar página de login
        </div>
        <div className="grid gap-6 md:grid-cols-[1fr_180px]">
          <div className="space-y-4">
            <div>
              <Label>Logo da página de login</Label>
              <div className="mt-1.5 flex gap-2">
                <Input
                  value={logoUrl.startsWith("data:") ? "" : logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://... ou carregue um arquivo"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Carregar arquivo"}
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
                <p className="mt-1 text-xs text-amber-600">
                  Imagem em Base64 legado â€” carregue um novo arquivo para migrar para o Storage.
                </p>
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

            <div className="border-t border-border pt-4">
              <Label className="mb-1.5 block">Imagem de fundo da tela de bloqueio</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={loginBackgroundUrl.startsWith("data:") ? "" : loginBackgroundUrl}
                  onChange={(e) => setLoginBackgroundUrl(e.target.value)}
                  placeholder="https://... ou carregue um arquivo"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => loginBackgroundInputRef.current?.click()}
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Carregar arquivo"}
                </Button>
                <input
                  ref={loginBackgroundInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLoginBackgroundFile}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                A imagem ocupará todo o fundo da página, com corte proporcional para preencher a
                tela.
              </p>
              {loginBackgroundUrl.startsWith("data:") && (
                <p className="mt-1 text-xs text-amber-600">
                  Imagem em Base64 legado â€” carregue um novo arquivo para migrar para o Storage.
                </p>
              )}
              {loginBackgroundUrl && (
                <div className="mt-3 space-y-2">
                  <div
                    className="relative aspect-[16/7] w-full overflow-hidden rounded-xl border border-border bg-cover bg-center"
                    style={{ backgroundImage: 'url("' + loginBackgroundUrl + '")' }}
                  >
                    <div className="absolute inset-0 bg-black/30" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="rounded-lg border border-white/70 bg-white/90 px-4 py-3 text-center shadow-card backdrop-blur-sm">
                        <Shield className="mx-auto h-5 w-5 text-brand" />
                        <span className="mt-1 block text-xs font-bold text-brand-dark">
                          Prévia do login
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={removerLoginBackground}
                  >
                    Remover imagem de fundo
                  </Button>
                </div>
              )}
            </div>
            <div className="border-t border-border pt-4">
              <Label className="mb-1.5 block">Favicon do site</Label>
              <div className="flex gap-2">
                <Input
                  value={faviconUrl.startsWith("data:") ? "" : faviconUrl}
                  onChange={(e) => setFaviconUrl(e.target.value)}
                  placeholder="https://... ou carregue um arquivo"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => faviconInputRef.current?.click()}
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Carregar arquivo"}
                </Button>
                <input
                  ref={faviconInputRef}
                  type="file"
                  accept="image/png,image/svg+xml,image/x-icon,image/vnd.microsoft.icon,image/*"
                  className="hidden"
                  onChange={handleFaviconFile}
                />
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-brand-soft">
                  {faviconUrl ? (
                    <img
                      src={faviconUrl}
                      alt="Prévia do favicon"
                      className="h-6 w-6 object-contain"
                    />
                  ) : (
                    <Shield className="h-5 w-5 text-brand" />
                  )}
                </div>
                <div className="flex-1 text-xs text-muted-foreground">
                  Use uma imagem quadrada, preferencialmente PNG, SVG ou ICO.
                </div>
                {faviconUrl && (
                  <Button type="button" variant="outline" size="sm" onClick={removerFavicon}>
                    Remover favicon
                  </Button>
                )}
              </div>
              {faviconUrl.startsWith("data:") && (
                <p className="mt-1 text-xs text-amber-600">
                  Imagem em Base64 legado â€” carregue um novo arquivo para migrar para o Storage.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={salvarLogo}>
                Salvar configurações
              </Button>
              {logoUrl && (
                <Button type="button" variant="outline" onClick={removerLogo}>
                  Remover logo
                </Button>
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
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => bannerInputRef.current?.click()}
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Carregar arquivo"}
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
                <p className="mt-1 text-xs text-amber-600">
                  Imagem em Base64 legado â€” carregue um novo arquivo para migrar para o Storage.
                </p>
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
                    <div
                      className="absolute inset-0 rounded-xl"
                      style={{ background: "rgba(0,0,0,0.30)" }}
                    />
                    <div className="relative z-10 flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-brand text-white">
                      <Trophy className="h-4 w-4" />
                    </div>
                    <div className="relative z-10 leading-tight">
                      <div className="text-sm font-bold text-white">Vivicopa</div>
                      <div className="text-xs text-white/80">
                        Palpites, resenhas e emoção em cada jogo.
                      </div>
                    </div>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={removerBanner}>
                    Remover banner
                  </Button>
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
            <p className="text-center text-xs text-muted-foreground">
              Tamanho real aplicado na tela de login
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand">
          <ImageIcon className="h-3.5 w-3.5" /> Imagem 1: destaque principal da página inicial
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between gap-3">
              <Label>Imagem de fundo (arquivo ou URL)</Label>
              {heroBannerUrl && (
                <Button type="button" variant="ghost" size="sm" onClick={removerHeroBanner}>
                  Remover
                </Button>
              )}
            </div>
            <div className="mt-1.5 flex gap-2">
              <Input
                value={heroBannerUrl.startsWith("data:") ? "" : heroBannerUrl}
                onChange={(e) => setHeroBannerUrl(e.target.value)}
                placeholder="https://... ou carregue um arquivo"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                onClick={() => heroBannerInputRef.current?.click()}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Carregar arquivo"}
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
              <p className="mt-1 text-xs text-amber-600">
                Imagem em Base64 legado â€” carregue um novo arquivo para migrar para o Storage.
              </p>
            )}
          </div>
          {heroBannerUrl && (
            <div className="space-y-3">
              <div className="relative flex aspect-[16/7] items-start overflow-hidden border border-border p-6">
                <img
                  src={heroBannerUrl}
                  alt=""
                  aria-hidden
                  style={{
                    position: "absolute",
                    width: "150%",
                    height: "150%",
                    maxWidth: "none",
                    objectFit: "cover",
                    top: `${-heroBannerPos.y * 0.5}%`,
                    left: `${-heroBannerPos.x * 0.5}%`,
                  }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: washGradient(heroWashWidth),
                    opacity: heroWashIntensity / 100,
                  }}
                />
                <div className="relative z-10">
                  <div
                    className="site-display text-2xl font-black uppercase leading-none text-brand"
                    style={{ letterSpacing: `${siteTitleTracking}em` }}
                  >
                    {siteTitle}
                  </div>
                  <div className="mt-1 text-xs font-bold text-foreground/80">{siteSubtitle}</div>
                  <div className="mt-2 flex gap-2">
                    <span className="bg-[#174b66] px-2 py-1 text-[9px] font-bold uppercase text-white">
                      Ver jogos
                    </span>
                    <span className="bg-[var(--site-accent)] px-2 py-1 text-[9px] font-bold uppercase text-white">
                      Palpitar
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs font-semibold">
                    <span>Posição horizontal</span>
                    <span className="text-brand">{heroBannerPos.x}%</span>
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[heroBannerPos.x]}
                    onValueChange={([v]) => {
                      setHeroBannerPos((p) => {
                        const next = { ...p, x: v };
                        localStorage.setItem(HERO_BANNER_POS_KEY, formatPos(next.x, next.y));
                        window.dispatchEvent(new Event("vivicopa:logo-changed"));
                        return next;
                      });
                    }}
                  />
                  <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
                    <span>Esquerda</span>
                    <span>Direita</span>
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs font-semibold">
                    <span>Posição vertical</span>
                    <span className="text-brand">{heroBannerPos.y}%</span>
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[heroBannerPos.y]}
                    onValueChange={([v]) => {
                      setHeroBannerPos((p) => {
                        const next = { ...p, y: v };
                        localStorage.setItem(HERO_BANNER_POS_KEY, formatPos(next.x, next.y));
                        window.dispatchEvent(new Event("vivicopa:logo-changed"));
                        return next;
                      });
                    }}
                  />
                  <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
                    <span>Topo</span>
                    <span>Base</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-xs font-semibold">
                  <span>Alcance da névoa</span>
                  <span className="text-brand">{heroWashWidth}%</span>
                </div>
                <Slider
                  min={10}
                  max={100}
                  step={1}
                  value={[heroWashWidth]}
                  onValueChange={([v]) => {
                    setHeroWashWidth(v);
                    localStorage.setItem(HERO_WASH_WIDTH_KEY, String(v));
                    window.dispatchEvent(new Event("vivicopa:logo-changed"));
                  }}
                />
                <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
                  <span>Mais curta</span>
                  <span>Tela toda</span>
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-xs font-semibold">
                  <span>Intensidade da névoa</span>
                  <span className="text-brand">{heroWashIntensity}%</span>
                </div>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={[heroWashIntensity]}
                  onValueChange={([v]) => {
                    setHeroWashIntensity(v);
                    localStorage.setItem(HERO_WASH_KEY, String(v));
                    window.dispatchEvent(new Event("vivicopa:logo-changed"));
                  }}
                />
                <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
                  <span>Sem névoa</span>
                  <span>Máxima</span>
                </div>
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Prefira uma foto horizontal ampla com o assunto principal à direita. Clique em "Salvar
            identidade e imagens" para aplicar.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
        <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-red-700">
          <Trash2 className="h-3.5 w-3.5" /> Zona de perigo
        </div>
        <p className="mb-4 text-sm text-red-700">
          Esta ação apaga <strong>todos os palpites e comentários</strong> de todos os usuários
          permanentemente. Não pode ser desfeita.
        </p>
        {!confirmandoLimpeza ? (
          <Button type="button" variant="destructive" onClick={() => setConfirmandoLimpeza(true)}>
            <Trash2 className="mr-2 h-4 w-4" /> Apagar todos os palpites e comentários
          </Button>
        ) : (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-300 bg-red-100 p-4">
            <span className="text-sm font-bold text-red-800">
              Tem certeza? Esta ação é irreversível.
            </span>
            <Button
              type="button"
              variant="destructive"
              disabled={limpando}
              onClick={async () => {
                setLimpando(true);
                const { error } = await supabase.rpc("apagar_todos_palpites" as never);
                setLimpando(false);
                setConfirmandoLimpeza(false);
                if (error) {
                  toast.error("Erro ao apagar: " + error.message);
                  return;
                }
                toast.success("Todos os palpites e comentários foram apagados.");
              }}
            >
              {limpando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Apagando...
                </>
              ) : (
                "Sim, apagar tudo"
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => setConfirmandoLimpeza(false)}>
              Cancelar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function TabTrigger({
  value,
  icon,
  children,
}: {
  value: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <TabsTrigger
      value={value}
      className="gap-1.5 data-[state=active]:bg-gradient-brand data-[state=active]:text-white data-[state=active]:shadow-brand"
    >
      {icon}
      <span className="text-sm">{children}</span>
    </TabsTrigger>
  );
}

function HighlightsCardsGrid({
  highlights,
  emptyMessage,
}: {
  highlights: HomeHighlightCard[];
  emptyMessage: string;
}) {
  if (highlights.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-black/15 bg-white/45 px-4 py-6 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {highlights.map((destaque) => {
        return (
          <div
            key={destaque.id}
            className="editorial-highlight-card rounded-2xl border border-white/45 bg-white/38 px-4 py-4 shadow-[0_10px_30px_rgba(31,77,53,0.08)] backdrop-blur-md"
          >
            <div className="mb-3">
              <div>
                <div className="text-[13px] font-black uppercase leading-tight text-foreground">
                  {destaque.title}
                </div>
                <div className="mt-2 h-1.5 w-24 rounded-full bg-[#1f4d35]" />
              </div>
            </div>

            <div className="text-lg font-black uppercase text-brand-dark">
              {getCanonicalTeamName(destaque.subject) || destaque.subject}
            </div>
            <div className="mt-1 text-2xl font-black text-[#174b66]">{destaque.value}</div>
            {destaque.ranking?.length ? (
              <div className="mt-3 space-y-1.5">
                {destaque.ranking.map((item, index) => {
                  const rankingSelecaoId = resolveTeamIdByName(item.teamName) ?? "";
                  return (
                    <div
                      key={`${destaque.id}-${item.label ?? item.teamName}-${item.secondaryLabel ?? ""}-${index}`}
                      className="flex items-center justify-between rounded-xl border border-white/35 bg-white/28 px-2.5 py-2 backdrop-blur-sm"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="text-[10px] font-black text-brand-dark">
                          {item.rank ?? index + 1}º
                        </span>
                        {rankingSelecaoId ? (
                          <img
                            src={flagUrl(rankingSelecaoId, 80)}
                            alt={flagAlt(rankingSelecaoId)}
                            className="h-4 w-6 rounded-sm object-cover shadow-sm"
                          />
                        ) : null}
                        <div className="min-w-0">
                          <div className="truncate text-[11px] font-black uppercase text-foreground">
                            {item.label ?? (getCanonicalTeamName(item.teamName) || item.teamName)}
                          </div>
                          {item.secondaryLabel ? (
                            <div className="truncate text-[10px] font-semibold text-muted-foreground">
                              {getCanonicalTeamName(item.secondaryLabel) || item.secondaryLabel}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <span className="text-[11px] font-black text-brand-dark">
                        {item.valueLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : null}
            <div className="mt-2 text-[11px] font-semibold text-muted-foreground">
              {getCanonicalTeamName(destaque.detail) || destaque.detail}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- HOOK: jogos de hoje + ao vivo via Supabase ----------
type GoalEvent = {
  minuto: number;
  acrescimos: number | null;
  tipo: "REGULAR" | "OWN" | "PENALTY";
  time_nome: string | null;
  time_id: number | null;
  marcador_nome: string | null;
  placar_a: number;
  placar_b: number;
};

type PartidaDestaque = {
  id: string;
  time_a: string;
  time_b: string;
  placar_a: number | null;
  placar_b: number | null;
  status: string;
  inicia_em: string | null;
  minuto?: number | null;
  acrescimos?: number | null;
  gols?: GoalEvent[] | null;
};

// useJogosHoje substituído por useJogosHojeStore() + useSelecoesFlagMap() do store centralizado
// Renders a flag/crest using CSS background-image so SVG and PNG images
// always fill the container at the declared size with no layout flash.
function FlagBox({ url, label, className }: { url?: string; label: string; className?: string }) {
  return (
    <div
      className={`flex-shrink-0 bg-brand-soft ring-1 ring-border ${className ?? ""}`}
      style={
        url
          ? {
              backgroundImage: `url(${url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
      role="img"
      aria-label={label}
    />
  );
}

function FlagNameButton({ url, label }: { url?: string; label: string }) {
  const labelExibido = getCanonicalTeamName(label);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <FlagBox url={url} label={labelExibido} className="h-16 w-24 rounded-md sm:h-32 sm:w-48" />
      <span className="max-w-[6rem] truncate text-center text-xs font-semibold text-foreground sm:max-w-[12rem] sm:text-lg sm:font-bold">
        {labelExibido}
      </span>
    </div>
  );
}
function JogoRow({ jogo, flagMap }: { jogo: PartidaDestaque; flagMap: Record<string, string> }) {
  const isLive =
    jogo.status === "LIVE" ||
    jogo.status === "HT" ||
    jogo.status === "ET" ||
    jogo.status === "PEN_LIVE";
  const isHalfTime = jogo.status === "HT";
  const isFinished = ["FT", "AET", "PEN"].includes(jogo.status);
  const hora = jogo.inicia_em
    ? new Date(jogo.inicia_em).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      })
    : "";

  const goals = Array.isArray(jogo.gols) ? jogo.gols : [];
  const goalsA = goals.filter((g) => g.time_nome === jogo.time_a);
  const goalsB = goals.filter((g) => g.time_nome === jogo.time_b);

  const minuteLabel = isHalfTime
    ? "HT"
    : jogo.minuto
      ? `${jogo.minuto}${jogo.acrescimos ? `+${jogo.acrescimos}` : ""}'`
      : "LIVE";

  return (
    <div className={`rounded-xl ${isLive ? "bg-red-50 ring-1 ring-red-200" : "bg-muted/40"}`}>
      <div className="grid grid-cols-[4rem_minmax(0,1fr)_5rem_minmax(0,1fr)] items-center gap-2 px-2 py-4 sm:grid-cols-[5rem_minmax(0,1fr)_6rem_minmax(0,1fr)] sm:px-3 sm:py-5">
        <div className="min-w-0 text-center">
          {isLive ? (
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                </span>
                <span className="text-xs font-bold text-red-500">LIVE</span>
              </div>
              <span className="text-xs font-semibold text-red-400">{minuteLabel}</span>
            </div>
          ) : (
            <span
              className={`text-base font-medium ${isFinished ? "text-muted-foreground" : "text-brand"}`}
            >
              {hora}
            </span>
          )}
        </div>

        <div className="flex min-w-0 justify-center sm:justify-end">
          <FlagNameButton url={flagMap[jogo.time_a]} label={jogo.time_a} />
        </div>

        <div className="min-w-0 text-center">
          {isLive || isFinished ? (
            <span
              className={`text-xl font-extrabold tabular-nums sm:text-2xl ${isLive ? "text-red-500" : "text-muted-foreground"}`}
            >
              {jogo.placar_a} â€“ {jogo.placar_b}
            </span>
          ) : (
            <StylizedVersus compact />
          )}
        </div>

        <div className="flex min-w-0 justify-center sm:justify-start">
          <FlagNameButton url={flagMap[jogo.time_b]} label={jogo.time_b} />
        </div>
      </div>

      {/* Goal events â€” shown when there are scored goals */}
      {(goalsA.length > 0 || goalsB.length > 0) && (
        <div className="grid grid-cols-[1fr_auto_1fr] gap-x-2 border-t border-red-100 px-3 pb-2.5 pt-1.5 text-[10px] text-muted-foreground">
          <div className="space-y-0.5 text-right">
            {goalsA.map((g, i) => (
              <div key={i}>
                {g.marcador_nome ?? "â€”"}
                {g.tipo === "OWN" ? " (cg)" : g.tipo === "PENALTY" ? " (pen)" : ""}{" "}
                <span className="font-semibold text-foreground/70">
                  {g.minuto}
                  {g.acrescimos ? `+${g.acrescimos}` : ""}'
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-start justify-center pt-0.5 text-base leading-none">âš½</div>
          <div className="space-y-0.5">
            {goalsB.map((g, i) => (
              <div key={i}>
                <span className="font-semibold text-foreground/70">
                  {g.minuto}
                  {g.acrescimos ? `+${g.acrescimos}` : ""}'
                </span>{" "}
                {g.marcador_nome ?? "â€”"}
                {g.tipo === "OWN" ? " (cg)" : g.tipo === "PENALTY" ? " (pen)" : ""}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- INÍCIO ----------
function EditorialMatchRowLegacy({
  jogo,
  flagMap,
  live = false,
  jogoLocal,
  onPalpitar,
  onComentarios,
}: {
  jogo: PartidaDestaque;
  flagMap: Record<string, string>;
  live?: boolean;
  jogoLocal?: Jogo;
  onPalpitar?: (jogo: Jogo) => void;
  onComentarios?: (jogo: Jogo) => void;
}) {
  const hora = jogo.inicia_em
    ? new Date(jogo.inicia_em).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      })
    : "";
  const hasScore = live || ["FT", "AET", "PEN", "HT", "ET"].includes(jogo.status);
  const bloqueado = jogoLocal ? palpiteBloqueadoParaJogo(jogoLocal) : false;
  const ctaLabel = bloqueado ? "Ver comentários" : "Palpitar agora";
  return (
    <div
      className={
        "editorial-match-row grid grid-cols-[72px_1fr_auto_1fr] items-center gap-4 border-b border-black/10 px-3 py-3 last:border-b-0 " +
        (live ? "bg-red-50/80" : "bg-white/45")
      }
    >
      <div
        className={
          "flex h-full min-h-14 items-center justify-center text-base font-black tabular-nums " +
          (live ? "bg-red-600 text-white" : "bg-brand text-white")
        }
      >
        {live ? "LIVE" : hora}
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <FlagBox
          url={flagMap[jogo.time_a]}
          label={getCanonicalTeamName(jogo.time_a)}
          className="h-7 w-10 border border-black/10"
        />
        <span className="truncate text-[11px] font-black uppercase sm:text-xs">
          {getCanonicalTeamName(jogo.time_a)}
        </span>
      </div>
      <div
        className={
          "px-2 text-center text-sm font-black " + (live ? "text-red-600" : "text-foreground")
        }
      >
        {hasScore ? String(jogo.placar_a) + " - " + String(jogo.placar_b) : "X"}
      </div>
      <div className="flex min-w-0 items-center justify-end gap-2">
        <span className="truncate text-right text-[11px] font-black uppercase sm:text-xs">
          {getCanonicalTeamName(jogo.time_b)}
        </span>
        <FlagBox
          url={flagMap[jogo.time_b]}
          label={getCanonicalTeamName(jogo.time_b)}
          className="h-7 w-10 border border-black/10"
        />
      </div>
      {jogoLocal && (onPalpitar || onComentarios) && (
        <div className="col-span-full flex justify-end">
          <Button
            type="button"
            size="sm"
            className="h-8 rounded-none bg-[var(--site-accent)] px-4 text-[10px] font-black uppercase text-white hover:opacity-90"
            onClick={() => {
              if (bloqueado) onComentarios?.(jogoLocal);
              else onPalpitar?.(jogoLocal);
            }}
          >
            {ctaLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

function FlagTap({ url, label, className }: { url?: string; label: string; className?: string }) {
  const [showing, setShowing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const name = getCanonicalTeamName(label);
  const handleTap = () => {
    setShowing(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShowing(false), 2000);
  };
  return (
    <button
      type="button"
      className="relative flex-shrink-0 focus:outline-none"
      onClick={handleTap}
      aria-label={name}
    >
      <FlagBox url={url} label={name} className={className} />
      <span
        className={`sm:hidden pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap rounded bg-foreground/90 px-2 py-0.5 text-[9px] font-black uppercase text-white shadow-sm transition-opacity duration-150 ${showing ? "opacity-100" : "opacity-0"}`}
      >
        {name}
      </span>
    </button>
  );
}

function EditorialMatchRow({
  jogo,
  flagMap,
  live = false,
  jogoLocal,
  onPalpitar,
  onComentarios,
}: {
  jogo: PartidaDestaque;
  flagMap: Record<string, string>;
  live?: boolean;
  jogoLocal?: Jogo;
  onPalpitar?: (jogo: Jogo) => void;
  onComentarios?: (jogo: Jogo) => void;
}) {
  const hora = jogo.inicia_em
    ? new Date(jogo.inicia_em).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      })
    : "";
  const hasScore = live || ["FT", "AET", "PEN", "HT", "ET"].includes(jogo.status);
  const bloqueado = jogoLocal ? palpiteBloqueadoParaJogo(jogoLocal) : false;

  return (
    <div
      className={
        "editorial-match-row border-b border-black/10 last:border-b-0 " +
        (live ? "bg-red-50/80" : "bg-white/45")
      }
    >
      <div className="grid grid-cols-[44px_1fr_48px_1fr] sm:grid-cols-[68px_1fr_72px_1fr] md:grid-cols-[68px_1fr_72px_1fr_auto] items-center gap-x-2 px-2 py-3 sm:px-3 sm:py-4">
        {/* Horário — sempre mostra hora, nunca "LIVE" */}
        <div
          className={
            "flex flex-col h-full min-h-12 sm:min-h-[72px] items-center justify-center gap-1 text-xs sm:text-sm font-black tabular-nums " +
            (live ? "bg-red-600 text-white" : "bg-brand text-white")
          }
        >
          <span>{hora}</span>
          {live && <span className="h-1.5 w-1.5 rounded-full bg-white/80 animate-pulse" />}
        </div>

        {/* Time A: bandeira + nome empilhados, centralizado na coluna */}
        <div className="flex flex-col items-center gap-1">
          <FlagTap
            url={flagMap[jogo.time_a]}
            label={jogo.time_a}
            className="h-8 w-12 sm:h-10 sm:w-16 border border-black/10 shadow-sm"
          />
          <span className="text-center text-[9px] sm:text-[10px] font-black uppercase leading-tight">
            {getCanonicalTeamName(jogo.time_a)}
          </span>
        </div>

        {/* Placar */}
        <div
          className={
            "text-center text-sm sm:text-base font-black tabular-nums " +
            (live ? "text-red-600" : "text-foreground")
          }
        >
          {hasScore ? (
            <>
              {jogo.placar_a} - {jogo.placar_b}
            </>
          ) : (
            <div className="flex items-center justify-center">
              <StylizedVersus />
            </div>
          )}
        </div>

        {/* Time B: bandeira + nome empilhados, centralizado na coluna */}
        <div className="flex flex-col items-center gap-1">
          <FlagTap
            url={flagMap[jogo.time_b]}
            label={jogo.time_b}
            className="h-8 w-12 sm:h-10 sm:w-16 border border-black/10 shadow-sm"
          />
          <span className="text-center text-[9px] sm:text-[10px] font-black uppercase leading-tight">
            {getCanonicalTeamName(jogo.time_b)}
          </span>
        </div>

        {/* Botões */}
        {jogoLocal && (onPalpitar || onComentarios) && (
          <div className="col-span-full mt-2 flex gap-2 md:col-span-1 md:mt-0 md:flex-col md:justify-center">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 sm:h-9 flex-1 rounded-none border border-[#1f4d35] bg-[linear-gradient(180deg,#295f43_0%,#1f4d35_100%)] px-2 sm:px-3 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.04em] text-white shadow-[0_4px_12px_rgba(31,77,53,0.22)] hover:brightness-105"
              onClick={() => onComentarios?.(jogoLocal)}
            >
              Comentários
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={bloqueado}
              className="h-8 sm:h-9 flex-1 rounded-none border border-[#c89d2e] bg-[linear-gradient(180deg,#d8b04a_0%,#c99a2d_100%)] px-2 sm:px-3 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.04em] text-white shadow-[0_4px_12px_rgba(201,154,45,0.25)] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55"
              onClick={() => {
                if (!bloqueado) onPalpitar?.(jogoLocal);
              }}
            >
              {bloqueado ? "Encerrado" : "Palpitar"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function AcertoMoscaBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-[#e6cf90] bg-[#fff3cf] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#8d6710]">
      Acertou na mosca
    </span>
  );
}

function PalpiteirosDoDiaSection({
  winningPredictions,
}: {
  winningPredictions: WinningPrediction[];
}) {
  const cards = useMemo(() => {
    const grouped = new Map<string, WinningPrediction[]>();
    winningPredictions.forEach((item) => {
      grouped.set(item.jogoId, [...(grouped.get(item.jogoId) ?? []), item]);
    });

    return Array.from(grouped.entries())
      .map(([jogoId, winners]) => {
        const jogo = jogos.find((item) => item.id === jogoId);
        if (!jogo || winners.length === 0) return null;
        const latestWinner = winners.reduce((latest, current) =>
          current.createdAt > latest.createdAt ? current : latest,
        );
        return { jogo, winners, latestWinner };
      })
      .filter(
        (
          item,
        ): item is { jogo: Jogo; winners: WinningPrediction[]; latestWinner: WinningPrediction } =>
          Boolean(item),
      )
      .sort((a, b) => (b.jogo.data + b.jogo.hora).localeCompare(a.jogo.data + a.jogo.hora));
  }, [winningPredictions]);

  if (cards.length === 0) return null;

  return (
    <section className="editorial-section border-b border-[#e6cf90] bg-[#fff9ea] px-5 py-6 sm:px-8 lg:px-12">
      <div className="mb-3 flex items-center justify-between border-b border-[#ead7a3] pb-2">
        <div>
          <h2 className="text-lg font-black uppercase text-[#8d6710]">Palpiteiros da Copa</h2>
          <p className="mt-1 text-sm text-[#7b6a43]">
            Quem cravou placares exatos nos jogos já finalizados.
          </p>
        </div>
        <AcertoMoscaBadge />
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {cards.map(({ jogo, winners, latestWinner }) => {
          const a = getSelecao(jogo.selecaoA);
          const b = getSelecao(jogo.selecaoB);
          return (
            <div
              key={jogo.id}
              className="w-full max-w-xs rounded-2xl border border-[#e6cf90] bg-white/85 p-4 shadow-[0_10px_25px_rgba(201,154,45,0.08)] sm:w-72"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <Badge className="bg-[#c99a2d] text-white hover:bg-[#c99a2d]">
                  Grupo {jogo.grupo}
                </Badge>
                <div className="text-right text-[11px] font-semibold text-[#7b6a43]">
                  {jogo.data}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 text-center">
                  <img
                    src={flagUrl(jogo.selecaoA, 80)}
                    alt={flagAlt(jogo.selecaoA)}
                    className="mx-auto h-7 w-10 rounded-sm object-cover ring-1 ring-black/10"
                  />
                  <div className="mt-1 truncate text-[11px] font-black uppercase text-brand-dark">
                    {a?.nome}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-extrabold text-[#8d6710]">
                    {latestWinner.resultadoA} – {latestWinner.resultadoB}
                  </div>
                  <div className="text-[10px] font-bold uppercase text-[#aa8530]">
                    Placar cravado
                  </div>
                </div>
                <div className="min-w-0 text-center">
                  <img
                    src={flagUrl(jogo.selecaoB, 80)}
                    alt={flagAlt(jogo.selecaoB)}
                    className="mx-auto h-7 w-10 rounded-sm object-cover ring-1 ring-black/10"
                  />
                  <div className="mt-1 truncate text-[11px] font-black uppercase text-brand-dark">
                    {b?.nome}
                  </div>
                </div>
              </div>
              <div className="mt-3 rounded-xl bg-[#fff5d9] px-3 py-2">
                <div className="text-[10px] font-black uppercase tracking-wide text-[#8d6710]">
                  Quem acertou
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {winners.map((winner) => (
                    <span
                      key={winner.id}
                      className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-brand-dark ring-1 ring-[#ead7a3]"
                    >
                      {winner.usuarioNome}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function HeaderMobileWidget({ userId }: { userId: string }) {
  const { jogosAoVivo, jogosHoje } = useJogosHojeStore();
  const { data: winningPredictions = [] } = useWinningPredictionsQuery(userId);
  const flagMap = useSelecoesFlagMap();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const liveGame = (jogosAoVivo as PartidaDestaque[])[0];
  const nextGame = (jogosHoje as PartidaDestaque[]).find(
    (g) => g.status === "NS" && g.inicia_em && new Date(g.inicia_em).getTime() > now,
  );

  function countdown(inicia_em: string) {
    const diff = new Date(inicia_em).getTime() - now;
    if (diff <= 0) return "em breve";
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    if (h >= 24) return `${Math.floor(h / 24)}d`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}min`;
  }

  function TeamFlag({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
    const url = flagMap[name];
    if (!url) return null;
    const dims = size === "sm" ? "h-[15px] w-[22px]" : "h-[20px] w-[30px]";
    return (
      <span
        className={`inline-block ${dims} shrink-0 rounded-[2px] bg-cover bg-center`}
        style={{
          backgroundImage: `url(${url})`,
          boxShadow: "0 1px 3px rgb(0 0 0 / 0.3), inset 0 0 0 1px rgb(0 0 0 / 0.1)",
        }}
        role="img"
        aria-label={name}
      />
    );
  }

  const topScorer = useMemo(() => {
    const counts = new Map<string, number>();
    winningPredictions.forEach((w) =>
      counts.set(w.usuarioNome, (counts.get(w.usuarioNome) ?? 0) + 1),
    );
    if (counts.size === 0) return null;
    let topName = "";
    let topCount = 0;
    counts.forEach((count, name) => {
      if (count > topCount) {
        topCount = count;
        topName = name;
      }
    });
    return { name: topName, count: topCount };
  }, [winningPredictions]);

  const topScorerPredictions = useMemo(() => {
    if (!topScorer) return [];
    return winningPredictions
      .filter((wp) => wp.usuarioNome === topScorer.name)
      .sort((a, b) => a.data.localeCompare(b.data));
  }, [winningPredictions, topScorer]);

  const gameInfo = liveGame ? (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500" />
      <TeamFlag name={liveGame.time_a} />
      <span className="text-sm font-black text-red-600">
        {liveGame.placar_a ?? 0}×{liveGame.placar_b ?? 0}
      </span>
      <TeamFlag name={liveGame.time_b} />
      {liveGame.minuto && (
        <span className="rounded-full bg-red-100 px-1.5 py-px text-[11px] font-bold leading-tight text-red-600">
          {liveGame.minuto}'
        </span>
      )}
    </div>
  ) : nextGame?.inicia_em ? (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        Próx
      </span>
      <TeamFlag name={nextGame.time_a} />
      <span className="text-xs text-muted-foreground/40">×</span>
      <TeamFlag name={nextGame.time_b} />
      <span className="text-xs font-bold text-brand">· {countdown(nextGame.inicia_em)}</span>
    </div>
  ) : null;

  if (!gameInfo && !topScorer) return null;

  return (
    <div className="flex min-w-0 w-full flex-col justify-center gap-2 py-1 pr-3">
      {gameInfo}
      {topScorer && (
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="group flex items-center gap-2 text-left">
              <span className="text-[16px]">🏆</span>
              <span
                className="text-[22px] font-black italic leading-none tracking-tight"
                style={{ color: "var(--brand-dark)" }}
              >
                {topScorer.name}
              </span>
              <span className="rounded-full bg-brand/10 px-2 py-px text-[14px] font-bold leading-tight text-brand">
                {topScorer.count}
              </span>
              <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground/50 transition-transform group-data-[state=open]:rotate-180" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start" side="bottom">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Acertos de {topScorer.name}
            </p>
            {topScorerPredictions.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum acerto registrado.</p>
            ) : (
              <div className="space-y-2">
                {topScorerPredictions.map((wp) => {
                  const selA = getSelecao(wp.selecaoA);
                  const selB = getSelecao(wp.selecaoB);
                  const nomeA = selA?.nome ?? wp.selecaoA;
                  const nomeB = selB?.nome ?? wp.selecaoB;
                  return (
                    <div
                      key={wp.id}
                      className="flex items-center gap-1.5 rounded-md bg-muted/40 px-2 py-2"
                    >
                      <TeamFlag name={nomeA} size="sm" />
                      <span className="text-[11px] font-semibold leading-none">
                        {nomeA.split(" ")[0]}
                      </span>
                      <span className="mx-0.5 font-black text-brand">
                        {wp.resultadoA}×{wp.resultadoB}
                      </span>
                      <TeamFlag name={nomeB} size="sm" />
                      <span className="text-[11px] font-semibold leading-none">
                        {nomeB.split(" ")[0]}
                      </span>
                      <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                        {wp.data.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

function Inicio({
  palpites,
  winningPredictions,
  isAdmin,
  onDestaques,
  onJogos,
  onPalpite,
  onComentarios,
}: {
  palpites: Palpite[];
  winningPredictions: WinningPrediction[];
  isAdmin: boolean;
  onDestaques: () => void;
  onJogos: () => void;
  onPalpite: (jogo?: Jogo) => void;
  onComentarios: (jogo: Jogo) => void;
}) {
  const [heroBannerUrl, setHeroBannerUrl] = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem(HERO_BANNER_KEY) ?? "") : "",
  );
  const [heroBannerPos, setHeroBannerPos] = useState(() =>
    typeof window !== "undefined"
      ? parsePos(localStorage.getItem(HERO_BANNER_POS_KEY) ?? "")
      : { x: 50, y: 50 },
  );
  const [secondaryImage, setSecondaryImage] = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem(HOME_SECONDARY_IMAGE_KEY) ?? "") : "",
  );
  const [secondaryPos, setSecondaryPos] = useState(() =>
    typeof window !== "undefined"
      ? parsePos(localStorage.getItem(HOME_SECONDARY_POS_KEY) ?? "")
      : { x: 50, y: 50 },
  );
  const [heroWashIntensityDisplay, setHeroWashIntensityDisplay] = useState(() =>
    typeof window !== "undefined" ? Number(localStorage.getItem(HERO_WASH_KEY) ?? 75) : 75,
  );
  const [heroWashWidthDisplay, setHeroWashWidthDisplay] = useState(() =>
    typeof window !== "undefined" ? Number(localStorage.getItem(HERO_WASH_WIDTH_KEY) ?? 50) : 50,
  );
  const [theme, setTheme] = useState(readSiteTheme);
  const [classificacaoAberta, setClassificacaoAberta] = useState(false);
  const [simulacaoMataMata, setSimulacaoMataMata] = useState(() =>
    typeof window !== "undefined" && isAdmin
      ? localStorage.getItem(USAR_SIMULACAO_KEY) === "true"
      : false,
  );

  useEffect(() => {
    const syncBrand = () => {
      setHeroBannerUrl(localStorage.getItem(HERO_BANNER_KEY) ?? "");
      setHeroBannerPos(parsePos(localStorage.getItem(HERO_BANNER_POS_KEY) ?? ""));
      setSecondaryImage(localStorage.getItem(HOME_SECONDARY_IMAGE_KEY) ?? "");
      setSecondaryPos(parsePos(localStorage.getItem(HOME_SECONDARY_POS_KEY) ?? ""));
      setHeroWashIntensityDisplay(Number(localStorage.getItem(HERO_WASH_KEY) ?? 75));
      setHeroWashWidthDisplay(Number(localStorage.getItem(HERO_WASH_WIDTH_KEY) ?? 50));
    };
    const syncTheme = () => setTheme(readSiteTheme());
    window.addEventListener("vivicopa:logo-changed", syncBrand);
    window.addEventListener("vivicopa:theme-changed", syncTheme);
    return () => {
      window.removeEventListener("vivicopa:logo-changed", syncBrand);
      window.removeEventListener("vivicopa:theme-changed", syncTheme);
    };
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setSimulacaoMataMata(false);
      return;
    }
    setSimulacaoMataMata(localStorage.getItem(USAR_SIMULACAO_KEY) === "true");
  }, [isAdmin]);

  const { jogosAoVivo: _aoVivo, jogosHoje: _hoje, tituloSecao } = useJogosHojeStore();
  const { partidas: partidasComPlacarAoVivo } = usePartidasComPlacarAoVivo();
  const { data: brazilPlayers = [] } = useEspnBrazilPlayerTotals();
  const jogosAoVivo = _aoVivo as PartidaDestaque[];
  const jogosHoje = _hoje as PartidaDestaque[];
  const flagMap = useSelecoesFlagMap();
  const { classificacaoPorGrupo } = useClassificacaoGrupos();
  const destaquesHome = useMemo(
    () => buildBrazilHighlights(partidasComPlacarAoVivo, brazilPlayers),
    [partidasComPlacarAoVivo, brazilPlayers],
  );
  const jogosHome = useMemo(() => [...jogosAoVivo, ...jogosHoje], [jogosAoVivo, jogosHoje]);
  const partidasPorJogo = useMemo(() => mapearPartidasPorJogos(jogosHome), [jogosHome]);
  const jogoLocalPorPartidaId = useMemo(() => {
    const map = new Map<string, Jogo>();
    partidasPorJogo.forEach((partida, jogoId) => {
      const jogoLocal = jogos.find((item) => item.id === jogoId);
      if (jogoLocal) map.set(partida.id, jogoLocal);
    });
    return map;
  }, [partidasPorJogo]);
  const classificadosPorGrupo = useMemo(
    () =>
      grupos.map((grupo) => ({
        grupo,
        classificados: (classificacaoPorGrupo[grupo] ?? []).slice(0, 2),
      })),
    [classificacaoPorGrupo],
  );
  const mostrarChaveamentoNaHome = useMemo(() => {
    if (simulacaoMataMata) return true;
    return partidasComPlacarAoVivo.some(
        (partida) =>
          partida.fase &&
          ["LAST_32", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL", "THIRD_PLACE"].includes(
            partida.fase,
          ) &&
          ((partida.time_a && partida.time_a !== "A definir") ||
            (partida.time_b && partida.time_b !== "A definir")),
      );
  }, [partidasComPlacarAoVivo, simulacaoMataMata]);

  return (
    <div className="editorial-home">
      <section
        className={
          "editorial-hero relative w-full overflow-hidden " +
          (heroBannerUrl ? "has-image min-h-[420px] sm:min-h-[500px]" : "is-empty min-h-[500px]")
        }
      >
        {heroBannerUrl && (
          <img
            src={heroBannerUrl}
            alt=""
            aria-hidden="true"
            className="editorial-hero-img absolute"
            style={{
              width: "150%",
              height: "150%",
              maxWidth: "none",
              objectFit: "cover",
              top: `${-heroBannerPos.y * 0.5}%`,
              left: `${-heroBannerPos.x * 0.5}%`,
            }}
          />
        )}
        <div
          className="editorial-hero-wash absolute inset-0"
          style={{ opacity: heroWashIntensityDisplay / 100, background: washGradient(heroWashWidthDisplay) }}
        />
        <div className="editorial-hero-copy relative z-10 flex flex-col justify-center items-start px-6 py-8 min-h-[420px] sm:min-h-[500px] sm:max-w-[48rem] sm:py-12 sm:px-10 lg:px-12">
          <div className="flex items-stretch gap-4 sm:gap-6">
            <div className="w-[5px] sm:w-[7px] flex-shrink-0 bg-brand" />
            <div className="flex flex-col" style={{ textShadow: "2px 2px 0 rgba(0,0,0,0.42), 1px 1px 0 rgba(0,0,0,0.22)" }}>
              <h1
                className="site-display font-black uppercase leading-[0.86] text-brand"
                style={{ letterSpacing: `${theme.titleTracking}em` }}
              >
                <span className="block text-[4.5rem] sm:text-[6.5rem] lg:text-[9rem]">
                  {theme.title.slice(0, Math.ceil(theme.title.length / 2))}
                </span>
                <span className="block text-[4.5rem] sm:text-[6.5rem] lg:text-[9rem]">
                  {theme.title.slice(Math.ceil(theme.title.length / 2))}
                </span>
              </h1>
              <div className="mt-3 sm:mt-4">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--site-accent)] sm:text-[13px]">
                  EDIÇÃO ESPECIAL · COPA 2026
                </p>
                <p className="mt-2 site-display text-[26px] font-black uppercase leading-tight text-[var(--site-accent)] sm:text-[34px]">
                  A Copa que nasceu para a resenha
                </p>
                <span className="mt-3 block h-[2px] w-10 bg-[var(--site-accent)]" />
              </div>
              <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-[var(--site-ink)]/70 sm:mt-5 sm:max-w-sm sm:text-sm">
                {theme.subtitle}
              </p>
              <div className="mt-7 flex flex-wrap gap-3 sm:mt-8" style={{ textShadow: "none" }}>
                <Button
                  onClick={onJogos}
                  className="h-10 min-w-36 rounded-none bg-brand px-6 text-[10px] font-black uppercase text-white hover:opacity-90"
                >
                  Ver jogos →
                </Button>
                <Button
                  onClick={() => onPalpite()}
                  variant="outline"
                  className="h-10 min-w-36 rounded-none border border-[var(--site-accent)] bg-[var(--site-accent)] px-6 text-[10px] font-black uppercase text-white hover:opacity-90"
                >
                  Palpitar
                </Button>
              </div>
            </div>
          </div>
        </div>
        {!heroBannerUrl && (
          <div className="editorial-image-placeholder absolute bottom-5 right-5 max-w-52 border border-brand/30 bg-[var(--site-surface)]/90 px-4 py-3 text-center text-[10px] font-black uppercase text-brand">
            Espaço reservado para a imagem principal. Configure no painel Admin.
          </div>
        )}
      </section>

      <section className="editorial-section paper-surface px-5 py-5 sm:px-8 lg:px-7">
        <div className="mb-3 flex items-end justify-between border-b border-black/25 pb-2">
          <h2 className="site-section-title text-base font-black uppercase text-foreground">
            Brasil em Destaque
          </h2>
          <button
            type="button"
            onClick={onDestaques}
            className="text-xs font-black uppercase text-brand"
          >
            Ver todos
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <HighlightsCardsGrid
            highlights={destaquesHome}
            emptyMessage="As informações do Brasil aparecerão aqui assim que a ESPN e as partidas sincronizadas tiverem estatísticas suficientes."
          />

          <div className="rounded-xl border border-black/8 bg-white/55 px-4 py-4">
            <div className="mb-3 flex items-center justify-between border-b border-black/10 pb-2">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.12em] text-brand">
                  Seleção especial
                </div>
                <h3 className="text-sm font-black uppercase text-foreground">Anfitriões</h3>
              </div>
              <span className="text-[9px] font-bold uppercase text-muted-foreground">
                Copa 2026
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {PAISES_SEDE.map((p) => (
                <div
                  key={p.id}
                  className="editorial-highlight-card border border-black/8 px-4 py-3 text-center"
                >
                  <img
                    src={flagUrl(p.id, 160)}
                    alt={flagAlt(p.id)}
                    className="mx-auto h-10 w-16 object-cover shadow-sm"
                  />
                  <div className="mt-2 text-[11px] font-black uppercase">{p.nome}</div>
                  <span className="mt-1.5 inline-block bg-[#174b66] px-3 py-1 text-[8px] font-black uppercase text-white">
                    Anfitrião
                  </span>
                </div>
              ))}
            </div>
          </div>

          {mostrarChaveamentoNaHome ? (
            <div className="rounded-[28px] border border-black/8 bg-white/55 p-3 sm:p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-black/10 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase text-brand-dark">
                    Mata-mata em destaque
                  </span>
                  {simulacaoMataMata && (
                    <span className="rounded-full bg-brand px-2 py-0.5 text-[9px] font-black uppercase text-white">
                      Simulação
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold uppercase text-muted-foreground">
                    Atualização automática
                  </span>
                  {isAdmin && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-7 rounded-none border-black/10 bg-white/80 px-3 text-[9px] font-black uppercase tracking-wide"
                      onClick={() => {
                        const proximo = !simulacaoMataMata;
                        localStorage.setItem(USAR_SIMULACAO_KEY, String(proximo));
                        setSimulacaoMataMata(proximo);
                      }}
                    >
                      {simulacaoMataMata ? "Ver dados reais" : "Simular mata-mata"}
                    </Button>
                  )}
                </div>
              </div>
              <ChaveamentoAutomatico
                previewMode
                allowSimulation={isAdmin}
                simulating={simulacaoMataMata}
              />
            </div>
          ) : (
            <>
              <button
                type="button"
                className="flex sm:hidden w-full items-center justify-between rounded-lg border border-black/10 bg-white/60 px-4 py-2.5"
                onClick={() => setClassificacaoAberta((v) => !v)}
              >
                <span className="text-[11px] font-black uppercase text-brand-dark">
                  Classificação por Grupos
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-brand transition-transform duration-200 ${classificacaoAberta ? "rotate-180" : ""}`}
                />
              </button>
              {isAdmin && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-none border-black/10 bg-white/80 px-3 text-[9px] font-black uppercase tracking-wide"
                    onClick={() => {
                      localStorage.setItem(USAR_SIMULACAO_KEY, "true");
                      setSimulacaoMataMata(true);
                    }}
                  >
                    Simular mata-mata
                  </Button>
                </div>
              )}

              <div
                className={`grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 ${classificacaoAberta ? "grid" : "hidden sm:grid"}`}
              >
                {classificadosPorGrupo.map(({ grupo, classificados }) => (
                  <div key={grupo} className="rounded-xl border border-black/8 bg-white/70 px-4 py-3">
                    <div className="mb-2 flex items-center justify-between border-b border-black/10 pb-2">
                      <span className="text-[11px] font-black uppercase text-brand-dark">
                        Grupo {grupo}
                      </span>
                      <span className="text-[9px] font-bold uppercase text-muted-foreground">
                        Top 2
                      </span>
                    </div>
                    <div className="space-y-2">
                      {classificados.map((time, index) => {
                        const selecaoId = resolveTeamIdByName(time.nome) ?? "";
                        const nome = getCanonicalTeamName(time.nome);
                        return (
                          <div
                            key={`${grupo}-${time.nome}`}
                            className="flex items-center justify-between rounded-lg bg-brand-soft/40 px-3 py-2"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="text-[10px] font-black text-brand">{index + 1}º</span>
                              {selecaoId ? (
                                <img
                                  src={flagUrl(selecaoId, 80)}
                                  alt={flagAlt(selecaoId)}
                                  className="h-4 w-6 rounded-sm object-cover shadow-sm"
                                />
                              ) : (
                                <div className="h-4 w-6 rounded-sm border border-black/10 bg-brand-soft" />
                              )}
                              <span className="truncate text-[11px] font-black uppercase text-foreground">
                                {nome}
                              </span>
                            </div>
                            <span className="text-[11px] font-black text-brand-dark">
                              {time.pts} pts
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <section
        className="overflow-hidden py-3"
        style={{
          backgroundColor: "#2C3828",
          maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
        }}
      >
        <div
          className="flex items-center gap-6"
          style={{ animation: "vivicopa-marquee 60s linear infinite", width: "max-content" }}
        >
          {[...selecoes, ...selecoes].map((s, i) => {
            const flagUrl = flagMap[s.nome];
            return (
              <div
                key={i}
                className="relative shrink-0 overflow-hidden rounded-[3px]"
                style={{ boxShadow: "0 3px 10px rgb(0 0 0 / 0.4)" }}
              >
                {flagUrl ? (
                  <div
                    className="h-[28px] w-[42px] bg-cover bg-center"
                    style={{ backgroundImage: `url(${flagUrl})` }}
                    role="img"
                    aria-label={s.nome}
                  />
                ) : (
                  <span
                    className="flex h-[28px] w-[42px] items-center justify-center text-xl leading-none"
                    aria-label={s.nome}
                  >
                    {s.bandeiraEmoji}
                  </span>
                )}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(145deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.04) 45%, rgba(0,0,0,0.08) 100%)",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.5), inset 0 0 0 1px rgba(255,255,255,0.18)",
                  }}
                />
              </div>
            );
          })}
        </div>
      </section>

      <PalpiteirosDoDiaSection winningPredictions={winningPredictions} />

      {jogosAoVivo.length > 0 && (
        <section className="editorial-section border-b border-red-200 bg-red-50 px-5 py-6 sm:px-8 lg:px-12">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-black uppercase text-red-700">Jogos ao vivo</h2>
            <span className="flex items-center gap-2 text-xs font-black uppercase text-red-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" /> Atualização
              automática
            </span>
          </div>
          <div className="border border-red-200">
            {jogosAoVivo.map((jogo) => (
              <EditorialMatchRow
                key={jogo.id}
                jogo={jogo}
                flagMap={flagMap}
                live
                jogoLocal={jogoLocalPorPartidaId.get(jogo.id)}
                onPalpitar={onPalpite}
                onComentarios={onComentarios}
              />
            ))}
          </div>
        </section>
      )}

      <section className="grid min-h-[300px] lg:grid-cols-[3fr_2fr]">
        <div className="paper-surface px-5 py-6 sm:px-8 lg:px-7">
          <div className="mb-3 flex items-center justify-between border-b border-black/20 pb-2">
            <h2 className="site-section-title text-lg font-black uppercase">{tituloSecao}</h2>
          </div>
          <div className="border border-black/10">
            {jogosHoje.length > 0 ? (
              [...jogosHoje]
                .sort((a, b) => String(a.inicia_em ?? "").localeCompare(String(b.inicia_em ?? "")))
                .map((jogo) => (
                  <EditorialMatchRow
                    key={jogo.id}
                    jogo={jogo}
                    flagMap={flagMap}
                    live={["LIVE", "HT", "ET", "PEN_LIVE"].includes(jogo.status)}
                    jogoLocal={jogoLocalPorPartidaId.get(jogo.id)}
                    onPalpitar={onPalpite}
                    onComentarios={onComentarios}
                  />
                ))
            ) : (
              <div className="px-5 py-12 text-center text-sm font-semibold text-muted-foreground">
                Nenhum jogo programado neste momento.
              </div>
            )}
          </div>
        </div>
        <div
          className={
            "editorial-secondary-image relative min-h-[280px] overflow-hidden " +
            (secondaryImage ? "has-image" : "is-empty")
          }
        >
          {secondaryImage && (
            <img
              src={secondaryImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: `${secondaryPos.x}% ${secondaryPos.y}%` }}
            />
          )}
          <button
            type="button"
            onClick={onJogos}
            className="absolute bottom-4 right-5 z-10 text-[9px] font-black uppercase text-foreground/65"
          >
            Ver calendário
          </button>
          {!secondaryImage && (
            <div className="absolute inset-0 flex items-center justify-center border-l border-black/10 p-8 text-center text-[10px] font-black uppercase text-muted-foreground">
              Espaço reservado para a imagem secundária. Configure no painel Admin.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function jogoSlot(jogo: Jogo) {
  return `${jogo.data}T${jogo.hora}`;
}

function partidaSlot(iniciaEm: string | null) {
  if (!iniciaEm) return "";
  const brasilia = new Date(new Date(iniciaEm).getTime() - 3 * 60 * 60 * 1000);
  return brasilia.toISOString().slice(0, 16);
}

function grupoApiParaLocal(grupo?: string | null) {
  if (!grupo) return null;
  return grupo.replace(/^GROUP_/i, "");
}

function mapearPartidasPorJogos<
  T extends { inicia_em: string | null; time_a?: string; time_b?: string },
>(partidas: T[]) {
  const jogosOrdenados = [...jogos].sort((a, b) =>
    (a.data + a.hora).localeCompare(b.data + b.hora),
  );
  const jogosPorSlot = new Map<string, Jogo[]>();
  jogosOrdenados.forEach((jogo) => {
    const slot = jogoSlot(jogo);
    jogosPorSlot.set(slot, [...(jogosPorSlot.get(slot) ?? []), jogo]);
  });

  const usadosPorSlot = new Map<string, number>();
  const map = new Map<string, T>();
  const naoMapeadas: T[] = [];
  const jogoTimestamp = (jogo: Jogo) => new Date(`${jogo.data}T${jogo.hora}:00-03:00`).getTime();
  const isSameTeams = (jogo: Jogo, idA: string, idB: string) =>
    (jogo.selecaoA === idA && jogo.selecaoB === idB) || (jogo.selecaoA === idB && jogo.selecaoB === idA);

  partidas
    .slice()
    .sort((a, b) => String(a.inicia_em ?? "").localeCompare(String(b.inicia_em ?? "")))
    .forEach((partida) => {
      const slot = partidaSlot(partida.inicia_em);
      const candidatos = jogosPorSlot.get(slot);
      if (!candidatos?.length) {
        naoMapeadas.push(partida);
        return;
      }
      const index = usadosPorSlot.get(slot) ?? 0;
      const jogo = candidatos[index];
      if (!jogo) {
        naoMapeadas.push(partida);
        return;
      }
      map.set(jogo.id, partida);
      usadosPorSlot.set(slot, index + 1);
    });

  // Fallback: match by team names on the same BRT date (handles API time offsets)
  naoMapeadas.forEach((partida) => {
    if (!partida.time_a || !partida.time_b) return;
    const idA = resolveTeamIdByName(partida.time_a);
    const idB = resolveTeamIdByName(partida.time_b);
    if (!idA || !idB) return;
    const dataBrt = partida.inicia_em
      ? new Date(new Date(partida.inicia_em).getTime() - 3 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10)
      : null;
    if (!dataBrt) return;
    const jogo = jogosOrdenados.find(
      (j) =>
        !map.has(j.id) &&
        j.data === dataBrt &&
        isSameTeams(j, idA, idB),
    );
    if (jogo) map.set(jogo.id, partida);
  });

  // Fallback final: match by teams only and choose the closest scheduled local game.
  naoMapeadas.forEach((partida) => {
    if ([...map.values()].includes(partida)) return;
    if (!partida.time_a || !partida.time_b || !partida.inicia_em) return;

    const idA = resolveTeamIdByName(partida.time_a);
    const idB = resolveTeamIdByName(partida.time_b);
    if (!idA || !idB) return;

    const partidaTs = new Date(partida.inicia_em).getTime();
    const candidatos = jogosOrdenados
      .filter((jogo) => !map.has(jogo.id) && isSameTeams(jogo, idA, idB))
      .sort((a, b) => Math.abs(jogoTimestamp(a) - partidaTs) - Math.abs(jogoTimestamp(b) - partidaTs));

    if (candidatos[0]) map.set(candidatos[0].id, partida);
  });

  return map;
}
type JogoResultado = GameResult & {
  id: string;
  inicia_em: string | null;
};

// useResultadosPorJogo substituído por usePartidasResultados() + mapearPartidasPorJogos() no componente pai
// ---------- JOGOS ----------
function JogosTab({
  palpitesPorJogo,
  meusAcertosPorJogo,
  acertadoresPorJogo,
  onPalpitar,
  onComentarios,
  resultadosPorJogo,
  grupoInicial = "todos",
  onConsumirGrupo,
}: {
  palpitesPorJogo: Map<string, number>;
  meusAcertosPorJogo: Map<string, Palpite>;
  acertadoresPorJogo: Map<string, WinningPrediction[]>;
  onPalpitar: (j: Jogo) => void;
  onComentarios: (j: Jogo) => void;
  resultadosPorJogo: Map<string, JogoResultado>;
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
    return jogos
      .filter((j) => {
        if (filtroGrupo !== "todos" && j.grupo !== filtroGrupo) return false;
        if (filtroData && j.data !== filtroData) return false;
        if (
          filtroSelecao !== "todas" &&
          j.selecaoA !== filtroSelecao &&
          j.selecaoB !== filtroSelecao
        )
          return false;
        const tem = (palpitesPorJogo.get(j.id) ?? 0) > 0;
        if (filtroStatus === "com" && !tem) return false;
        if (filtroStatus === "sem" && tem) return false;
        return true;
      })
      .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
  }, [filtroGrupo, filtroData, filtroSelecao, filtroStatus, palpitesPorJogo]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-3 shadow-card md:grid-cols-4">
        <div>
          <Label className="text-xs">Grupo</Label>
          <Select value={filtroGrupo} onValueChange={setFiltroGrupo}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {grupos.map((g) => (
                <SelectItem key={g} value={g}>
                  Grupo {g}
                </SelectItem>
              ))}
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
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="todas">Todas</SelectItem>
              {selecoes.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.bandeiraEmoji} {s.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="com">Com palpite</SelectItem>
              <SelectItem value="sem">Sem palpite</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="games-grid grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {lista.map((j) => (
          <GameCard
            key={j.id}
            jogo={j}
            qtdPalpites={palpitesPorJogo.get(j.id) ?? 0}
            resultado={resultadosPorJogo.get(j.id)}
            acertouNaMosca={meusAcertosPorJogo.has(j.id)}
            acertadores={acertadoresPorJogo.get(j.id) ?? []}
            onPalpitar={onPalpitar}
            onComentarios={onComentarios}
          />
        ))}
        {lista.length === 0 && (
          <div className="col-span-full py-10 text-center text-muted-foreground">
            Nenhum jogo encontrado com esses filtros.
          </div>
        )}
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
          <div
            key={s.id}
            className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:shadow-brand"
          >
            <div className="flex items-center justify-center bg-brand-soft p-4">
              <img
                src={flagUrl(s.id, 160)}
                alt={flagAlt(s.id)}
                loading="lazy"
                className="h-20 w-32 rounded-md object-cover shadow-md ring-1 ring-border"
              />
            </div>
            <div className="flex flex-1 flex-col p-4">
              <div className="font-bold text-brand-dark">{s.nome}</div>
              <Badge className="mt-1 w-fit bg-brand-light text-brand-dark hover:bg-brand-light">
                Grupo {s.grupo}
              </Badge>
              <div className="mt-2 text-xs text-muted-foreground">Técnico: {s.tecnico}</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-md bg-brand-soft/70 p-1.5">
                  <div className="text-sm font-extrabold text-brand-dark">{st.participacoes}</div>
                  <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
                    Copas
                  </div>
                </div>
                <div className="rounded-md bg-brand-soft/70 p-1.5">
                  <div className="flex items-center justify-center gap-0.5 text-sm font-extrabold text-brand-dark">
                    <Trophy className="h-3 w-3 text-brand" />
                    {st.titulos}
                  </div>
                  <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
                    Títulos
                  </div>
                </div>
              </div>
              <Button
                onClick={() => onAbrir(s)}
                className="mt-3 bg-gradient-brand text-white hover:opacity-90"
              >
                Ver elenco
              </Button>
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
  j: number;
  v: number;
  e: number;
  d: number;
  gp: number;
  gc: number;
  sg: number;
  pts: number;
};

function DestaquesTab() {
  const { partidas: partidasComPlacarAoVivo } = usePartidasComPlacarAoVivo();
  const { data: scorerRanking = [] } = useEspnTournamentScorers();
  const destaques = useMemo(
    () => buildTournamentHighlightsWithScorers(partidasComPlacarAoVivo, scorerRanking),
    [partidasComPlacarAoVivo, scorerRanking],
  );

  return (
    <section className="editorial-section paper-surface px-5 py-5 sm:px-8 lg:px-7">
      <div className="mb-4 flex items-end justify-between border-b border-black/25 pb-2">
        <div>
          <h2 className="site-section-title text-base font-black uppercase text-foreground">
            Destaques do Torneio
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Rankings ao vivo com gols, posse, disciplina e finalizações.
          </p>
        </div>
      </div>
      <HighlightsCardsGrid
        highlights={destaques}
        emptyMessage="Os destaques do torneio aparecerão aqui assim que a ESPN e as partidas sincronizadas tiverem estatísticas suficientes."
      />
    </section>
  );
}

function useClassificacaoGrupos() {
  const partidasGrupo = usePartidasGrupo();
  const flagMapGrupos = useSelecoesFlagMap();

  const classificacaoPorGrupo = useMemo(() => {
    const FINISHED = new Set(["FT", "AET", "PEN"]);
    const tabelas: Record<string, Record<string, EntradaClassificacao>> = {};

    grupos.forEach((grupo) => {
      tabelas[grupo] = {};
      selecoes
        .filter((selecao) => selecao.grupo === grupo)
        .forEach((selecao) => {
          tabelas[grupo][selecao.nome] = {
            nome: selecao.nome,
            j: 0,
            v: 0,
            e: 0,
            d: 0,
            gp: 0,
            gc: 0,
            sg: 0,
            pts: 0,
          };
        });
    });

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
      const pa = p.placar_a ?? 0;
      const pb = p.placar_b ?? 0;
      a.j++;
      b.j++;
      a.gp += pa;
      a.gc += pb;
      b.gp += pb;
      b.gc += pa;
      a.sg = a.gp - a.gc;
      b.sg = b.gp - b.gc;
      if (pa > pb) {
        a.v++;
        a.pts += 3;
        b.d++;
      } else if (pb > pa) {
        b.v++;
        b.pts += 3;
        a.d++;
      } else {
        a.e++;
        a.pts++;
        b.e++;
        b.pts++;
      }
    }

    const sorted: Record<string, EntradaClassificacao[]> = {};
    for (const [grupo, tabela] of Object.entries(tabelas)) {
      sorted[grupo] = Object.values(tabela).sort((x, y) =>
        y.pts !== x.pts
          ? y.pts - x.pts
          : y.sg !== x.sg
            ? y.sg - x.sg
            : y.gp !== x.gp
              ? y.gp - x.gp
              : x.nome.localeCompare(y.nome),
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
    <div className="games-grid grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {grupos.map((g) => {
        const tabela = classificacaoPorGrupo[g] ?? [];
        return (
          <div key={g} className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-lg font-extrabold text-brand-dark">Grupo {g}</div>
              <Badge className="bg-brand-light text-brand-dark hover:bg-brand-light">
                {tabela.length || 4} seleções
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[360px]">
                <div className="mb-1 grid grid-cols-[1.25rem_minmax(0,1fr)_1.6rem_1.6rem_1.6rem_1.6rem_1.8rem_1.8rem_2rem] items-center gap-x-1 px-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>#</span>
                  <span>Seleção</span>
                  <span className="text-center">J</span>
                  <span className="text-center">V</span>
                  <span className="text-center">E</span>
                  <span className="text-center">D</span>
                  <span className="text-center">GP</span>
                  <span className="text-center">GC</span>
                  <span className="text-center">SG</span>
                  <span className="text-center font-bold">Pts</span>
                </div>

                <ul className="space-y-1">
                  {tabela.map((entry, idx) => (
                    <li
                      key={entry.nome}
                      className={`grid grid-cols-[1.25rem_minmax(0,1fr)_1.6rem_1.6rem_1.6rem_1.6rem_1.8rem_1.8rem_2rem] items-center gap-x-1 rounded-lg px-2 py-1.5 text-xs ${
                        idx < 2 ? "bg-green-50 ring-1 ring-green-100" : "bg-brand-soft/40"
                      }`}
                    >
                      <span
                        className={`text-center text-[10px] font-bold ${idx < 2 ? "text-green-600" : "text-muted-foreground"}`}
                      >
                        {idx + 1}
                      </span>
                      <div className="flex min-w-0 items-center gap-1.5">
                        <FlagBox
                          url={flagMapGrupos[entry.nome]}
                          label={getCanonicalTeamName(entry.nome)}
                          className="h-4 w-6 rounded-sm"
                        />
                        <span className="truncate font-medium">
                          {getCanonicalTeamName(entry.nome)}
                        </span>
                      </div>
                      <span className="text-center text-[11px]">{entry.j}</span>
                      <span className="text-center text-[11px]">{entry.v}</span>
                      <span className="text-center text-[11px]">{entry.e}</span>
                      <span className="text-center text-[11px]">{entry.d}</span>
                      <span className="text-center text-[11px]">{entry.gp}</span>
                      <span className="text-center text-[11px]">{entry.gc}</span>
                      <span className="text-center text-[11px]">
                        {entry.sg > 0 ? `+${entry.sg}` : entry.sg}
                      </span>
                      <span
                        className={`text-center text-[11px] font-extrabold tabular-nums ${entry.pts > 0 ? "text-brand" : ""}`}
                      >
                        {entry.pts}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

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
function MeusPalpitesTab({
  usuario,
  palpites,
  onEditar,
  onExcluir,
  resultadosPorJogo,
  meusAcertosPorJogo,
  acertadoresPorJogo,
}: {
  usuario: AuthProfile;
  palpites: Palpite[];
  onEditar: (p: Palpite) => void;
  onExcluir: (p: Palpite) => void;
  resultadosPorJogo?: Map<string, JogoResultado>;
  meusAcertosPorJogo: Map<string, Palpite>;
  acertadoresPorJogo: Map<string, WinningPrediction[]>;
}) {
  const meus = palpites.filter((p) => p.usuarioId === usuario.id);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="text-xs font-semibold uppercase tracking-wide text-brand">
          Meus palpites
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          Exibindo palpites registrados por{" "}
          <span className="font-semibold text-brand-dark">{usuario.username}</span>.
        </div>
      </div>

      {meus.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground">Você ainda não fez palpites.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {meus.map((p) => {
            const j = jogos.find((x) => x.id === p.jogoId);
            const a = getSelecao(p.selecaoA);
            const b = getSelecao(p.selecaoB);
            const bloqueado = j ? palpiteBloqueadoParaJogo(j, resultadosPorJogo?.get(j.id)) : true;
            const resultado = resultadosPorJogo?.get(p.jogoId);
            const acertouNaMosca = meusAcertosPorJogo.has(p.jogoId);
            const finalizado = isFinishedMatchStatus(resultado?.status);
            const acertadores = acertadoresPorJogo.get(p.jogoId) ?? [];
            const outrosAcertadores = acertadores.filter((a) => a.usuarioId !== usuario.id);
            return (
              <div
                key={p.id}
                className={`rounded-2xl border bg-card p-4 shadow-card ${acertouNaMosca ? "border-[#c99a2d] ring-1 ring-[#f0d48d]" : "border-border"}`}
              >
                <div className="mb-2 flex items-center justify-between text-xs">
                  <Badge className="bg-brand-light text-brand-dark hover:bg-brand-light">
                    Grupo {j?.grupo}
                  </Badge>
                  <div className="flex items-center gap-2">
                    {acertouNaMosca && <AcertoMoscaBadge />}
                    <span className="text-muted-foreground">
                      {new Date(p.dataCriacao).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-around text-center">
                  <PalpiteTime selecaoId={p.selecaoA} nome={a?.nome} />
                  <div
                    className={`text-2xl font-extrabold ${acertouNaMosca ? "text-[#b07e16]" : "text-brand"}`}
                  >
                    {p.placarA} – {p.placarB}
                  </div>
                  <PalpiteTime selecaoId={p.selecaoB} nome={b?.nome} />
                </div>
                {finalizado && resultado && (
                  <div
                    className={`mt-3 rounded-xl px-3 py-2 text-center text-sm ${acertouNaMosca ? "bg-[#fff5d9] text-[#7a5a10]" : "bg-brand-soft/60 text-muted-foreground"}`}
                  >
                    Resultado oficial:{" "}
                    <span className="font-black">
                      {resultado.placar_a} – {resultado.placar_b}
                    </span>
                  </div>
                )}
                {acertadores.length > 0 && (
                  <div className="mt-2 rounded-xl border border-[#e6cf90] bg-[#fff7df] px-3 py-2 text-xs text-[#6f5310]">
                    <div className="font-black uppercase tracking-wide">Acertaram na mosca</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {acertadores.map((item) => (
                        <span
                          key={item.id}
                          className={`rounded-full px-2 py-0.5 font-semibold shadow-sm ring-1 ring-[#ead7a3] ${item.usuarioId === usuario.id ? "bg-[#fff3cf] text-[#8d6710]" : "bg-white"}`}
                        >
                          {item.usuarioNome}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {finalizado && acertadores.length === 0 && (
                  <div className="mt-2 rounded-xl bg-brand-soft/40 px-3 py-2 text-center text-xs text-muted-foreground">
                    Ninguém acertou na mosca
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    disabled={bloqueado}
                    onClick={() => onEditar(p)}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    disabled={bloqueado}
                    onClick={() => onExcluir(p)}
                  >
                    Excluir
                  </Button>
                </div>
                {bloqueado && (
                  <div className="mt-2 text-center text-xs text-muted-foreground">
                    Palpites encerrados para este jogo.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- TABELA ----------
function TabelaTab({ usuario, palpites }: { usuario: AuthProfile; palpites: Palpite[] }) {
  const [fGrupo, setFGrupo] = useState("todos");
  const [fSelecao, setFSelecao] = useState("todas");
  const [fJogo, setFJogo] = useState("todos");

  const lista = useMemo(() => {
    return palpites
      .filter((p) => {
        const j = jogos.find((x) => x.id === p.jogoId);
        if (!j) return false;
        if (fGrupo !== "todos" && j.grupo !== fGrupo) return false;
        if (fSelecao !== "todas" && p.selecaoA !== fSelecao && p.selecaoB !== fSelecao)
          return false;
        if (fJogo !== "todos" && p.jogoId !== fJogo) return false;
        return true;
      })
      .sort((a, b) => b.dataCriacao.localeCompare(a.dataCriacao));
  }, [palpites, fGrupo, fSelecao, fJogo]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="text-xs font-semibold uppercase tracking-wide text-brand">
          Palpites privados
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          Apenas <span className="font-semibold text-brand-dark">{usuario.username}</span> visualiza
          estes palpites.
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-3 shadow-card md:grid-cols-4">
        <div>
          <Label className="text-xs">Grupo</Label>
          <Select value={fGrupo} onValueChange={setFGrupo}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {grupos.map((g) => (
                <SelectItem key={g} value={g}>
                  Grupo {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Seleção</Label>
          <Select value={fSelecao} onValueChange={setFSelecao}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="todas">Todas</SelectItem>
              {selecoes.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.bandeiraEmoji} {s.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Jogo</Label>
          <Select value={fJogo} onValueChange={setFJogo}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="todos">Todos</SelectItem>
              {jogos.map((j) => {
                const a = getSelecao(j.selecaoA);
                const b = getSelecao(j.selecaoB);
                return (
                  <SelectItem key={j.id} value={j.id}>
                    {a?.nome} VS {b?.nome}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-gradient-brand text-white">
            <tr className="text-left">
              <Th>Grupo</Th>
              <Th>Jogo</Th>
              <Th className="hidden sm:table-cell">Data</Th>
              <Th>Palpite</Th>
              <Th className="hidden sm:table-cell">Registro</Th>
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => {
              const j = jogos.find((x) => x.id === p.jogoId);
              const a = getSelecao(p.selecaoA);
              const b = getSelecao(p.selecaoB);
              return (
                <tr key={p.id} className="border-t border-border odd:bg-brand-soft/50">
                  <Td>{j?.grupo}</Td>
                  <Td>
                    <div className="flex min-w-[240px] flex-wrap items-center gap-1.5">
                      <TabelaTime selecaoId={p.selecaoA} nome={a?.nome} />
                      <span className="px-0.5 text-xs font-semibold text-muted-foreground">VS</span>
                      <TabelaTime selecaoId={p.selecaoB} nome={b?.nome} />
                    </div>
                  </Td>
                  <Td className="hidden sm:table-cell">{j?.data}</Td>
                  <Td className="font-bold text-brand">
                    {p.placarA} – {p.placarB}
                  </Td>
                  <Td className="hidden sm:table-cell text-xs text-muted-foreground">
                    {new Date(p.dataCriacao).toLocaleDateString("pt-BR")}
                  </Td>
                </tr>
              );
            })}
            {lista.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-muted-foreground">
                  Nenhum palpite ainda.
                </td>
              </tr>
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

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide ${className}`}>
      {children}
    </th>
  );
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

type CalendarioResultado = {
  id: string;
  time_a?: string;
  time_b?: string;
  placar_a: number;
  placar_b: number;
  status: string;
  inicia_em: string | null;
  minuto?: number | null;
  acrescimos?: number | null;
};

function isPartidaAoVivo(status?: string | null) {
  return ["LIVE", "HT", "ET", "PEN_LIVE"].includes(status ?? "");
}

function isPartidaFinalizada(status?: string | null) {
  return ["FT", "AET", "PEN"].includes(status ?? "");
}

// useCalendarioResultados substituído: CalendarioTab recebe resultadosPorJogo do pai (já derivado do store)
// ---------- CALENDÁRIO ----------
function CalendarioTab({
  palpitesPorJogo,
  onPalpitar,
  onComentarios,
  resultadosPorJogo,
}: {
  palpitesPorJogo: Map<string, number>;
  onPalpitar: (j: Jogo) => void;
  onComentarios: (j: Jogo) => void;
  resultadosPorJogo: Map<string, JogoResultado>;
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
        <p className="mt-1 text-xs text-muted-foreground">
          Todos os horários em horário de Brasília.
        </p>
      </div>

      {porDia.map(([data, lista]) => {
        const isHoje = data === hojeIso;
        const isPassado = data < hojeIso;
        return (
          <div key={data} className="space-y-3">
            <div
              className={`sticky top-0 z-10 flex items-center gap-2 rounded-xl px-4 py-2 shadow-card ${isHoje ? "bg-gradient-brand text-white" : isPassado ? "bg-muted text-muted-foreground" : "bg-card text-brand-dark"}`}
            >
              <CalendarDays className="h-4 w-4" />
              <div className="text-sm font-bold capitalize">{formatarDataLonga(data)}</div>
              <Badge
                className={`ml-auto ${isHoje ? "bg-white/20 text-white hover:bg-white/20" : "bg-brand-light text-brand-dark hover:bg-brand-light"}`}
              >
                {lista.length} {lista.length === 1 ? "jogo" : "jogos"}
              </Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {lista.map((j) => {
                const a = getSelecao(j.selecaoA);
                const b = getSelecao(j.selecaoB);
                const resultado = resultadosPorJogo.get(j.id);
                const aoVivo = isPartidaAoVivo(resultado?.status);
                const finalizada = isPartidaFinalizada(resultado?.status);
                const bloqueado = palpiteBloqueadoParaJogo(j, resultado);
                const mostrarPlacar = Boolean(resultado && (aoVivo || finalizada));
                return (
                  <div
                    key={j.id}
                    className={`flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-card ${aoVivo ? "border-red-200 bg-red-50" : "border-border"}`}
                  >
                    <div className="text-center">
                      <div className="text-base font-extrabold text-brand">{j.hora}</div>
                      <Badge className="bg-brand-light text-[10px] text-brand-dark hover:bg-brand-light">
                        G {j.grupo}
                      </Badge>
                    </div>
                    <div className="flex flex-1 items-center justify-center gap-2 text-sm">
                      <div className="flex flex-col items-center text-center">
                        <img
                          src={flagUrl(j.selecaoA, 80)}
                          alt={flagAlt(j.selecaoA)}
                          className="h-7 w-10 rounded-sm object-cover ring-1 ring-border"
                        />
                        <div className="mt-1 text-[11px] font-semibold">{a?.nome}</div>
                      </div>
                      <div className="min-w-10 text-center">
                        {mostrarPlacar ? (
                          <div
                            className={`text-base font-extrabold tabular-nums ${aoVivo ? "text-red-500" : "text-brand-dark"}`}
                          >
                            {resultado?.placar_a} – {resultado?.placar_b}
                          </div>
                        ) : (
                          <StylizedVersus compact />
                        )}
                      </div>
                      <div className="flex flex-col items-center text-center">
                        <img
                          src={flagUrl(j.selecaoB, 80)}
                          alt={flagAlt(j.selecaoB)}
                          className="h-7 w-10 rounded-sm object-cover ring-1 ring-border"
                        />
                        <div className="mt-1 text-[11px] font-semibold">{b?.nome}</div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div
                        className="flex items-center gap-1 text-[10px] text-muted-foreground"
                        title={`${j.estadio} â€” ${j.cidade}`}
                      >
                        <MapPin className="h-3 w-3 text-brand" />
                        <span className="max-w-[110px] truncate">{j.cidade}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[11px]"
                          disabled={bloqueado}
                          onClick={() => onPalpitar(j)}
                        >
                          {bloqueado ? "Encerrado" : "Palpitar"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => onComentarios(j)}
                          aria-label="Comentários"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {(palpitesPorJogo.get(j.id) ?? 0) > 0 && (
                        <span className="text-[10px] font-semibold text-brand">
                          Seu palpite registrado
                        </span>
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
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// ---------- TÍTULOS ----------
function TitulosTab() {
  const ranking = useMemo(() => {
    return [...selecoes]
      .map((s) => ({ s, ...getStats(s.id) }))
      .sort(
        (a, b) =>
          b.titulos - a.titulos ||
          b.participacoes - a.participacoes ||
          a.s.nome.localeCompare(b.s.nome),
      );
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
          Ranking histórico de títulos das 48 seleções da Copa 2026. {campeas.length} já foram
          campeãs, somando {totalTitulos} taças.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-4 text-sm font-bold text-brand-dark">Gráfico de títulos</div>
        <div className="space-y-2">
          {ranking.map((r) => {
            const pct = (r.titulos / maxTit) * 100;
            return (
              <div key={r.s.id} className="flex items-center gap-2">
                <img
                  src={flagUrl(r.s.id, 80)}
                  alt={flagAlt(r.s.id)}
                  className="h-5 w-7 rounded-sm object-cover ring-1 ring-border"
                />
                <div className="w-32 truncate text-xs font-semibold text-brand-dark">
                  {r.s.nome}
                </div>
                <div className="relative flex-1 h-5 rounded-full bg-brand-soft overflow-hidden">
                  {r.titulos > 0 && (
                    <div
                      className="h-full rounded-full bg-gradient-brand transition-all"
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  )}
                </div>
                <div className="w-10 text-right text-xs font-extrabold text-brand-dark tabular-nums">
                  {r.titulos}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-3 text-sm font-bold text-brand-dark">
          Participações em Copas do Mundo
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gradient-brand text-white">
              <tr className="text-left">
                <Th>#</Th>
                <Th>Seleção</Th>
                <Th>Grupo</Th>
                <Th>Participações</Th>
                <Th>Títulos</Th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, i) => (
                <tr key={r.s.id} className="border-t border-border odd:bg-brand-soft/50">
                  <Td className="font-semibold">{i + 1}</Td>
                  <Td>
                    <span className="flex items-center gap-2">
                      <img
                        src={flagUrl(r.s.id, 80)}
                        alt={flagAlt(r.s.id)}
                        className="h-5 w-7 rounded-sm object-cover ring-1 ring-border"
                      />
                      <span className="font-semibold">{r.s.nome}</span>
                    </span>
                  </Td>
                  <Td>{r.s.grupo}</Td>
                  <Td className="font-bold">{r.participacoes}</Td>
                  <Td className="font-extrabold text-brand">
                    <span className="inline-flex items-center gap-1">
                      {r.titulos > 0 && <Trophy className="h-3.5 w-3.5" />}
                      {r.titulos}
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
