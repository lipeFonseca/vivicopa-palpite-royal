import { create } from 'zustand'
import { supabase } from '@/integrations/supabase/client'

interface ConfigState {
  config: Record<string, string>
  loaded: boolean
  load: () => Promise<void>
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: {},
  loaded: false,

  load: async () => {
    if (get().loaded) return
    const { data } = await supabase.from('app_config' as never).select('chave, valor')
    if (!data) return
    const map: Record<string, string> = {}
    ;(data as { chave: string; valor: string | null }[]).forEach((r) => {
      map[r.chave] = r.valor ?? ''
    })
    set({ config: map, loaded: true })
  },
}))
