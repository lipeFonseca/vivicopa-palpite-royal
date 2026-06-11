import { selecoes } from "@/data/worldcup2026";

const isoMap: Record<string, string> = {
  mex: "mx", rsa: "za", kor: "kr", cze: "cz",
  can: "ca", bih: "ba", qat: "qa", sui: "ch",
  bra: "br", mar: "ma", hai: "ht", sco: "gb-sct",
  usa: "us", par: "py", aus: "au", tur: "tr",
  ger: "de", cur: "cw", civ: "ci", ecu: "ec",
  ned: "nl", jpn: "jp", swe: "se", tun: "tn",
  bel: "be", egy: "eg", irn: "ir", nzl: "nz",
  esp: "es", cpv: "cv", ksa: "sa", uru: "uy",
  fra: "fr", sen: "sn", irq: "iq", nor: "no",
  aut: "at", jor: "jo", arg: "ar", alg: "dz",
  por: "pt", cod: "cd", uzb: "uz", col: "co",
  eng: "gb-eng", cro: "hr", gha: "gh", pan: "pa",
};

// Maps football-data.org 3-letter FIFA area codes → flagcdn.com ISO-2 codes.
// Used to get proper country flags from Supabase partidas team names.
const fifaToIso: Record<string, string> = {
  MEX: "mx", RSA: "za", KOR: "kr", CZE: "cz",
  CAN: "ca", BIH: "ba", QAT: "qa", CHE: "ch",
  BRA: "br", MAR: "ma", HTI: "ht", SCO: "gb-sct",
  USA: "us", PRY: "py", AUS: "au", TUR: "tr",
  DEU: "de", CUW: "cw", CIV: "ci", ECU: "ec",
  NLD: "nl", JPN: "jp", SWE: "se", TUN: "tn",
  BEL: "be", EGY: "eg", IRN: "ir", NZL: "nz",
  ESP: "es", CPV: "cv", KSA: "sa", URY: "uy",
  FRA: "fr", SEN: "sn", IRQ: "iq", NOR: "no",
  AUT: "at", JOR: "jo", ARG: "ar", ALG: "dz",
  POR: "pt", COD: "cd", UZB: "uz", COL: "co",
  ENG: "gb-eng", HRV: "hr", GHA: "gh", PAN: "pa",
};

export function flagUrl(id: string, size: 80 | 160 | 320 = 160): string {
  const iso = isoMap[id];
  if (!iso) return "";
  return `https://flagcdn.com/w${size}/${iso}.png`;
}

/** Returns a flagcdn.com URL from a FIFA/football-data.org 3-letter area code. */
export function flagUrlFromFifaCode(fifaCode: string, size: 80 | 160 | 320 = 160): string {
  const iso = fifaToIso[fifaCode?.toUpperCase()];
  if (!iso) return "";
  return `https://flagcdn.com/w${size}/${iso}.png`;
}

export function flagAlt(id: string): string {
  const s = selecoes.find((x) => x.id === id);
  return s ? `Bandeira ${s.nome}` : "Bandeira";
}
