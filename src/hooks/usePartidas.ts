import { useEffect, useMemo } from 'react'
import { usePartidasStore, type Partida } from '@/store/partidasStore'
import { getCanonicalTeamName, getTeamAliases } from '@/lib/teamNames'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export function usePartidas() {
  const { partidas, loading, start } = usePartidasStore()
  useEffect(() => {
    start()
    // NÃO chama stop() — o store é singleton global
  }, [start])
  return { partidas, loading }
}

// ---------- ResultadosPorJogo (substitui useResultadosPorJogo e useCalendarioResultados) ----------

export type PartidaResultado = Partida & { id: string; inicia_em: string | null }

export function usePartidasResultados() {
  const { partidas, loading } = usePartidas()
  return { partidas: partidas as PartidaResultado[], loading }
}

// ---------- Jogos de Hoje / Ao Vivo (substitui useJogosHoje) ----------

const LIVE_STATUSES = ['LIVE', 'HT', 'ET', 'PEN_LIVE', '1H', '2H', 'BT', 'P']

export function useJogosHojeStore() {
  const { partidas } = usePartidas()

  return useMemo(() => {
    const aoVivo = partidas.filter((p) => LIVE_STATUSES.includes(p.status))
    const idsAoVivo = new Set(aoVivo.map((p) => p.id))

    const brasiliaHoje = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const inicioHoje = new Date(brasiliaHoje + 'T03:00:00.000Z').getTime()
    const fimHoje = inicioHoje + 24 * 60 * 60 * 1000

    const hoje = partidas.filter((p) => {
      if (!p.inicia_em) return false
      const t = new Date(p.inicia_em).getTime()
      return t >= inicioHoje && t < fimHoje
    })

    if (hoje.length > 0) {
      return { jogosAoVivo: aoVivo, jogosHoje: hoje, tituloSecao: 'Jogos de Hoje' }
    }

    const now = Date.now()
    const proximos = partidas
      .filter((p) => p.status === 'NS' && p.inicia_em && new Date(p.inicia_em).getTime() >= now && !idsAoVivo.has(p.id))
      .slice(0, 3)

    return { jogosAoVivo: aoVivo, jogosHoje: proximos, tituloSecao: 'Próximos Jogos' }
  }, [partidas])
}

// ---------- Classificação por Grupo (substitui useClassificacaoGrupos) ----------

export function usePartidasGrupo() {
  const { partidas } = usePartidas()
  return useMemo(
    () =>
      partidas
        .filter((p) => p.grupo != null)
        .map((p) => ({
          ...p,
          time_a: getCanonicalTeamName(p.time_a) || p.time_a,
          time_b: getCanonicalTeamName(p.time_b) || p.time_b,
          grupo: p.grupo!.replace(/^GROUP_/i, ''),
        })),
    [partidas]
  )
}

// ---------- Seleções (React Query — busca 1x por sessão) ----------

export type SelecaoDb = { nome: string; area_bandeira: string | null; escudo_url: string | null }

export function useSelecoes() {
  return useQuery({
    queryKey: ['selecoes'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('selecoes')
        .select('nome,area_bandeira,escudo_url')
      return (data ?? []) as SelecaoDb[]
    },
    staleTime: Infinity,
  })
}

export function useSelecoesFlagMap() {
  const { data: selData = [] } = useSelecoes()
  return useMemo(() => {
    const map: Record<string, string> = {}
    selData.forEach((s) => {
      const image = s.area_bandeira ?? s.escudo_url ?? ''
      getTeamAliases(s.nome).forEach((alias) => { map[alias] = image })
    })
    return map
  }, [selData])
}
