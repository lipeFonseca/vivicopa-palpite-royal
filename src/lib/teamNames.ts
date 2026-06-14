import { getSelecao, selecoes } from "@/data/worldcup2026";

const aliasesById: Record<string, string[]> = {
  mex: ["Mexico", "México"],
  rsa: ["South Africa", "África do Sul"],
  kor: ["South Korea", "Coreia do Sul"],
  cze: ["Czech Republic", "Czechia", "República Tcheca"],
  can: ["Canada", "Canadá"],
  bih: ["Bosnia and Herzegovina", "Bosnia-Herzegovina", "Bósnia e Herzegovina"],
  qat: ["Qatar", "Catar"],
  sui: ["Switzerland", "Suíça"],
  bra: ["Brazil", "Brasil"],
  mar: ["Morocco", "Marrocos"],
  hai: ["Haiti"],
  sco: ["Scotland", "Escócia"],
  usa: ["United States", "USA", "Estados Unidos"],
  par: ["Paraguay", "Paraguai"],
  aus: ["Australia", "Austrália"],
  tur: ["Turkey", "Turkiye", "Turquia"],
  ger: ["Germany", "Alemanha"],
  cur: ["Curacao", "Curaçao", "Curaçau", "Curaçáo", "Curaçao", "Curaçau"],
  civ: ["Ivory Coast", "Cote d'Ivoire", "Côte d'Ivoire", "Costa do Marfim"],
  ecu: ["Ecuador", "Equador"],
  ned: ["Netherlands", "Holland", "Holanda"],
  jpn: ["Japan", "Japão"],
  swe: ["Sweden", "Suécia"],
  tun: ["Tunisia", "Tunísia"],
  bel: ["Belgium", "Bélgica"],
  egy: ["Egypt", "Egito"],
  irn: ["Iran", "Irã"],
  nzl: ["New Zealand", "Nova Zelândia"],
  esp: ["Spain", "Espanha"],
  cpv: ["Cape Verde", "Cabo Verde"],
  ksa: ["Saudi Arabia", "Arábia Saudita"],
  uru: ["Uruguay", "Uruguai"],
  fra: ["France", "França"],
  sen: ["Senegal"],
  irq: ["Iraq", "Iraque"],
  nor: ["Norway", "Noruega"],
  aut: ["Austria", "Áustria"],
  jor: ["Jordan", "Jordânia"],
  arg: ["Argentina"],
  alg: ["Algeria", "Argélia"],
  por: ["Portugal"],
  cod: ["DR Congo", "Congo DR", "Rep. Dem. do Congo", "República Democrática do Congo"],
  uzb: ["Uzbekistan", "Uzbequistão"],
  col: ["Colombia", "Colômbia"],
  eng: ["England", "Inglaterra"],
  cro: ["Croatia", "Croácia"],
  gha: ["Ghana", "Gana"],
  pan: ["Panama", "Panamá"],
};

function normalizeTeamName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['.]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const teamIdByNormalizedName: Record<string, string> = {};

for (const selecao of selecoes) {
  teamIdByNormalizedName[normalizeTeamName(selecao.nome)] = selecao.id;
}

for (const [id, aliases] of Object.entries(aliasesById)) {
  for (const alias of aliases) {
    teamIdByNormalizedName[normalizeTeamName(alias)] = id;
  }
}

export function resolveTeamIdByName(name?: string | null) {
  if (!name) return undefined;
  return teamIdByNormalizedName[normalizeTeamName(name)];
}

export function getCanonicalTeamName(name?: string | null) {
  if (!name) return "";
  const id = resolveTeamIdByName(name);
  return id ? getSelecao(id)?.nome ?? name : name;
}

export function getTeamAliases(nameOrId: string) {
  const id = getSelecao(nameOrId) ? nameOrId : resolveTeamIdByName(nameOrId);
  if (!id) return [nameOrId];
  const canonical = getSelecao(id)?.nome;
  return Array.from(new Set([canonical, ...(aliasesById[id] ?? [])].filter(Boolean))) as string[];
}
