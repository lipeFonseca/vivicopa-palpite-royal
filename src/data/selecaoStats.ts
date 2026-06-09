// Estatísticas históricas de Copas do Mundo por seleção (até 2022 inclusive).
// Edite manualmente se necessário.

export interface SelecaoStats {
  participacoes: number; // nº de participações em Copas do Mundo (até 2022)
  titulos: number;       // nº de títulos conquistados
}

export const selecaoStats: Record<string, SelecaoStats> = {
  // Grupo A
  mex: { participacoes: 17, titulos: 0 },
  rsa: { participacoes: 3, titulos: 0 },
  kor: { participacoes: 11, titulos: 0 },
  cze: { participacoes: 9, titulos: 0 }, // inclui Tchecoslováquia
  // Grupo B
  can: { participacoes: 2, titulos: 0 },
  bih: { participacoes: 1, titulos: 0 },
  qat: { participacoes: 1, titulos: 0 },
  sui: { participacoes: 12, titulos: 0 },
  // Grupo C
  bra: { participacoes: 22, titulos: 5 },
  mar: { participacoes: 6, titulos: 0 },
  hai: { participacoes: 1, titulos: 0 },
  sco: { participacoes: 8, titulos: 0 },
  // Grupo D
  usa: { participacoes: 11, titulos: 0 },
  par: { participacoes: 8, titulos: 0 },
  aus: { participacoes: 6, titulos: 0 },
  tur: { participacoes: 2, titulos: 0 },
  // Grupo E
  ger: { participacoes: 20, titulos: 4 },
  cur: { participacoes: 0, titulos: 0 },
  civ: { participacoes: 3, titulos: 0 },
  ecu: { participacoes: 4, titulos: 0 },
  // Grupo F
  ned: { participacoes: 11, titulos: 0 },
  jpn: { participacoes: 7, titulos: 0 },
  swe: { participacoes: 12, titulos: 0 },
  tun: { participacoes: 6, titulos: 0 },
  // Grupo G
  bel: { participacoes: 14, titulos: 0 },
  egy: { participacoes: 3, titulos: 0 },
  irn: { participacoes: 6, titulos: 0 },
  nzl: { participacoes: 2, titulos: 0 },
  // Grupo H
  esp: { participacoes: 16, titulos: 1 },
  cpv: { participacoes: 0, titulos: 0 },
  ksa: { participacoes: 6, titulos: 0 },
  uru: { participacoes: 14, titulos: 2 },
  // Grupo I
  fra: { participacoes: 16, titulos: 2 },
  sen: { participacoes: 3, titulos: 0 },
  irq: { participacoes: 1, titulos: 0 },
  nor: { participacoes: 3, titulos: 0 },
  // Grupo J
  aut: { participacoes: 7, titulos: 0 },
  jor: { participacoes: 0, titulos: 0 },
  arg: { participacoes: 18, titulos: 3 },
  alg: { participacoes: 4, titulos: 0 },
  // Grupo K
  por: { participacoes: 8, titulos: 0 },
  cod: { participacoes: 2, titulos: 0 }, // como Zaire
  uzb: { participacoes: 0, titulos: 0 },
  col: { participacoes: 6, titulos: 0 },
  // Grupo L
  eng: { participacoes: 16, titulos: 1 },
  cro: { participacoes: 6, titulos: 0 },
  gha: { participacoes: 4, titulos: 0 },
  pan: { participacoes: 1, titulos: 0 },
};

export function getStats(id: string): SelecaoStats {
  return selecaoStats[id] ?? { participacoes: 0, titulos: 0 };
}
