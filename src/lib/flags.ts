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

export function flagUrl(id: string, size: 80 | 160 | 320 = 160): string {
  const iso = isoMap[id];
  if (!iso) return "";
  return `https://flagcdn.com/w${size}/${iso}.png`;
}

export function flagAlt(id: string): string {
  const s = selecoes.find((x) => x.id === id);
  return s ? `Bandeira ${s.nome}` : "Bandeira";
}
