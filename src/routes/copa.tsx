import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <div className="mx-auto min-h-screen max-w-3xl p-4">
      <h1 className="mb-4 text-2xl font-extrabold">Copa 2026 — Palpites em família</h1>
      <Tabs defaultValue="jogos">
        <TabsList className="w-full">
          <TabsTrigger value="jogos" className="flex-1">Jogos</TabsTrigger>
          <TabsTrigger value="ranking" className="flex-1">Ranking</TabsTrigger>
        </TabsList>
        <TabsContent value="jogos" className="mt-4">
          <Jogos userId={userId} />
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

  if (!partidas.length) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
        Nenhuma partida cadastrada ainda.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {partidas.map((p) => (
        <PartidaCard
          key={p.id}
          partida={p}
          palpite={palpites[p.id]}
          onSalvo={recarregar}
          userId={userId}
        />
      ))}
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
        <span className="text-muted-foreground">
          {partida.inicia_em ? new Date(partida.inicia_em).toLocaleString("pt-BR") : "—"}
        </span>
        {aoVivo ? (
          <Badge variant="destructive" className="animate-pulse">AO VIVO · {partida.status}</Badge>
        ) : finalizado ? (
          <Badge variant="secondary">Encerrado</Badge>
        ) : (
          <Badge variant="outline">Aguardando</Badge>
        )}
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
