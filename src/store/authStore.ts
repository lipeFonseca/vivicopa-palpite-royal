import { create } from 'zustand'
import { supabase } from '@/integrations/supabase/client'
import type { Session, User, Subscription } from '@supabase/supabase-js'

export type AuthProfile = {
  id: string
  username: string
  role: 'admin' | 'user'
}

let authStateSubscription: Subscription | null = null

interface AuthState {
  session: Session | null
  user: User | null
  profile: AuthProfile | null
  initialized: boolean
  loading: boolean
  init: () => Promise<void>
  setProfile: (profile: AuthProfile | null) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  initialized: false,
  loading: true,

  init: async () => {
    if (get().initialized) return

    const { data: { session } } = await supabase.auth.getSession()

    let profile: AuthProfile | null = null
    if (session?.user) {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, role')
        .eq('id', session.user.id)
        .maybeSingle()
      if (data) {
        profile = {
          id: data.id,
          username: (data as { id: string; username: string | null; role: string | null }).username ?? session.user.email?.split('@')[0] ?? 'usuario',
          role: (data as { id: string; username: string | null; role: string | null }).role === 'admin' ? 'admin' : 'user',
        }
      }
    }

    set({ session, user: session?.user ?? null, profile, initialized: true, loading: false })

    if (!authStateSubscription) {
      const { data } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (event === 'SIGNED_IN') {
          let p: AuthProfile | null = null
          if (newSession?.user) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('id, username, role')
              .eq('id', newSession.user.id)
              .maybeSingle()
            if (profileData) {
              p = {
                id: profileData.id,
                username: (profileData as { id: string; username: string | null; role: string | null }).username ?? newSession.user.email?.split('@')[0] ?? 'usuario',
                role: (profileData as { id: string; username: string | null; role: string | null }).role === 'admin' ? 'admin' : 'user',
              }
            }
          }
          set({ session: newSession, user: newSession?.user ?? null, profile: p, loading: false })
        }
        if (event === 'TOKEN_REFRESHED') {
          set({ session: newSession, user: newSession?.user ?? null })
        }
        if (event === 'SIGNED_OUT') {
          set({ session: null, user: null, profile: null, loading: false })
        }
      })
      authStateSubscription = data.subscription
    }
  },

  setProfile: (profile) => set({ profile }),

  clear: () => set({ session: null, user: null, profile: null, initialized: false, loading: false }),
}))
