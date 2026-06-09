export interface Palpite {
  id: string;
  usuario: string;
  jogoId: string;
  selecaoA: string;
  selecaoB: string;
  placarA: number;
  placarB: number;
  comentario?: string;
  dataCriacao: string;
}

const KEY = "vivicopa:palpites";

export function carregarPalpites(): Palpite[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Palpite[]) : [];
  } catch {
    return [];
  }
}

export function salvarPalpites(lista: Palpite[]) {
  localStorage.setItem(KEY, JSON.stringify(lista));
}

export function salvarPalpite(p: Palpite) {
  const lista = carregarPalpites();
  lista.push(p);
  salvarPalpites(lista);
}

export function atualizarPalpite(p: Palpite) {
  const lista = carregarPalpites().map((x) => (x.id === p.id ? p : x));
  salvarPalpites(lista);
}

export function excluirPalpite(id: string) {
  salvarPalpites(carregarPalpites().filter((x) => x.id !== id));
}
