/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo } from "react";
import { usePartidasStore, type Partida } from "@/store/partidasStore";
import { getCanonicalTeamName, getTeamAliases } from "@/lib/teamNames";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEspnLiveScores, espnNorm } from "./useEspnLiveScores";

function overlayEspnScores(partidas: Partida[], espnScores: ReturnType<typeof useEspnLiveScores>) {
  if (espnScores.size === 0) return partidas;

  return partidas.map((p) => {
    const key = `${espnNorm(p.time_a)}|${espnNorm(p.time_b)}`;
    const espn = espnScores.get(key);
    if (!espn) return p;

    return {
      ...p,
      status: espn.status,
      placar_a: espn.placarA,
      placar_b: espn.placarB,
      minuto: espn.minuto ?? p.minuto,
      acrescimos: espn.acrescimos ?? p.acrescimos,
    };
  });
}

type EspnSummaryStats = NonNullable<Partida["estatisticas_a"]>;
type EspnGoalEvent = {
  minuto: number;
  acrescimos: number | null;
  tipo: "REGULAR" | "OWN" | "PENALTY";
  time_nome: string | null;
  marcador_nome: string | null;
};
type EspnSummaryOverlay = {
  espn_id?: string | null;
  estatisticas_a: EspnSummaryStats | null;
  estatisticas_b: EspnSummaryStats | null;
  gols: EspnGoalEvent[];
};
export type EspnTournamentScorer = {
  playerName: string;
  teamName: string;
  goals: number;
};
export type EspnBrazilPlayerTotals = {
  playerName: string;
  goals: number;
  assists: number;
};

function hasMatchStats(partida: Partida) {
  return Boolean(partida.estatisticas_a || partida.estatisticas_b);
}

async function fetchEspnSummaryStats(espnId: string) {
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${espnId}`,
  );
  if (!res.ok) throw new Error(`ESPN summary HTTP ${res.status} for event ${espnId}`);
  const data = await res.json();
  const teams = data?.boxscore?.teams ?? [];
  const keyEvents = Array.isArray(data?.keyEvents) ? data.keyEvents : [];

  const mapStats = (team: any): EspnSummaryStats | null => {
    if (!team) return null;
    const stats = Array.isArray(team.statistics) ? team.statistics : [];
    const get = (name: string) => {
      const raw = stats.find((s: any) => s?.name === name)?.displayValue;
      const parsed = typeof raw === "string" ? Number.parseFloat(raw) : Number(raw);
      return Number.isFinite(parsed) ? parsed : null;
    };

    return {
      posse: get("possessionPct"),
      chutes: get("totalShots"),
      chutes_no_gol: get("shotsOnTarget"),
      escanteios: get("wonCorners"),
      faltas: get("foulsCommitted"),
      amarelos: get("yellowCards"),
      vermelhos: get("redCards"),
      impedimentos: get("offsides"),
      defesas: get("saves"),
    };
  };

  const parseClock = (displayClock?: string | null) => {
    const value = displayClock ?? "";
    const plus = value.match(/^(\d+)'\+(\d+)/);
    if (plus) {
      return {
        minuto: Number.parseInt(plus[1], 10),
        acrescimos: Number.parseInt(plus[2], 10) || null,
      };
    }
    const regular = value.match(/^(\d+)'/);
    if (regular) {
      return { minuto: Number.parseInt(regular[1], 10), acrescimos: null };
    }
    return { minuto: 0, acrescimos: null };
  };

  const goals = keyEvents
    .filter((event: any) => ["goal", "penalty---scored", "own-goal"].includes(event?.type?.type))
    .map((event: any) => {
      const type = event?.type?.type;
      const { minuto, acrescimos } = parseClock(event?.clock?.displayValue);
      return {
        minuto,
        acrescimos,
        tipo: type === "penalty---scored" ? "PENALTY" : type === "own-goal" ? "OWN" : "REGULAR",
        time_nome: event?.team?.displayName ?? null,
        marcador_nome: event?.participants?.[0]?.athlete?.displayName ?? null,
      } satisfies EspnGoalEvent;
    });

  return {
    espn_id: espnId,
    estatisticas_a: mapStats(teams.find((team: any) => team?.homeAway === "home") ?? teams[0]),
    estatisticas_b: mapStats(teams.find((team: any) => team?.homeAway === "away") ?? teams[1]),
    gols: goals,
  };
}

async function resolveEspnEventIds(partidas: Partida[]) {
  const dates = Array.from(
    new Set(
      partidas
        .map((partida) => partida.inicia_em?.slice(0, 10))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const scoreboardEntries = await Promise.all(
    dates.map(async (date) => {
      const res = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${date.replaceAll("-", "")}`,
      );
      if (!res.ok) throw new Error(`ESPN scoreboard HTTP ${res.status} for date ${date}`);
      const data = await res.json();
      const events = Array.isArray(data?.events) ? data.events : [];
      return events.map((event: any) => {
        const comp = event?.competitions?.[0];
        const competitors = Array.isArray(comp?.competitors) ? comp.competitors : [];
        const home = competitors.find((team: any) => team?.homeAway === "home");
        const away = competitors.find((team: any) => team?.homeAway === "away");
        return {
          espnId: String(event?.id ?? ""),
          date,
          key: `${espnNorm(home?.team?.displayName ?? "")}|${espnNorm(away?.team?.displayName ?? "")}|${date}`,
        };
      });
    }),
  );

  const eventIdByKey = new Map<string, string>();
  scoreboardEntries.flat().forEach((entry) => {
    if (entry.espnId && entry.key) eventIdByKey.set(entry.key, entry.espnId);
  });

  return new Map(
    partidas.map((partida) => {
      const date = partida.inicia_em?.slice(0, 10) ?? "";
      const key = `${espnNorm(partida.time_a)}|${espnNorm(partida.time_b)}|${date}`;
      return [partida.id, eventIdByKey.get(key) ?? null] as const;
    }),
  );
}

function formatEspnDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function buildEspnTournamentDateRange(startDateIso: string, endDate: Date) {
  const start = new Date(`${startDateIso}T00:00:00Z`);
  const cursor = new Date(start);
  const end = new Date(
    Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()),
  );
  const dates: string[] = [];

  while (cursor.getTime() <= end.getTime()) {
    dates.push(formatEspnDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

async function fetchEspnTournamentEventIds(
  startDateIso: string,
  filterFn?: (event: any) => boolean,
) {
  const dates = buildEspnTournamentDateRange(startDateIso, new Date());
  const scoreboardDays = await Promise.all(
    dates.map(async (date) => {
      const res = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${date}`,
      );
      if (!res.ok) throw new Error(`ESPN scoreboard HTTP ${res.status} for date ${date}`);
      return res.json();
    }),
  );

  return Array.from(
    new Set(
      scoreboardDays
        .flatMap((day) => (Array.isArray(day?.events) ? day.events : []))
        .filter((event: any) => {
          const state = event?.status?.type?.state;
          const hasStarted = state === "post" || state === "in";
          return hasStarted && (filterFn ? filterFn(event) : true);
        })
        .map((event: any) => String(event?.id ?? "").trim())
        .filter((value: string) => value.length > 0),
    ),
  );
}

function useEspnStartedDetails(partidas: Partida[]) {
  const startedPartidas = useMemo(
    () => partidas.filter((partida) => partida.status !== "NS" && Boolean(partida.inicia_em)),
    [partidas],
  );

  return useQuery({
    queryKey: [
      "espn-started-details",
      startedPartidas.map((partida) => ({
        id: partida.id,
        espn_id: partida.espn_id ?? null,
        date: partida.inicia_em?.slice(0, 10) ?? null,
        time_a: partida.time_a,
        time_b: partida.time_b,
      })),
    ],
    queryFn: async () => {
      const resolvedEventIds = await resolveEspnEventIds(startedPartidas);
      const uniqueEspnIds = Array.from(
        new Set(
          startedPartidas
            .map((partida) => partida.espn_id ?? resolvedEventIds.get(partida.id) ?? null)
            .filter((value): value is string => Boolean(value)),
        ),
      );

      const entries = await Promise.all(
        uniqueEspnIds.map(async (espnId) => [espnId, await fetchEspnSummaryStats(espnId)] as const),
      );
      const statsByEspnId = new Map(entries);

      return new Map(
        startedPartidas.map((partida) => {
          const espnId = partida.espn_id ?? resolvedEventIds.get(partida.id) ?? null;
          return [partida.id, espnId ? (statsByEspnId.get(espnId) ?? null) : null] as const;
        }),
      );
    },
    enabled: startedPartidas.length > 0,
    staleTime: 60_000,
  });
}

export function useEspnTournamentScorers() {
  return useQuery({
    queryKey: ["espn-tournament-scorers", new Date().toISOString().slice(0, 10)],
    queryFn: async () => {
      const uniqueEspnIds = await fetchEspnTournamentEventIds("2026-06-11");

      const summaries = await Promise.all(
        uniqueEspnIds.map(async (espnId) => {
          const res = await fetch(
            `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${espnId}`,
          );
          if (!res.ok) throw new Error(`ESPN summary HTTP ${res.status} for event ${espnId}`);
          return res.json();
        }),
      );

      const scorers = new Map<string, EspnTournamentScorer>();

      summaries.forEach((summary) => {
        const keyEvents = Array.isArray(summary?.keyEvents) ? summary.keyEvents : [];
        keyEvents.forEach((event: any) => {
          const type = event?.type?.type;
          if (type !== "goal" && type !== "penalty---scored") return;
          const playerName = event?.participants?.[0]?.athlete?.displayName?.trim();
          const teamName = event?.team?.displayName?.trim();
          if (!playerName || !teamName) return;

          const key = `${playerName}@@${teamName}`;
          const current = scorers.get(key);
          if (current) current.goals += 1;
          else scorers.set(key, { playerName, teamName, goals: 1 });
        });
      });

      return Array.from(scorers.values()).sort((a, b) => {
        if (a.goals !== b.goals) return b.goals - a.goals;
        return `${a.playerName} ${a.teamName}`.localeCompare(
          `${b.playerName} ${b.teamName}`,
          "pt-BR",
        );
      });
    },
    staleTime: 60_000,
  });
}

export function useEspnBrazilPlayerTotals() {
  return useQuery({
    queryKey: ["espn-brazil-player-totals", new Date().toISOString().slice(0, 10)],
    queryFn: async () => {
      const brazilEventIds = await fetchEspnTournamentEventIds("2026-06-11", (event) => {
        const competitors = Array.isArray(event?.competitions?.[0]?.competitors)
          ? event.competitions[0].competitors
          : [];
        return competitors.some(
          (competitor: any) => espnNorm(competitor?.team?.displayName ?? "") === "brazil",
        );
      });

      const summaries = await Promise.all(
        brazilEventIds.map(async (espnId) => {
          const res = await fetch(
            `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${espnId}`,
          );
          if (!res.ok) throw new Error(`ESPN summary HTTP ${res.status} for event ${espnId}`);
          return res.json();
        }),
      );

      const players = new Map<string, EspnBrazilPlayerTotals>();

      summaries.forEach((summary) => {
        const brazilRoster = Array.isArray(summary?.rosters)
          ? summary.rosters.find(
              (roster: any) => espnNorm(roster?.team?.displayName ?? "") === "brazil",
            )
          : null;
        const rosterEntries = Array.isArray(brazilRoster?.roster) ? brazilRoster.roster : [];

        rosterEntries.forEach((entry: any) => {
          const playerName = entry?.athlete?.displayName?.trim();
          if (!playerName) return;

          const stats = Array.isArray(entry?.stats) ? entry.stats : [];
          const goals = Number(stats.find((stat: any) => stat?.name === "totalGoals")?.value ?? 0);
          const assists = Number(
            stats.find((stat: any) => stat?.name === "goalAssists")?.value ?? 0,
          );
          const current = players.get(playerName);

          if (current) {
            current.goals += Number.isFinite(goals) ? goals : 0;
            current.assists += Number.isFinite(assists) ? assists : 0;
          } else {
            players.set(playerName, {
              playerName,
              goals: Number.isFinite(goals) ? goals : 0,
              assists: Number.isFinite(assists) ? assists : 0,
            });
          }
        });
      });

      return Array.from(players.values()).sort((a, b) => {
        if (a.goals !== b.goals) return b.goals - a.goals;
        if (a.assists !== b.assists) return b.assists - a.assists;
        return a.playerName.localeCompare(b.playerName, "pt-BR");
      });
    },
    staleTime: 60_000,
  });
}

function overlayEspnSummaryStats(
  partidas: Partida[],
  statsMap?: Map<string, EspnSummaryOverlay | null>,
) {
  if (!statsMap || statsMap.size === 0) return partidas;

  return partidas.map((partida) => {
    const stats = statsMap.get(partida.id);
    if (!stats) return partida;
    return {
      ...partida,
      espn_id: stats.espn_id ?? partida.espn_id ?? null,
      estatisticas_a: stats.estatisticas_a ?? partida.estatisticas_a ?? null,
      estatisticas_b: stats.estatisticas_b ?? partida.estatisticas_b ?? null,
      gols: stats.gols.length > 0 ? stats.gols : (partida.gols ?? null),
    };
  });
}

export function usePartidas() {
  const { partidas, loading, start } = usePartidasStore();
  useEffect(() => {
    start();
    // NÃO chama stop() — o store é singleton global
  }, [start]);
  return { partidas, loading };
}

export function usePartidasComPlacarAoVivo() {
  const { partidas, loading } = usePartidas();
  const espnScores = useEspnLiveScores();
  const { data: espnSummaryStats } = useEspnStartedDetails(partidas);

  return useMemo(
    () => ({
      partidas: overlayEspnSummaryStats(overlayEspnScores(partidas, espnScores), espnSummaryStats),
      loading,
    }),
    [partidas, espnScores, espnSummaryStats, loading],
  );
}

// ---------- ResultadosPorJogo (substitui useResultadosPorJogo e useCalendarioResultados) ----------

export type PartidaResultado = Partida & { id: string; inicia_em: string | null };

export function usePartidasResultados() {
  const { partidas, loading } = usePartidas();
  return { partidas: partidas as PartidaResultado[], loading };
}

// ---------- Jogos de Hoje / Ao Vivo (substitui useJogosHoje) ----------

const LIVE_STATUSES = ["LIVE", "HT", "ET", "PEN_LIVE", "1H", "2H", "BT", "P"];

export function useJogosHojeStore() {
  const { partidas } = usePartidas();
  const espnScores = useEspnLiveScores();

  return useMemo(() => {
    // Overlay ESPN live scores (atualização a cada 10s, zero custo no banco)
    const ps = overlayEspnScores(partidas, espnScores);

    const aoVivo = ps.filter((p) => LIVE_STATUSES.includes(p.status));
    const idsAoVivo = new Set(aoVivo.map((p) => p.id));

    const brasiliaHoje = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const inicioHoje = new Date(brasiliaHoje + "T03:00:00.000Z").getTime();
    const fimHoje = inicioHoje + 24 * 60 * 60 * 1000;

    const hoje = ps.filter((p) => {
      if (!p.inicia_em) return false;
      const t = new Date(p.inicia_em).getTime();
      return t >= inicioHoje && t < fimHoje;
    });

    if (hoje.length > 0) {
      return { jogosAoVivo: aoVivo, jogosHoje: hoje, tituloSecao: "Jogos de Hoje" };
    }

    const now = Date.now();
    const proximos = ps
      .filter(
        (p) =>
          p.status === "NS" &&
          p.inicia_em &&
          new Date(p.inicia_em).getTime() >= now &&
          !idsAoVivo.has(p.id),
      )
      .slice(0, 3);

    return { jogosAoVivo: aoVivo, jogosHoje: proximos, tituloSecao: "Próximos Jogos" };
  }, [partidas, espnScores]);
}

// ---------- Classificação por Grupo (substitui useClassificacaoGrupos) ----------

export function usePartidasGrupo() {
  const { partidas } = usePartidas();
  const espnScores = useEspnLiveScores();

  return useMemo(
    () =>
      overlayEspnScores(partidas, espnScores)
        .filter((p) => p.grupo != null)
        .map((p) => ({
          ...p,
          time_a: getCanonicalTeamName(p.time_a) || p.time_a,
          time_b: getCanonicalTeamName(p.time_b) || p.time_b,
          grupo: p.grupo!.replace(/^GROUP_/i, ""),
        })),
    [partidas, espnScores],
  );
}

// ---------- Seleções (React Query — busca 1x por sessão) ----------

export type SelecaoDb = { nome: string; area_bandeira: string | null; escudo_url: string | null };

export function useSelecoes() {
  return useQuery({
    queryKey: ["selecoes"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("selecoes")
        .select("nome,area_bandeira,escudo_url");
      return (data ?? []) as SelecaoDb[];
    },
    staleTime: Infinity,
  });
}

export function useSelecoesFlagMap() {
  const { data: selData = [] } = useSelecoes();
  return useMemo(() => {
    const map: Record<string, string> = {};
    selData.forEach((s) => {
      const image = s.area_bandeira ?? s.escudo_url ?? "";
      getTeamAliases(s.nome).forEach((alias) => {
        map[alias] = image;
      });
    });
    return map;
  }, [selData]);
}
