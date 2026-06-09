import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/sonner";
import { Trophy, Flag, Users, MessageSquare, Calendar, ListChecks, Table as TableIcon, Home as HomeIcon, CalendarDays, MapPin, Award } from "lucide-react";

import { Header } from "@/components/vivicopa/Header";
import { Footer } from "@/components/vivicopa/Footer";
import { GameCard } from "@/components/vivicopa/GameCard";
import { PredictionModal } from "@/components/vivicopa/PredictionModal";
import { selecoes, jogos, grupos, getSelecao, type Jogo, type Selecao } from "@/data/worldcup2026";
import { getStats } from "@/data/selecaoStats";
import { carregarPalpites, excluirPalpite, type Palpite } from "@/lib/storage";
import { flagUrl, flagAlt } from "@/lib/flags";

const PAISES_SEDE = [
  { id: "usa", nome: "Estados Unidos" },
  { id: "can", nome: "Canadá" },
  { id: "mex", nome: "México" },
];

type PartidaCopa = {
  id: string;
  time_a: string;
  time_b: string;
  placar_a: number;
  placar_b: number;
  status: string;
  inicia_em: string | null;
  fase: string | null;
};

const FASES_MATA_MATA = ["LAST_32", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL"];
const FASES_LABEL: Record<string, string> = {
  LAST_32: "16 avos",
  LAST_16: "Oitavas",
  QUARTER_FINALS: "Quartas",
  SEMI_FINALS: "Semifinais",
  THIRD_PLACE: "3º lugar",
  FINAL: "Final",
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
  const [aba, setAba] = useState("inicio");
  const [palpites, setPalpites] = useState<Palpite[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [jogoSel, setJogoSel] = useState<Jogo | null>(null);
  const [editar, setEditar] = useState<Palpite | null>(null);
  const [comentariosJogo, setComentariosJogo] = useState<Jogo | null>(null);
  const [selecaoModal, setSelecaoModal] = useState<Selecao | null>(null);
  const [filtroGrupoInicial, setFiltroGrupoInicial] = useState<string>("todos");

  const refresh = () => setPalpites(carregarPalpites());
  useEffect(() => { refresh(); }, []);

  const palpitesPorJogo = useMemo(() => {
    const m = new Map<string, number>();
    palpites.forEach((p) => m.set(p.jogoId, (m.get(p.jogoId) ?? 0) + 1));
    return m;
  }, [palpites]);

  const abrirPalpite = (j: Jogo, p?: Palpite) => { setJogoSel(j); setEditar(p ?? null); setModalOpen(true); };
  const abrirComentarios = (j: Jogo) => setComentariosJogo(j);

  return (
    <div className="flex min-h-screen flex-col bg-brand-soft">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Tabs value={aba} onValueChange={setAba} className="w-full">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-white p-1 shadow-card">
            <TabTrigger value="inicio" icon={<HomeIcon className="h-4 w-4" />}>Início</TabTrigger>
            <TabTrigger value="jogos" icon={<Calendar className="h-4 w-4" />}>Jogos</TabTrigger>
            <TabTrigger value="calendario" icon={<CalendarDays className="h-4 w-4" />}>Calendário</TabTrigger>
            <TabTrigger value="chaveamento" icon={<Trophy className="h-4 w-4" />}>Chaveamento</TabTrigger>
            <TabTrigger value="selecoes" icon={<Flag className="h-4 w-4" />}>Seleções</TabTrigger>
            <TabTrigger value="grupos" icon={<Users className="h-4 w-4" />}>Grupos</TabTrigger>
            <TabTrigger value="titulos" icon={<Award className="h-4 w-4" />}>Títulos</TabTrigger>
            <TabTrigger value="meus" icon={<ListChecks className="h-4 w-4" />}>Meus Palpites</TabTrigger>
            <TabTrigger value="tabela" icon={<TableIcon className="h-4 w-4" />}>Tabela</TabTrigger>
            <TabTrigger value="comentarios" icon={<MessageSquare className="h-4 w-4" />}>Comentários</TabTrigger>
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

          <TabsContent value="chaveamento" className="mt-6">
            <ChaveamentoTab />
          </TabsContent>

          <TabsContent value="selecoes" className="mt-6">
            <SelecoesTab onAbrir={setSelecaoModal} />
          </TabsContent>

          <TabsContent value="grupos" className="mt-6">
            <GruposTab onVerJogos={(g) => { setFiltroGrupoInicial(g); setAba("jogos"); }} />
          </TabsContent>

          <TabsContent value="titulos" className="mt-6">
            <TitulosTab />
          </TabsContent>

          <TabsContent value="meus" className="mt-6">
            <MeusPalpitesTab palpites={palpites} onEditar={(p) => {
              const j = jogos.find((x) => x.id === p.jogoId);
              if (j) abrirPalpite(j, p);
            }} onExcluir={(id) => { excluirPalpite(id); refresh(); }} />
          </TabsContent>

          <TabsContent value="tabela" className="mt-6">
            <TabelaTab palpites={palpites} />
          </TabsContent>

          <TabsContent value="comentarios" className="mt-6">
            <ComentariosTab palpites={palpites} />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />

      <PredictionModal jogo={jogoSel} open={modalOpen} onClose={() => setModalOpen(false)} onSaved={refresh} editar={editar} />

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

function TabTrigger({ value, icon, children }: { value: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <TabsTrigger value={value} className="gap-1.5 data-[state=active]:bg-gradient-brand data-[state=active]:text-white data-[state=active]:shadow-brand">
      {icon}
      <span className="text-sm">{children}</span>
    </TabsTrigger>
  );
}

// ---------- INÍCIO ----------
function Inicio({ palpites, onJogos, onPalpite }: { palpites: Palpite[]; onJogos: () => void; onPalpite: () => void }) {
  const proximo = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    return [...jogos].sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))
      .find((j) => j.data >= hoje) ?? jogos[0];
  }, []);
  const pa = getSelecao(proximo.selecaoA);
  const pb = getSelecao(proximo.selecaoB);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-hero p-8 text-white shadow-brand">
        <div className="relative z-10">
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
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap justify-center gap-1.5 px-4 pb-3 opacity-30">
          {selecoes.slice(0, 24).map((s) => (
            <img
              key={s.id}
              src={flagUrl(s.id, 80)}
              alt=""
              className="h-5 w-7 rounded-sm object-cover ring-1 ring-white/40"
              loading="lazy"
            />
          ))}
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
        <div className="mb-4 text-xs font-semibold uppercase tracking-wide text-brand">Próximo jogo</div>
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

// ---------- GRUPOS ----------
function GruposTab({ onVerJogos }: { onVerJogos: (grupo: string) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {grupos.map((g) => {
        const times = selecoes.filter((s) => s.grupo === g);
        return (
          <div key={g} className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-lg font-extrabold text-brand-dark">Grupo {g}</div>
              <Badge className="bg-brand-light text-brand-dark hover:bg-brand-light">{times.length} seleções</Badge>
            </div>
            <ul className="space-y-2">
              {times.map((s) => (
                <li key={s.id} className="flex items-center gap-3 rounded-lg bg-brand-soft/60 p-2 text-sm">
                  <img src={flagUrl(s.id, 80)} alt={flagAlt(s.id)} loading="lazy" className="h-7 w-10 rounded-sm object-cover ring-1 ring-border" />
                  <span className="font-medium">{s.nome}</span>
                </li>
              ))}
            </ul>
            <Button onClick={() => onVerJogos(g)} variant="outline" className="mt-3 w-full">Ver jogos do grupo</Button>
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
                  <div>
                    <div className="text-2xl">{a?.bandeiraEmoji}</div>
                    <div className="text-xs font-semibold">{a?.nome}</div>
                  </div>
                  <div className="text-2xl font-extrabold text-brand">{p.placarA} x {p.placarB}</div>
                  <div>
                    <div className="text-2xl">{b?.bandeiraEmoji}</div>
                    <div className="text-xs font-semibold">{b?.nome}</div>
                  </div>
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
                  <Td>{a?.bandeiraEmoji} {a?.nome} x {b?.nome} {b?.bandeiraEmoji}</Td>
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

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide">{children}</th>;
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

// ---------- CHAVEAMENTO ----------
function ChaveamentoTab() {
  const [partidas, setPartidas] = useState<PartidaCopa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    const carregar = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (!supabaseUrl || !supabaseKey) {
          throw new Error("Supabase não configurado no preview.");
        }
        const fases = [...FASES_MATA_MATA, "THIRD_PLACE"].map((fase) => `"${fase}"`).join(",");
        const url =
          `${supabaseUrl}/rest/v1/partidas` +
          `?select=id,time_a,time_b,placar_a,placar_b,status,inicia_em,fase` +
          `&fase=in.(${fases})&order=inicia_em.asc`;
        const res = await fetch(url, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        });
        if (!res.ok) throw new Error("Não foi possível carregar o chaveamento.");
        const data = await res.json();
        if (ativo) {
          setPartidas((data ?? []) as PartidaCopa[]);
          setErro(null);
          setCarregando(false);
        }
      } catch (e) {
        if (ativo) {
          setErro(e instanceof Error ? e.message : "Não foi possível carregar o chaveamento.");
          setCarregando(false);
        }
      }
    };

    carregar();

    return () => {
      ativo = false;
    };
  }, []);

  const porFase = useMemo(() => {
    const map = new Map<string, PartidaCopa[]>();
    partidas.forEach((p) => {
      const lista = map.get(p.fase ?? "") ?? [];
      lista.push(p);
      map.set(p.fase ?? "", lista);
    });
    return map;
  }, [partidas]);

  const terceiro = porFase.get("THIRD_PLACE")?.[0];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand">
              <Trophy className="h-3.5 w-3.5" /> Chaveamento da Copa 2026
            </div>
            <h2 className="mt-1 text-2xl font-extrabold text-brand-dark">Mata-mata automático</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              A árvore começa vazia e será preenchida conforme os classificados forem definidos após a fase de grupos.
            </p>
          </div>
          <Badge className="bg-gradient-brand text-white hover:opacity-90">
            {partidas.length}/31 jogos
          </Badge>
        </div>
        {erro && (
          <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
            {erro}
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="grid min-w-[1180px] grid-cols-[1.35fr_1.05fr_1fr_1fr_1.1fr] gap-4">
          {FASES_MATA_MATA.map((fase) => {
            const lista = [...(porFase.get(fase) ?? [])].sort((a, b) =>
              (a.inicia_em ?? "").localeCompare(b.inicia_em ?? ""),
            );
            return (
              <div key={fase} className="flex flex-col">
                <div className="mb-3 rounded-xl bg-brand-soft px-3 py-2 text-center">
                  <div className="text-sm font-extrabold text-brand-dark">{FASES_LABEL[fase]}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {lista.length || "A definir"} {lista.length === 1 ? "jogo" : "jogos"}
                  </div>
                </div>
                <div className={`flex flex-1 flex-col justify-around gap-3 ${fase === "FINAL" ? "py-20" : ""}`}>
                  {lista.length > 0 ? (
                    lista.map((p) => <ChaveCard key={p.id} partida={p} destaque={fase === "FINAL"} />)
                  ) : (
                    <ChavePlaceholder fase={fase} carregando={carregando} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-extrabold text-brand-dark">Disputa do 3º lugar</div>
            <Badge className="bg-brand-light text-brand-dark hover:bg-brand-light">Extra</Badge>
          </div>
          {terceiro ? <ChaveCard partida={terceiro} /> : <ChavePlaceholder fase="THIRD_PLACE" carregando={carregando} />}
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="text-sm font-extrabold text-brand-dark">Preenchimento automático</div>
          <p className="mt-2 text-sm text-muted-foreground">
            O cron atualiza a tabela de partidas pela football-data.org. Quando os confrontos do mata-mata forem publicados,
            os nomes saem de “A definir” e aparecem aqui sem cadastro manual.
          </p>
        </div>
      </div>
    </div>
  );
}

function ChavePlaceholder({ fase, carregando }: { fase: string; carregando: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-brand/30 bg-brand-soft/50 p-3 text-center">
      <div className="text-xs font-semibold text-brand-dark">{FASES_LABEL[fase] ?? "Fase"}</div>
      <div className="mt-1 text-sm text-muted-foreground">{carregando ? "Carregando..." : "A definir"}</div>
    </div>
  );
}

function ChaveCard({ partida, destaque = false }: { partida: PartidaCopa; destaque?: boolean }) {
  const finalizado = ["FT", "AET", "PEN"].includes(partida.status);
  const vencedorA = finalizado && partida.placar_a > partida.placar_b;
  const vencedorB = finalizado && partida.placar_b > partida.placar_a;

  return (
    <div className={`relative rounded-xl border border-border bg-white p-2 shadow-card ${destaque ? "ring-2 ring-brand/30" : ""}`}>
      {!destaque && <div className="absolute -right-4 top-1/2 hidden h-px w-4 bg-border md:block" />}
      <div className="mb-1 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <span>{partida.inicia_em ? new Date(partida.inicia_em).toLocaleDateString("pt-BR") : "Data a definir"}</span>
        <Badge className={`${partida.status === "LIVE" ? "bg-destructive text-white" : "bg-brand-light text-brand-dark"} h-5 px-1.5 text-[10px] hover:opacity-90`}>
          {partida.status}
        </Badge>
      </div>
      <LinhaEquipe nome={partida.time_a} placar={partida.placar_a} vencedor={vencedorA} />
      <LinhaEquipe nome={partida.time_b} placar={partida.placar_b} vencedor={vencedorB} />
    </div>
  );
}

function LinhaEquipe({ nome, placar, vencedor }: { nome: string; placar: number; vencedor: boolean }) {
  const indefinido = !nome || nome === "A definir";
  return (
    <div className={`mt-1 flex items-center justify-between rounded-lg px-2 py-1.5 text-sm ${vencedor ? "bg-green-50 font-bold text-green-700" : "bg-brand-soft/70 text-brand-dark"}`}>
      <span className={`truncate pr-2 ${indefinido ? "text-muted-foreground" : ""}`}>{indefinido ? "A definir" : nome}</span>
      <span className="font-extrabold tabular-nums">{placar}</span>
    </div>
  );
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

