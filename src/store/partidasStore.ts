import { create } from 'zustand'
import { supabase } from '@/integrations/supabase/client'

export type Partida = {
  id: string
  time_a: string
  time_b: string
  placar_a: number | null
  placar_b: number | null
  status: string
  inicia_em: string | null
  minuto?: number | null
  acrescimos?: number | null
  gols?: unknown[] | null
  grupo?: string | null
  fase?: string | null
}

const LIVE_STATUSES = new Set(['LIVE', 'HT', 'ET', 'PEN_LIVE', '1H', '2H', 'BT', 'P'])
const POLL_NORMAL_MS = 45_000
const POLL_LIVE_MS   = 15_000
const STALE_MS       = 20_000

const SELECT_COLS = 'id,time_a,time_b,placar_a,placar_b,status,inicia_em,minuto,acrescimos,gols,grupo,fase'

interface PartidasState {
  partidas: Partida[]
  loading: boolean
  lastFetch: number
  _timer: ReturnType<typeof setTimeout> | null
  _channel: ReturnType<typeof supabase.channel> | null
  start: () => Promise<void>
  stop: () => void
  _fetch: () => Promise<void>
  _schedule: () => void
  _startRealtime: () => void
  _stopRealtime: () => void
}

export const usePartidasStore = create<PartidasState>((set, get) => ({
  partidas: [],
  loading: false,
  lastFetch: 0,
  _timer: null,
  _channel: null,

  start: async () => {
    if (get()._timer !== null) return
    get()._startRealtime()   // Realtime ativo desde o início — não espera detectar jogo LIVE
    await get()._fetch()
    get()._schedule()
  },

  stop: () => {
    const { _timer } = get()
    if (_timer !== null) clearTimeout(_timer)
    get()._stopRealtime()
    set({ _timer: null })
  },

  _fetch: async () => {
    const now = Date.now()
    if (now - get().lastFetch < STALE_MS) return

    set({ loading: true })
    const { data } = await (supabase as any)
      .from('partidas')
      .select(SELECT_COLS)
      .order('inicia_em', { ascending: true })

    const partidas = (data ?? []) as Partida[]
    set({ partidas, loading: false, lastFetch: Date.now() })

  },

  _schedule: () => {
    const hasLive = get().partidas.some((p) => LIVE_STATUSES.has(p.status))
    const delay = hasLive ? POLL_LIVE_MS : POLL_NORMAL_MS

    const id = setTimeout(async () => {
      await get()._fetch()
      get()._schedule()
    }, delay)

    set({ _timer: id })
  },

  _startRealtime: () => {
    if (get()._channel) return

    const channel = supabase
      .channel('partidas-global')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'partidas' }, (payload) => {
        set((state) => ({
          partidas: state.partidas.map((p) =>
            p.id === (payload.new as Partida).id ? { ...p, ...(payload.new as Partida) } : p
          ),
        }))
      })
      .subscribe()

    set({ _channel: channel })
  },

  _stopRealtime: () => {
    const { _channel } = get()
    if (_channel) {
      supabase.removeChannel(_channel)
      set({ _channel: null })
    }
  },
}))
