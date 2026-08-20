import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export type AuthState = 'local' | 'loading' | 'signed-out' | 'signed-in'

/**
 * Supabase 세션.
 * 환경변수가 없으면 로컬 저장소 모드라 로그인 자체가 없다 ('local').
 */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [state, setState] = useState<AuthState>(supabase ? 'loading' : 'local')

  useEffect(() => {
    if (!supabase) return

    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      setSession(data.session)
      setState(data.session ? 'signed-in' : 'signed-out')
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setState(next ? 'signed-in' : 'signed-out')
    })

    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut()
  }, [])

  return { session, state, signOut, email: session?.user.email ?? null }
}
