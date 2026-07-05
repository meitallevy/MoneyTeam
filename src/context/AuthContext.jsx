import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadMember(userId) {
    if (!userId) { setMember(null); return }
    const { data } = await supabase.from('members').select('*').eq('id', userId).maybeSingle()
    setMember(data || null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await loadMember(data.session?.user?.id)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s)
      await loadMember(s?.user?.id)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const role = member?.role || null
  const value = {
    session,
    member,
    loading,
    role,
    isMentor: role === 'mentor',
    canEdit: role === 'mentor' || role === 'editor',
    signOut: () => supabase.auth.signOut(),
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
