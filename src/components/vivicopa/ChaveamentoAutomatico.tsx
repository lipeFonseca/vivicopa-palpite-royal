import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { flagAlt, flagUrl } from "@/lib/flags";

type PartidaMataMata = {
  id: string;
  time_a: string;
  time_b: string;
  placar_a: number;
  placar_b: number;
  status: string;
  inicia_em: string | null;
  fase: string | null;
};

const MATA_MATA_FASES = ["LAST_32", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL"];
const AO_VIVO = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE"]);
const USAR_SIMULACAO_KEY = "vivicopa:simular-chaveamento";

const FASE_LABEL: Record<string, string> = {
  LAST_32: "16-avos de final",
  LAST_16: "Oitavas de final",
  QUARTER_FINALS: "Quartas de final",
  SEMI_FINALS: "Semifinais",
  THIRD_PLACE: "Disputa do 3º lugar",
  FINAL: "Final",
};

const TIME_ID_POR_NOME: Record<string, string> = {
  "South Africa": "rsa",
  "South Korea": "kor",
  "Czechia": "cze",
  "Bosnia-Herzegovina": "bih",
  "Switzerland": "sui",
  "United States": "usa",
  "Germany": "ger",
  "Netherlands": "ned",
  "Belgium": "bel",
  "Spain": "esp",
  "Uruguay": "uru",
  "France": "fra",
  "Norway": "nor",
  "Argentina": "arg",
  "Portugal": "por",
  "Colombia": "col",
  "England": "eng",
  "Croatia": "cro",
  "Mexico": "mex",
  "Brazil": "bra",
  "Morocco": "mar",
  "Paraguay": "par",
  "Ecuador": "ecu",
  "Senegal": "sen",
  "Algeria": "alg",
  "Ghana": "gha",
  "Japan": "jpn",
  "Canada": "can",
  "Tunisia": "tun",
  "Egypt": "egy",
  "Jordan": "jor",
  "Turkey": "tur",
  "Australia": "aus",
};

function faseLabel(fase: string) {
  return FASE_LABEL[fase] ?? fase.replaceAll("_", " ").toLowerCase();
}

function timeDefinido(nome?: string | null) {
  return Boolean(nome && nome !== "A definir");
}

function confrontoDefinido(partida: PartidaMataMata) {
  return timeDefinido(partida.time_a) || timeDefinido(partida.time_b);
}

const PARTIDAS_SIMULADAS: PartidaMataMata[] = [
  ["sim-r32-1", "LAST_32", "Mexico", "South Africa", "2026-06-28T19:00:00+00:00"],
  ["sim-r32-2", "LAST_32", "Brazil", "Morocco", "2026-06-28T23:00:00+00:00"],
  ["sim-r32-3", "LAST_32", "United States", "Paraguay", "2026-06-29T19:00:00+00:00"],
  ["sim-r32-4", "LAST_32", "Germany", "Ecuador", "2026-06-29T23:00:00+00:00"],
  ["sim-r32-5", "LAST_32", "France", "Senegal", "2026-06-30T19:00:00+00:00"],
  ["sim-r32-6", "LAST_32", "Argentina", "Algeria", "2026-06-30T23:00:00+00:00"],
  ["sim-r32-7", "LAST_32", "Portugal", "Ghana", "2026-07-01T19:00:00+00:00"],
  ["sim-r32-8", "LAST_32", "England", "Croatia", "2026-07-01T23:00:00+00:00"],
  ["sim-r32-9", "LAST_32", "Spain", "Japan", "2026-07-02T19:00:00+00:00"],
  ["sim-r32-10", "LAST_32", "Uruguay", "Canada", "2026-07-02T23:00:00+00:00"],
  ["sim-r32-11", "LAST_32", "Netherlands", "Tunisia", "2026-07-03T19:00:00+00:00"],
  ["sim-r32-12", "LAST_32", "Belgium", "Egypt", "2026-07-03T23:00:00+00:00"],
  ["sim-r32-13", "LAST_32", "Norway", "Jordan", "2026-07-04T15:00:00+00:00"],
  ["sim-r32-14", "LAST_32", "Colombia", "Turkey", "2026-07-04T17:00:00+00:00"],
  ["sim-r32-15", "LAST_32", "Switzerland", "Australia", "2026-07-04T21:00:00+00:00"],
  ["sim-r32-16", "LAST_32", "South Korea", "Czechia", "2026-07-04T23:00:00+00:00"],
  ["sim-r16-1", "LAST_16", "Mexico", "Brazil", "2026-07-04T19:00:00+00:00"],
  ["sim-r16-2", "LAST_16", "United States", "Germany", "2026-07-04T23:00:00+00:00"],
  ["sim-r16-3", "LAST_16", "France", "Argentina", "2026-07-05T19:00:00+00:00"],
  ["sim-r16-4", "LAST_16", "Portugal", "England", "2026-07-05T23:00:00+00:00"],
  ["sim-r16-5", "LAST_16", "Spain", "Uruguay", "2026-07-06T19:00:00+00:00"],
  ["sim-r16-6", "LAST_16", "Netherlands", "Belgium", "2026-07-06T23:00:00+00:00"],
  ["sim-r16-7", "LAST_16", "Norway", "Colombia", "2026-07-07T19:00:00+00:00"],
  ["sim-r16-8", "LAST_16", "Switzerland", "South Korea", "2026-07-07T23:00:00+00:00"],
  ["sim-qf-1", "QUARTER_FINALS", "Brazil", "Germany", "2026-07-09T19:00:00+00:00"],
  ["sim-qf-2", "QUARTER_FINALS", "Argentina", "Portugal", "2026-07-10T19:00:00+00:00"],
  ["sim-qf-3", "QUARTER_FINALS", "Spain", "Netherlands", "2026-07-11T19:00:00+00:00"],
  ["sim-qf-4", "QUARTER_FINALS", "Colombia", "Switzerland", "2026-07-11T23:00:00+00:00"],
  ["sim-sf-1", "SEMI_FINALS", "Brazil", "Argentina", "2026-07-14T19:00:00+00:00"],
  ["sim-sf-2", "SEMI_FINALS", "Spain", "Colombia", "2026-07-15T19:00:00+00:00"],
  ["sim-final", "FINAL", "Brazil", "Spain", "2026-07-19T19:00:00+00:00"],
  ["sim-t3", "THIRD_PLACE", "Germany", "Portugal", "2026-07-18T19:00:00+00:00"],
].map(([id, fase, time_a, time_b, inicia_em]) => ({
  id,
  fase,
  time_a,
  time_b,
  inicia_em,
  placar_a: 0,
  placar_b: 0,
  status: "NS",
}));

export function ChaveamentoAutomatico() {
  const [partidas, setPartidas] = useState<PartidaMataMata[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [simulando, setSimulando] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(USAR_SIMULACAO_KEY) === "true";
  });

  const carregar = async () => {
    setCarregando(true);
    const { data, error } = await supabase
      .from("partidas")
      .select("id,time_a,time_b,placar_a,placar_b,status,inicia_em,fase")
      .in("fase", [...MATA_MATA_FASES, "THIRD_PLACE"])
      .order("inicia_em", { ascending: true });

    if (!error) {
      setPartidas((data ?? []) as PartidaMataMata[]);
    }
    setCarregando(false);
  };

  useEffect(() => {
    carregar();
    const canal = supabase
      .channel("chaveamento-automatico")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "partidas" },
        (payload) => {
          const fase = (payload.new as Partial<PartidaMataMata>)?.fase ?? (payload.old as Partial<PartidaMataMata>)?.fase;
          if (fase && ![...MATA_MATA_FASES, "THIRD_PLACE"].includes(fase)) return;
          carregar();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  const porFase = useMemo(() => {
    const map = new Map<string, PartidaMataMata[]>();
    const fonte = simulando ? PARTIDAS_SIMULADAS : partidas;
    fonte.forEach((partida) => {
      const fase = partida.fase ?? "INDEFINIDA";
      const lista = map.get(fase) ?? [];
      lista.push(partida);
      map.set(fase, lista);
    });
    MATA_MATA_FASES.forEach((fase) => {
      if (!map.has(fase)) map.set(fase, []);
    });
    return map;
  }, [partidas, simulando]);

  const terceiroLugar = porFase.get("THIRD_PLACE")?.[0];
  const total = MATA_MATA_FASES.reduce(
    (acc, fase) => acc + (porFase.get(fase)?.filter(confrontoDefinido).length ?? 0),
    0,
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-brand">Chaveamento automático</div>
            <h2 className="mt-1 text-xl font-extrabold text-brand-dark">Mata-mata da Copa 2026</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              O diagrama é preenchido pelo banco conforme a football-data.org atualiza os classificados e confrontos.
              Enquanto nenhum time tiver avançado, os espaços ficam em branco como "A definir".
            </p>
          </div>
          <Badge variant="outline">{carregando ? "Carregando..." : `${total}/31 confrontos definidos`}</Badge>
          <button
            type="button"
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-brand-dark shadow-sm transition-colors hover:bg-brand-soft"
            onClick={() => {
              const proximo = !simulando;
              setSimulando(proximo);
              localStorage.setItem(USAR_SIMULACAO_KEY, String(proximo));
            }}
          >
            {simulando ? "Ver dados reais" : "Simular confrontos"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {MATA_MATA_FASES.map((fase) => {
            const lista = [...(porFase.get(fase) ?? [])]
              .filter(confrontoDefinido)
              .sort((a, b) => (a.inicia_em ?? "").localeCompare(b.inicia_em ?? ""));
            return (
              <div key={fase} className="rounded-xl border border-border bg-brand-soft/30 p-3">
                <div className="mb-3">
                  <div className="text-sm font-bold text-brand-dark">{faseLabel(fase)}</div>
                  <div className="text-xs text-muted-foreground">
                    {lista.length ? `${lista.length} ${lista.length === 1 ? "confronto" : "confrontos"}` : "Aguardando classificados"}
                  </div>
                </div>
                <div className="grid gap-2">
                  {lista.length ? (
                    lista.map((partida) => (
                      <ChaveCard key={partida.id} partida={partida} destaque={fase === "FINAL"} />
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
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-brand-dark">Disputa do 3º lugar</h3>
              <p className="text-xs text-muted-foreground">Atualizada automaticamente pela API</p>
            </div>
            <Badge variant="secondary">Extra</Badge>
          </div>
          {terceiroLugar && confrontoDefinido(terceiroLugar) ? (
            <ChaveCard partida={terceiroLugar} />
          ) : (
            <ChaveVazia fase="THIRD_PLACE" />
          )}
        </div>
        <div className="rounded-2xl border border-border bg-brand-soft/60 p-4">
          <h3 className="text-sm font-bold text-brand-dark">Como funciona</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Ninguém precisa preencher manualmente. O cron sincroniza a tabela `partidas`; quando a API informar
            os classificados do mata-mata, esta tela muda sozinha.
          </p>
        </div>
      </div>
    </div>
  );
}

function ChaveVazia({ fase }: { fase: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-background/70 p-5 text-center text-xs text-muted-foreground">
      {faseLabel(fase)}
      <div className="mt-1 font-semibold">Aguardando classificados</div>
    </div>
  );
}

function ChaveCard({ partida, destaque = false }: { partida: PartidaMataMata; destaque?: boolean }) {
  const finalizado = ["FT", "AET", "PEN"].includes(partida.status);
  const vencedorA = finalizado && partida.placar_a > partida.placar_b;
  const vencedorB = finalizado && partida.placar_b > partida.placar_a;

  return (
    <div className={`rounded-lg border border-border bg-background p-2 shadow-sm ${destaque ? "ring-2 ring-brand/30" : ""}`}>
      <div className="mb-1 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <span>{partida.inicia_em ? new Date(partida.inicia_em).toLocaleDateString("pt-BR") : "Data a definir"}</span>
        <Badge variant={AO_VIVO.has(partida.status) ? "destructive" : "outline"} className="h-5 px-1.5 text-[10px]">
          {partida.status}
        </Badge>
      </div>
      <EquipeLinha nome={partida.time_a} placar={partida.placar_a} vencedor={vencedorA} />
      <EquipeLinha nome={partida.time_b} placar={partida.placar_b} vencedor={vencedorB} />
    </div>
  );
}

function EquipeLinha({ nome, placar, vencedor }: { nome: string; placar: number; vencedor: boolean }) {
  const indefinido = !nome || nome === "A definir";
  const selecaoId = indefinido ? undefined : TIME_ID_POR_NOME[nome];
  const bandeira = selecaoId ? flagUrl(selecaoId, 80) : "";

  return (
    <div className={`mt-1 flex items-center justify-between rounded-md px-2 py-1.5 text-sm ${vencedor ? "bg-green-500/10 font-bold text-green-700" : "bg-muted/60"}`}>
      <span className={`flex min-w-0 items-center gap-2 ${indefinido ? "text-muted-foreground" : ""}`}>
        {bandeira && (
          <img
            src={bandeira}
            alt={flagAlt(selecaoId)}
            className="h-3.5 w-5 shrink-0 rounded-[2px] border border-border object-cover shadow-sm"
            loading="lazy"
          />
        )}
        <span className="truncate">{indefinido ? "A definir" : nome}</span>
      </span>
      <span className="font-extrabold tabular-nums">{placar}</span>
    </div>
  );
}
