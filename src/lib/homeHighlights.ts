import { getCanonicalTeamName, resolveTeamIdByName } from "@/lib/teamNames";

type MatchStatsLite = {
  posse: number | null;
  chutes: number | null;
  chutes_no_gol: number | null;
  escanteios: number | null;
  faltas: number | null;
  amarelos: number | null;
  vermelhos: number | null;
  defesas: number | null;
};

type GoalEventLite = {
  tipo?: string | null;
  time_nome?: string | null;
  marcador_nome?: string | null;
};

export type HomeHighlightSource = {
  id: string;
  time_a: string;
  time_b: string;
  placar_a: number | null;
  placar_b: number | null;
  status: string;
  gols?: GoalEventLite[] | null;
  estatisticas_a?: MatchStatsLite | null;
  estatisticas_b?: MatchStatsLite | null;
};

export type HomeHighlightRankingEntry = {
  teamName: string;
  value: number;
  valueLabel: string;
  label?: string;
  secondaryLabel?: string;
  rank?: number;
};

export type HomeHighlightCard = {
  id: string;
  title: string;
  subject: string;
  value: string;
  detail: string;
  teamName?: string;
  ranking?: HomeHighlightRankingEntry[];
};

export type TournamentScorerSource = {
  playerName: string;
  teamName: string;
  goals: number;
};

export type BrazilPlayerTotalsSource = {
  playerName: string;
  goals: number;
  assists: number;
};

type TeamTotals = {
  goals: number;
  saves: number;
  shotsTotal: number;
  shotsOnTarget: number;
  corners: number;
  fouls: number;
  yellows: number;
  reds: number;
  possessionSum: number;
  possessionMatches: number;
};

const STARTED_STATUSES = new Set([
  "LIVE",
  "HT",
  "ET",
  "PEN_LIVE",
  "1H",
  "2H",
  "BT",
  "P",
  "FT",
  "AET",
  "PEN",
]);

function canonicalTeamName(name: string) {
  return getCanonicalTeamName(name) || name;
}

function getTeamTotals(store: Map<string, TeamTotals>, teamName: string): TeamTotals {
  const canonical = canonicalTeamName(teamName);
  let current = store.get(canonical);
  if (!current) {
    current = {
      goals: 0,
      saves: 0,
      shotsTotal: 0,
      shotsOnTarget: 0,
      corners: 0,
      fouls: 0,
      yellows: 0,
      reds: 0,
      possessionSum: 0,
      possessionMatches: 0,
    };
    store.set(canonical, current);
  }
  return current;
}

function isStartedMatch(partida: HomeHighlightSource) {
  return (
    STARTED_STATUSES.has(partida.status) || partida.placar_a !== null || partida.placar_b !== null
  );
}

function formatCount(value: number, singular: string, plural = singular) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function aggregateTeamStats(partidas: HomeHighlightSource[]) {
  const teamTotals = new Map<string, TeamTotals>();
  const scorers = new Map<string, { playerName: string; teamName: string; goals: number }>();

  for (const partida of partidas) {
    if (!isStartedMatch(partida)) continue;

    const teamA = canonicalTeamName(partida.time_a);
    const teamB = canonicalTeamName(partida.time_b);
    getTeamTotals(teamTotals, teamA).goals += partida.placar_a ?? 0;
    getTeamTotals(teamTotals, teamB).goals += partida.placar_b ?? 0;

    const statsA = partida.estatisticas_a;
    if (statsA) {
      const totalsA = getTeamTotals(teamTotals, teamA);
      totalsA.saves += statsA.defesas ?? 0;
      totalsA.shotsTotal += statsA.chutes ?? 0;
      totalsA.shotsOnTarget += statsA.chutes_no_gol ?? 0;
      totalsA.corners += statsA.escanteios ?? 0;
      totalsA.fouls += statsA.faltas ?? 0;
      totalsA.yellows += statsA.amarelos ?? 0;
      totalsA.reds += statsA.vermelhos ?? 0;
      if (statsA.posse !== null) {
        totalsA.possessionSum += statsA.posse;
        totalsA.possessionMatches += 1;
      }
    }

    const statsB = partida.estatisticas_b;
    if (statsB) {
      const totalsB = getTeamTotals(teamTotals, teamB);
      totalsB.saves += statsB.defesas ?? 0;
      totalsB.shotsTotal += statsB.chutes ?? 0;
      totalsB.shotsOnTarget += statsB.chutes_no_gol ?? 0;
      totalsB.corners += statsB.escanteios ?? 0;
      totalsB.fouls += statsB.faltas ?? 0;
      totalsB.yellows += statsB.amarelos ?? 0;
      totalsB.reds += statsB.vermelhos ?? 0;
      if (statsB.posse !== null) {
        totalsB.possessionSum += statsB.posse;
        totalsB.possessionMatches += 1;
      }
    }

    const goals = Array.isArray(partida.gols) ? partida.gols : [];
    for (const goal of goals) {
      const scorerName = goal.marcador_nome?.trim();
      const teamName = goal.time_nome?.trim();
      if (!scorerName || !teamName || goal.tipo === "OWN") continue;

      const canonical = canonicalTeamName(teamName);
      const key = `${scorerName}@@${canonical}`;
      const current = scorers.get(key);
      if (current) current.goals += 1;
      else scorers.set(key, { playerName: scorerName, teamName: canonical, goals: 1 });
    }
  }

  return { teamTotals, scorers };
}

function buildRanking(
  teamTotals: Map<string, TeamTotals>,
  options: {
    selectValue: (totals: TeamTotals) => number;
    shouldInclude?: (totals: TeamTotals) => boolean;
    sortDirection?: "desc" | "asc";
    limit?: number;
    formatValue: (value: number) => string;
  },
) {
  const {
    selectValue,
    shouldInclude = () => true,
    sortDirection = "desc",
    limit = 5,
    formatValue,
  } = options;

  return Array.from(teamTotals.entries())
    .filter(([, totals]) => shouldInclude(totals))
    .map(([teamName, totals]) => ({
      teamName,
      value: selectValue(totals),
    }))
    .sort((a, b) => {
      if (a.value !== b.value) {
        return sortDirection === "desc" ? b.value - a.value : a.value - b.value;
      }
      return a.teamName.localeCompare(b.teamName, "pt-BR");
    })
    .slice(0, limit)
    .map((item) => ({
      ...item,
      valueLabel: formatValue(item.value),
    }));
}

function buildLeaderCard(
  id: string,
  title: string,
  detail: string,
  ranking: HomeHighlightRankingEntry[],
) {
  if (!ranking.length) return null;
  return {
    id,
    title,
    subject: ranking[0].teamName,
    value: ranking[0].valueLabel,
    detail,
    teamName: ranking[0].teamName,
    ranking,
  } satisfies HomeHighlightCard;
}

function buildScorerRanking(scorers: TournamentScorerSource[], limit = 5) {
  const included = [...scorers]
    .sort((a, b) => {
      if (a.goals !== b.goals) return b.goals - a.goals;
      return `${a.playerName} ${a.teamName}`.localeCompare(
        `${b.playerName} ${b.teamName}`,
        "pt-BR",
      );
    })
    .slice(0, limit);

  let previousGoals: number | null = null;
  let currentRank = 0;

  return included.map((item, index) => {
    if (item.goals !== previousGoals) {
      currentRank = index + 1;
      previousGoals = item.goals;
    }

    return {
      teamName: item.teamName,
      value: item.goals,
      valueLabel: formatCount(item.goals, "gol", "gols"),
      label: item.playerName,
      secondaryLabel: item.teamName,
      rank: currentRank,
    } satisfies HomeHighlightRankingEntry;
  });
}

export function buildTournamentHighlights(partidas: HomeHighlightSource[]): HomeHighlightCard[] {
  return buildTournamentHighlightsWithScorers(partidas);
}

export function buildTournamentHighlightsWithScorers(
  partidas: HomeHighlightSource[],
  scorerOverride?: TournamentScorerSource[],
) {
  const { teamTotals, scorers } = aggregateTeamStats(partidas);
  const highlights: HomeHighlightCard[] = [];

  const mostGoalsRanking = buildRanking(teamTotals, {
    selectValue: (totals) => totals.goals,
    shouldInclude: (totals) => totals.goals > 0,
    formatValue: (value) => formatCount(value, "gol", "gols"),
  });
  const mostGoalsCard = buildLeaderCard(
    "team-most-goals",
    "Top 5 ataques",
    "Selecoes com mais gols nas partidas disputadas",
    mostGoalsRanking,
  );
  if (mostGoalsCard) highlights.push(mostGoalsCard);

  const leastGoalsRanking = buildRanking(teamTotals, {
    selectValue: (totals) => totals.goals,
    shouldInclude: (totals) => totals.goals > 0,
    sortDirection: "asc",
    formatValue: (value) => formatCount(value, "gol", "gols"),
  });
  const leastGoalsCard = buildLeaderCard(
    "team-least-goals",
    "Top 5 menores ataques com gol",
    "Entre selecoes que ja balancaram a rede",
    leastGoalsRanking,
  );
  if (leastGoalsCard) highlights.push(leastGoalsCard);

  const topScorersRanking = buildScorerRanking(scorerOverride ?? Array.from(scorers.values()));
  if (topScorersRanking.length > 0) {
    highlights.push({
      id: "top-scorer",
      title: "Top artilheiros",
      subject: topScorersRanking[0].label ?? topScorersRanking[0].teamName,
      value: topScorersRanking[0].valueLabel,
      detail: "Os 5 jogadores com mais gols na Copa",
      teamName: topScorersRanking[0].teamName,
      ranking: topScorersRanking,
    });
  }

  const possessionRanking = buildRanking(teamTotals, {
    selectValue: (totals) => totals.possessionSum / totals.possessionMatches,
    shouldInclude: (totals) => totals.possessionMatches > 0,
    formatValue: (value) => `${Math.round(value)}%`,
  });
  const possessionCard = buildLeaderCard(
    "team-best-possession",
    "Top 5 posse de bola",
    "Media de posse nas partidas com estatisticas",
    possessionRanking,
  );
  if (possessionCard) highlights.push(possessionCard);

  const shotsOnTargetRanking = buildRanking(teamTotals, {
    selectValue: (totals) => totals.shotsOnTarget,
    shouldInclude: (totals) => totals.shotsOnTarget > 0,
    formatValue: (value) => formatCount(value, "chute", "chutes"),
  });
  const shotsOnTargetCard = buildLeaderCard(
    "team-most-shots-on-target",
    "Top 5 chutes no gol",
    "Finalizacoes no alvo somando as partidas com estatisticas",
    shotsOnTargetRanking,
  );
  if (shotsOnTargetCard) highlights.push(shotsOnTargetCard);

  const shotPctRanking = buildRanking(teamTotals, {
    selectValue: (totals) =>
      totals.shotsTotal > 0 ? (totals.shotsOnTarget / totals.shotsTotal) * 100 : 0,
    shouldInclude: (totals) => totals.shotsTotal > 0,
    formatValue: (value) => `${Math.round(value)}%`,
  });
  const shotPctCard = buildLeaderCard(
    "team-best-shot-pct",
    "Top 5 percentual no alvo",
    "Aproveitamento entre chutes totais e no gol",
    shotPctRanking,
  );
  if (shotPctCard) highlights.push(shotPctCard);

  const foulsRanking = buildRanking(teamTotals, {
    selectValue: (totals) => totals.fouls,
    shouldInclude: (totals) => totals.fouls > 0,
    formatValue: (value) => formatCount(value, "falta", "faltas"),
  });
  const foulsCard = buildLeaderCard(
    "team-most-fouls",
    "Top 5 faltas",
    "Faltas cometidas nas partidas com estatisticas",
    foulsRanking,
  );
  if (foulsCard) highlights.push(foulsCard);

  const yellowsRanking = buildRanking(teamTotals, {
    selectValue: (totals) => totals.yellows,
    shouldInclude: (totals) => totals.yellows > 0,
    formatValue: (value) => formatCount(value, "amarelo", "amarelos"),
  });
  const yellowsCard = buildLeaderCard(
    "team-most-yellows",
    "Top 5 amarelos",
    "Cartoes amarelos nas partidas com estatisticas",
    yellowsRanking,
  );
  if (yellowsCard) highlights.push(yellowsCard);

  const redsRanking = buildRanking(teamTotals, {
    selectValue: (totals) => totals.reds,
    shouldInclude: (totals) => totals.reds > 0,
    formatValue: (value) => formatCount(value, "vermelho", "vermelhos"),
  });
  const redsCard = buildLeaderCard(
    "team-most-reds",
    "Top 5 vermelhos",
    "Cartoes vermelhos nas partidas com estatisticas",
    redsRanking,
  );
  if (redsCard) highlights.push(redsCard);

  return highlights;
}

function formatPercent(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded.toFixed(0)}%` : `${rounded.toFixed(1)}%`;
}

function pickBrazilLeader(
  players: BrazilPlayerTotalsSource[],
  selectValue: (player: BrazilPlayerTotalsSource) => number,
) {
  const ordered = [...players]
    .filter((player) => selectValue(player) > 0)
    .sort((a, b) => {
      const valueDiff = selectValue(b) - selectValue(a);
      if (valueDiff !== 0) return valueDiff;
      if (b.goals !== a.goals) return b.goals - a.goals;
      if (b.assists !== a.assists) return b.assists - a.assists;
      return a.playerName.localeCompare(b.playerName, "pt-BR");
    });

  return ordered[0] ?? null;
}

function pickBrazilLeaders(
  players: BrazilPlayerTotalsSource[],
  selectValue: (player: BrazilPlayerTotalsSource) => number,
) {
  const ordered = [...players]
    .filter((player) => selectValue(player) > 0)
    .sort((a, b) => {
      const valueDiff = selectValue(b) - selectValue(a);
      if (valueDiff !== 0) return valueDiff;
      if (b.goals !== a.goals) return b.goals - a.goals;
      if (b.assists !== a.assists) return b.assists - a.assists;
      return a.playerName.localeCompare(b.playerName, "pt-BR");
    });

  if (!ordered.length) return [];
  const leaderValue = selectValue(ordered[0]);
  return ordered.filter((player) => selectValue(player) === leaderValue);
}

export function buildBrazilHighlights(
  partidas: HomeHighlightSource[],
  brazilPlayers: BrazilPlayerTotalsSource[] = [],
): HomeHighlightCard[] {
  const { teamTotals } = aggregateTeamStats(partidas);
  const brazilEntry = Array.from(teamTotals.entries()).find(
    ([teamName]) => resolveTeamIdByName(teamName) === "bra",
  );
  if (!brazilEntry) return [];

  const [teamName, totals] = brazilEntry;
  const possessionAverage =
    totals.possessionMatches > 0 ? totals.possessionSum / totals.possessionMatches : 0;
  const shotPct =
    totals.shotsTotal > 0 ? Math.round((totals.shotsOnTarget / totals.shotsTotal) * 100) : 0;
  const topScorers = pickBrazilLeaders(brazilPlayers, (player) => player.goals);
  const topAssists = pickBrazilLeaders(brazilPlayers, (player) => player.assists);
  const topScorer = pickBrazilLeader(brazilPlayers, (player) => player.goals);
  const topAssist = pickBrazilLeader(brazilPlayers, (player) => player.assists);

  const highlights: HomeHighlightCard[] = [
    {
      id: "brazil-goals",
      title: "Gols do Brasil",
      subject: teamName,
      value: formatCount(totals.goals, "gol", "gols"),
      detail: "Total do Brasil nas partidas disputadas",
      teamName,
    },
    {
      id: "brazil-possession",
      title: "Posse média do Brasil",
      subject: teamName,
      value: formatPercent(possessionAverage),
      detail: "Media de posse do Brasil nas partidas com estatisticas",
      teamName,
    },
    {
      id: "brazil-shots-on-target",
      title: "Chutes do Brasil na Copa",
      subject: teamName,
      value: formatCount(totals.shotsTotal, "chute", "chutes"),
      detail: "Total de chutes do Brasil nas partidas com estatisticas",
      teamName,
    },
    {
      id: "brazil-shot-pct",
      title: "Percentual no alvo do Brasil",
      subject: teamName,
      value: `${shotPct}%`,
      detail: "Aproveitamento acumulado entre chutes totais e no gol",
      teamName,
    },
    {
      id: "brazil-fouls",
      title: "Faltas do Brasil",
      subject: teamName,
      value: formatCount(totals.fouls, "falta", "faltas"),
      detail: "Faltas cometidas nas partidas com estatisticas",
      teamName,
    },
    {
      id: "brazil-yellows",
      title: "Amarelos do Brasil",
      subject: teamName,
      value: formatCount(totals.yellows, "amarelo", "amarelos"),
      detail: "Cartoes amarelos do Brasil",
      teamName,
    },
    {
      id: "brazil-reds",
      title: "Vermelhos do Brasil",
      subject: teamName,
      value: formatCount(totals.reds, "vermelho", "vermelhos"),
      detail: "Cartoes vermelhos do Brasil",
      teamName,
    },
  ];

  if (topScorer) {
    highlights.push({
      id: "brazil-top-scorer",
      title: topScorers.length > 1 ? "Artilheiros do Brasil" : "Artilheiro do Brasil",
      subject: topScorers.length > 1 ? "Brasil" : topScorer.playerName,
      value: formatCount(topScorer.goals, "gol", "gols"),
      detail:
        topScorers.length > 1
          ? "Brasileiros empatados na artilharia da Copa"
          : "Total de gols do principal goleador brasileiro na Copa",
      teamName,
      ranking:
        topScorers.length > 1
          ? topScorers.map((player) => ({
              teamName,
              value: player.goals,
              valueLabel: formatCount(player.goals, "gol", "gols"),
              label: player.playerName,
              rank: 1,
            }))
          : undefined,
    });
  }

  if (topAssist) {
    highlights.push({
      id: "brazil-top-assist",
      title: topAssists.length > 1 ? "Lideres em assistencias do Brasil" : "Mais assistencias do Brasil",
      subject: topAssists.length > 1 ? "Brasil" : topAssist.playerName,
      value: formatCount(topAssist.assists, "assistencia", "assistencias"),
      detail:
        topAssists.length > 1
          ? "Brasileiros empatados na lideranca de assistencias da Copa"
          : "Total de assistencias do lider brasileiro na Copa",
      teamName,
      ranking:
        topAssists.length > 1
          ? topAssists.map((player) => ({
              teamName,
              value: player.assists,
              valueLabel: formatCount(player.assists, "assistencia", "assistencias"),
              label: player.playerName,
              rank: 1,
            }))
          : undefined,
    });
  }

  return highlights;
}
