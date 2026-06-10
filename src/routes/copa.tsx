import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/copa")({
  head: () => ({
    meta: [{ title: "Copa 2026 — Palpites em família" }],
  }),
  component: CopaPage,
});

type Partida = {
  id: string;
  time_a: string;
  time_b: string;
  placar_a: number;
  placar_b: number;
  status: string;
  inicia_em: string | null;
  fase: string | null;
  grupo: string | null;
  rodada: number | null;
};

type Palpite = {
  id: string;
  usuario_id: string;
  partida_id: string;
  palpite_a: number;
  palpite_b: number;
};

type RankingRow = {
  usuario_id: string;
  jogos_pontuados: number;
  pontos: number;
};

const AO_VIVO = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE"]);
const FASES_ORDEM = [
  "GROUP_STAGE",
  "LAST_32",
  "LAST_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "THIRD_PLACE",
  "FINAL",
];
const FASES_LABEL: Record<string, string> = {
  GROUP_STAGE: "Fase de grupos",
  LAST_32: "16 avos de final",
  LAST_16: "Oitavas de final",
  QUARTER_FINALS: "Quartas de final",
  SEMI_FINALS: "Semifinais",
  THIRD_PLACE: "Disputa do 3º lugar",
  FINAL: "Final",
};

function faseLabel(fase?: string | null) {
  if (!fase) return "Fase indefinida";
  return FASES_LABEL[fase] ?? fase.replaceAll("_", " ").toLowerCase();
}

function grupoLabel(grupo?: string | null) {
  if (!grupo) return null;
  return grupo.replace("GROUP_", "Grupo ");
}

function ordemFase(fase?: string | null) {
  const idx = FASES_ORDEM.indexOf(fase ?? "");
  return idx === -1 ? FASES_ORDEM.length : idx;
}

function CopaPage() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setUserId(s?.user?.id ?? null),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!userId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-bold">Copa 2026 — Palpites</h1>
          <p className="mt-2 text-muted-foreground">Faça login para palpitar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl p-4">
      <h1 className="mb-4 text-2xl font-extrabold">Copa 2026 — Palpites em família</h1>
      <Tabs defaultValue="jogos">
        <TabsList className="w-full">
          <TabsTrigger value="jogos" className="flex-1">Jogos</TabsTrigger>
          <TabsTrigger value="chaveamento" className="flex-1">Chaveamento</TabsTrigger>
          <TabsTrigger value="ranking" className="flex-1">Ranking</TabsTrigger>
        </TabsList>
        <TabsContent value="jogos" className="mt-4">
          <Jogos userId={userId} />
        </TabsContent>
        <TabsContent value="chaveamento" className="mt-4">
          <Chaveamento userId={userId} />
        </TabsContent>
        <TabsContent value="ranking" className="mt-4">
          <Ranking />
        </TabsContent>
      </Tabs>
      <Toaster />
    </div>
  );
}

function Jogos({ userId }: { userId: string }) {
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [palpites, setPalpites] = useState<Record<string, Palpite>>({});
  const [filtroFase, setFiltroFase] = useState("todas");
  const [filtroGrupo, setFiltroGrupo] = useState("todos");
  const [busca, setBusca] = useState("");

  const recarregar = async () => {
    const [{ data: p }, { data: pal }] = await Promise.all([
      supabase.from("partidas").select("*").order("inicia_em", { ascending: true }),
      supabase.from("palpites").select("*").eq("usuario_id", userId),
    ]);
    setPartidas((p ?? []) as Partida[]);
    const map: Record<string, Palpite> = {};
    (pal ?? []).forEach((x: any) => (map[x.partida_id] = x));
    setPalpites(map);
  };

  useEffect(() => {
    recarregar();
    const ch = supabase
      .channel("partidas-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "partidas" },
        (payload) => {
          setPartidas((prev) => {
            const n = payload.new as Partida;
            if (payload.eventType === "DELETE") {
              return prev.filter((p) => p.id !== (payload.old as any).id);
            }
            const idx = prev.findIndex((p) => p.id === n.id);
            if (idx === -1) return [...prev, n];
            const copy = [...prev];
            copy[idx] = n;
            return copy;
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId]);

  const fasesDisponiveis = useMemo(() => {
    const fases = Array.from(new Set(partidas.map((p) => p.fase).filter(Boolean))) as string[];
    return fases.sort((a, b) => ordemFase(a) - ordemFase(b));
  }, [partidas]);

  const gruposDisponiveis = useMemo(() => {
    const grupos = Array.from(new Set(partidas.map((p) => p.grupo).filter(Boolean))) as string[];
    return grupos.sort((a, b) => a.localeCompare(b));
  }, [partidas]);

  const partidasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return partidas.filter((p) => {
      if (filtroFase !== "todas" && p.fase !== filtroFase) return false;
      if (filtroGrupo !== "todos" && p.grupo !== filtroGrupo) return false;
      if (termo && !`${p.time_a} ${p.time_b}`.toLowerCase().includes(termo)) return false;
      return true;
    });
  }, [busca, filtroFase, filtroGrupo, partidas]);

  const partidasPorFase = useMemo(() => {
    const map = new Map<string, Partida[]>();
    partidasFiltradas.forEach((p) => {
      const fase = p.fase ?? "INDEFINIDA";
      const lista = map.get(fase) ?? [];
      lista.push(p);
      map.set(fase, lista);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => ordemFase(a) - ordemFase(b))
      .map(([fase, lista]) => [
        fase,
        lista.sort((a, b) => (a.inicia_em ?? "").localeCompare(b.inicia_em ?? "")),
      ] as const);
  }, [partidasFiltradas]);

  if (!partidas.length) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
        Nenhuma partida cadastrada ainda.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded-xl border bg-card p-3 shadow-sm md:grid-cols-[1fr_1fr_1.4fr]">
        <Select value={filtroFase} onValueChange={setFiltroFase}>
          <SelectTrigger>
            <SelectValue placeholder="Fase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as fases</SelectItem>
            {fasesDisponiveis.map((fase) => (
              <SelectItem key={fase} value={fase}>{faseLabel(fase)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroGrupo} onValueChange={setFiltroGrupo}>
          <SelectTrigger>
            <SelectValue placeholder="Grupo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os grupos</SelectItem>
            {gruposDisponiveis.map((grupo) => (
              <SelectItem key={grupo} value={grupo}>{grupoLabel(grupo) ?? grupo}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar seleção"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Resumo label="Partidas" value={partidas.length} />
        <Resumo label="Fases" value={fasesDisponiveis.length} />
        <Resumo label="Filtradas" value={partidasFiltradas.length} />
        <Resumo label="Palpites" value={Object.keys(palpites).length} />
      </div>

      {partidasPorFase.map(([fase, lista]) => (
        <section key={fase} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2">
            <div>
              <h2 className="text-sm font-bold">{faseLabel(fase)}</h2>
              <p className="text-xs text-muted-foreground">
                {lista.length} {lista.length === 1 ? "partida" : "partidas"}
              </p>
            </div>
            {fase === "GROUP_STAGE" && <Badge variant="outline">Grupos A-L</Badge>}
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {lista.map((p) => (
              <PartidaCard
                key={p.id}
                partida={p}
                palpite={palpites[p.id]}
                onSalvo={recarregar}
                userId={userId}
              />
            ))}
          </div>
        </section>
      ))}

      {!partidasFiltradas.length && (
        <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
          Nenhuma partida encontrada com esses filtros.
        </div>
      )}
    </div>
  );
}

function Resumo({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm">
      <div className="text-2xl font-extrabold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function PartidaCard({
  partida,
  palpite,
  onSalvo,
  userId,
}: {
  partida: Partida;
  palpite?: Palpite;
  onSalvo: () => void;
  userId: string;
}) {
  const [a, setA] = useState<number>(palpite?.palpite_a ?? 0);
  const [b, setB] = useState<number>(palpite?.palpite_b ?? 0);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setA(palpite?.palpite_a ?? 0);
    setB(palpite?.palpite_b ?? 0);
  }, [palpite?.palpite_a, palpite?.palpite_b]);

  const aoVivo = AO_VIVO.has(partida.status);
  const finalizado = ["FT", "AET", "PEN"].includes(partida.status);
  const bloqueado = partida.status !== "NS";

  const salvar = async () => {
    setSalvando(true);
    const { error } = await supabase
      .from("palpites")
      .upsert(
        {
          usuario_id: userId,
          partida_id: partida.id,
          palpite_a: a,
          palpite_b: b,
        },
        { onConflict: "usuario_id,partida_id" },
      );
    setSalvando(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Palpite salvo!");
      onSalvo();
    }
  };

  const acertou =
    palpite && finalizado
      ? palpite.palpite_a === partida.placar_a && palpite.palpite_b === partida.placar_b
        ? "exato"
        : Math.sign(palpite.palpite_a - palpite.palpite_b) ===
            Math.sign(partida.placar_a - partida.placar_b)
          ? "resultado"
          : "errou"
      : null;

  return (
    <div
      className={`rounded-xl border bg-card p-4 shadow-sm ${aoVivo ? "border-destructive ring-2 ring-destructive/30" : ""}`}
    >
      <div className="mb-2 flex items-center justify-between text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{faseLabel(partida.fase)}</Badge>
          {grupoLabel(partida.grupo) && <Badge variant="secondary">{grupoLabel(partida.grupo)}</Badge>}
          {partida.rodada && <span className="text-muted-foreground">Rodada {partida.rodada}</span>}
        </div>
        {aoVivo ? (
          <Badge variant="destructive" className="animate-pulse">AO VIVO · {partida.status}</Badge>
        ) : finalizado ? (
          <Badge variant="secondary">Encerrado</Badge>
        ) : (
          <Badge variant="outline">Aguardando</Badge>
        )}
      </div>
      <div className="mb-3 text-xs text-muted-foreground">
        {partida.inicia_em ? new Date(partida.inicia_em).toLocaleString("pt-BR") : "Data a definir"}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="text-right font-semibold">{partida.time_a}</div>
        <div className="text-2xl font-extrabold tabular-nums">
          {partida.placar_a} <span className="text-muted-foreground">x</span> {partida.placar_b}
        </div>
        <div className="font-semibold">{partida.time_b}</div>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <Input
          type="number"
          min={0}
          value={a}
          disabled={bloqueado}
          onChange={(e) => setA(Number(e.target.value))}
          className="text-right"
        />
        <span className="text-sm text-muted-foreground">seu palpite</span>
        <Input
          type="number"
          min={0}
          value={b}
          disabled={bloqueado}
          onChange={(e) => setB(Number(e.target.value))}
        />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs">
          {acertou === "exato" && <span className="font-bold text-green-600">+3 placar exato</span>}
          {acertou === "resultado" && <span className="font-bold text-yellow-600">+1 resultado</span>}
          {acertou === "errou" && <span className="text-muted-foreground">0 pontos</span>}
          {!finalizado && palpite && <span className="text-muted-foreground">Palpite registrado</span>}
        </div>
        {!bloqueado && (
          <Button size="sm" onClick={salvar} disabled={salvando}>
            {palpite ? "Atualizar" : "Salvar"}
          </Button>
        )}
      </div>
    </div>
  );
}

const MATA_MATA_FASES = ["LAST_32", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL"];

function Chaveamento({ userId }: { userId: string }) {
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [palpites, setPalpites] = useState<Record<string, Palpite>>({});

  const carregar = async () => {
    const [{ data }, { data: pal }] = await Promise.all([
      supabase
        .from("partidas")
        .select("*")
        .in("fase", [...MATA_MATA_FASES, "THIRD_PLACE"])
        .order("inicia_em", { ascending: true }),
      supabase.from("palpites").select("*").eq("usuario_id", userId),
    ]);
    setPartidas((data ?? []) as Partida[]);
    const map: Record<string, Palpite> = {};
    (pal ?? []).forEach((x: any) => (map[x.partida_id] = x));
    setPalpites(map);
  };

  useEffect(() => {
    carregar();
    const ch = supabase
      .channel("partidas-chaveamento")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "partidas" },
        (payload) => {
          const n = payload.new as Partida;
          const old = payload.old as Partial<Partida>;
          const fase = n?.fase ?? old?.fase;
          if (fase && ![...MATA_MATA_FASES, "THIRD_PLACE"].includes(fase)) return;
          carregar();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const porFase = useMemo(() => {
    const map = new Map<string, Partida[]>();
    partidas.forEach((p) => {
      const fase = p.fase ?? "INDEFINIDA";
      const lista = map.get(fase) ?? [];
      lista.push(p);
      map.set(fase, lista);
    });
    MATA_MATA_FASES.forEach((fase) => {
      if (!map.has(fase)) map.set(fase, []);
    });
    return map;
  }, [partidas]);

  const terceiroLugar = porFase.get("THIRD_PLACE")?.[0];
  const totalMataMata = MATA_MATA_FASES.reduce((acc, fase) => acc + (porFase.get(fase)?.length ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold">Chaveamento da Copa 2026</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A árvore é preenchida automaticamente conforme os classificados e confrontos forem atualizados.
            </p>
          </div>
          <Badge variant="outline">{totalMataMata}/31 jogos</Badge>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card p-4 shadow-sm">
        <div className="grid min-w-[1120px] grid-cols-[1.4fr_1fr_1fr_1fr_1.15fr] gap-4">
          {MATA_MATA_FASES.map((fase) => {
            const lista = [...(porFase.get(fase) ?? [])].sort((a, b) =>
              (a.inicia_em ?? "").localeCompare(b.inicia_em ?? ""),
            );
            return (
              <div key={fase} className="flex flex-col">
                <div className="mb-3 text-center">
                  <div className="text-sm font-bold">{faseLabel(fase)}</div>
                  <div className="text-xs text-muted-foreground">
                    {lista.length} {lista.length === 1 ? "jogo" : "jogos"}
                  </div>
                </div>
                <div className={`flex flex-1 flex-col justify-around gap-3 ${fase === "FINAL" ? "py-20" : ""}`}>
                   {lista.length ? (
                     lista.map((p) => (
                       <ChaveCard
                         key={p.id}
                         partida={p}
                         destaque={fase === "FINAL"}
                         palpite={palpites[p.id]}
                         userId={userId}
                         onSalvo={carregar}
                       />
                     ))
                   ) : (
                    <ChaveVazia fase={fase} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold">Disputa do 3º lugar</h3>
              <p className="text-xs text-muted-foreground">Atualizada automaticamente pela API</p>
            </div>
            <Badge variant="secondary">Extra</Badge>
          </div>
          {terceiroLugar ? (
            <ChaveCard
              partida={terceiroLugar}
              palpite={palpites[terceiroLugar.id]}
              userId={userId}
              onSalvo={carregar}
            />
          ) : (
            <ChaveVazia fase="THIRD_PLACE" />
          )}
        </div>
        <div className="rounded-xl border bg-muted/40 p-4">
          <h3 className="text-sm font-bold">Como funciona</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Enquanto os classificados não forem definidos, os cards aparecem como “A definir”.
            Quando a football-data.org atualizar os confrontos, o cron sincroniza a tabela
            `partidas` e o chaveamento muda sozinho.
          </p>
        </div>
      </div>
    </div>
  );
}

function ChaveVazia({ fase }: { fase: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-background/70 p-3 text-center text-xs text-muted-foreground">
      {faseLabel(fase)}
      <div className="mt-1 font-semibold">A definir</div>
    </div>
  );
}

function ChaveCard({
  partida,
  destaque = false,
  palpite,
  userId,
  onSalvo,
}: {
  partida: Partida;
  destaque?: boolean;
  palpite?: Palpite;
  userId?: string;
  onSalvo?: () => void;
}) {
  const finalizado = ["FT", "AET", "PEN"].includes(partida.status);
  const vencedorA = finalizado && partida.placar_a > partida.placar_b;
  const vencedorB = finalizado && partida.placar_b > partida.placar_a;
  const bloqueado = partida.status !== "NS";
  const indefinido =
    !partida.time_a || partida.time_a === "A definir" ||
    !partida.time_b || partida.time_b === "A definir";

  const [a, setA] = useState<number>(palpite?.palpite_a ?? 0);
  const [b, setB] = useState<number>(palpite?.palpite_b ?? 0);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setA(palpite?.palpite_a ?? 0);
    setB(palpite?.palpite_b ?? 0);
  }, [palpite?.palpite_a, palpite?.palpite_b]);

  const salvar = async () => {
    if (!userId) return;
    setSalvando(true);
    const { error } = await supabase.from("palpites").upsert(
      { usuario_id: userId, partida_id: partida.id, palpite_a: a, palpite_b: b },
      { onConflict: "usuario_id,partida_id" },
    );
    setSalvando(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Palpite salvo!");
      onSalvo?.();
    }
  };

  return (
    <div className={`relative rounded-lg border bg-background p-2 shadow-sm ${destaque ? "ring-2 ring-primary/20" : ""}`}>
      {!destaque && <div className="absolute -right-3 top-1/2 hidden h-px w-3 bg-border md:block" />}
      <div className="mb-1 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <span>{partida.inicia_em ? new Date(partida.inicia_em).toLocaleDateString("pt-BR") : "Data a definir"}</span>
        <Badge variant={AO_VIVO.has(partida.status) ? "destructive" : "outline"} className="h-5 px-1.5 text-[10px]">
          {partida.status}
        </Badge>
      </div>
      <EquipeLinha nome={partida.time_a} placar={partida.placar_a} vencedor={vencedorA} />
      <EquipeLinha nome={partida.time_b} placar={partida.placar_b} vencedor={vencedorB} />
      {userId && (
        <div className="mt-2 border-t pt-2">
          {indefinido ? (
            <div className="text-center text-[10px] text-muted-foreground">
              Palpite disponível quando os classificados forem definidos
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={0}
                value={a}
                disabled={bloqueado}
                onChange={(e) => setA(Number(e.target.value))}
                className="h-8 w-12 px-1 text-center text-sm"
              />
              <span className="text-[10px] text-muted-foreground">x</span>
              <Input
                type="number"
                min={0}
                value={b}
                disabled={bloqueado}
                onChange={(e) => setB(Number(e.target.value))}
                className="h-8 w-12 px-1 text-center text-sm"
              />
              {!bloqueado && (
                <Button size="sm" className="ml-auto h-7 px-2 text-xs" onClick={salvar} disabled={salvando}>
                  {palpite ? "Atualizar" : "Salvar"}
                </Button>
              )}
              {bloqueado && palpite && (
                <span className="ml-auto text-[10px] text-muted-foreground">
                  Seu: {palpite.palpite_a}-{palpite.palpite_b}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EquipeLinha({ nome, placar, vencedor }: { nome: string; placar: number; vencedor: boolean }) {
  const indefinido = !nome || nome === "A definir";
  return (
    <div className={`mt-1 flex items-center justify-between rounded-md px-2 py-1.5 text-sm ${vencedor ? "bg-green-500/10 font-bold text-green-700" : "bg-muted/60"}`}>
      <span className={indefinido ? "text-muted-foreground" : ""}>{indefinido ? "A definir" : nome}</span>
      <span className="font-extrabold tabular-nums">{placar}</span>
    </div>
  );
}

function Ranking() {
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [nomes, setNomes] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("ranking" as any)
        .select("*")
        .order("pontos", { ascending: false });
      const lista = (data ?? []) as unknown as RankingRow[];
      setRows(lista);

      // tenta resolver nomes via tabela 'profiles' se existir; senão fallback p/ ID
      const ids = lista.map((r) => r.usuario_id);
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles" as any)
          .select("id, nome, full_name, display_name, email")
          .in("id", ids);
        const map: Record<string, string> = {};
        (profs ?? []).forEach((p: any) => {
          map[p.id] = p.nome ?? p.full_name ?? p.display_name ?? p.email ?? p.id.slice(0, 8);
        });
        setNomes(map);
      }
    })();
  }, []);

  if (!rows.length) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
        Ainda sem pontuação — aguarde os primeiros jogos finalizarem.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="p-3 text-left">#</th>
            <th className="p-3 text-left">Jogador</th>
            <th className="p-3 text-right">Jogos</th>
            <th className="p-3 text-right">Pontos</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.usuario_id} className="border-t">
              <td className="p-3 font-bold">{i + 1}</td>
              <td className="p-3">{nomes[r.usuario_id] ?? r.usuario_id.slice(0, 8)}</td>
              <td className="p-3 text-right">{r.jogos_pontuados}</td>
              <td className="p-3 text-right text-lg font-extrabold">{r.pontos}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
