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
    let done = false
    // Safety net: whatever happens, never leave the app stuck on "…" for more
    // than 8s. If the session check stalls, fall through to the login screen.
    const failsafe = setTimeout(() => { if (!done) setLoading(false) }, 8000)

    supabase.auth.getSession()
      .then(async ({ data }) => {
        setSession(data.session)
        await loadMember(data.session?.user?.id)
      })
      .catch((e) => console.error('getSession failed', e))
      .finally(() => { done = true; clearTimeout(failsafe); setLoading(false) })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s)
      await loadMember(s?.user?.id)
    })
    return () => { clearTimeout(failsafe); sub.subscription.unsubscribe() }
  }, [])

  const role = member?.role || null
  const isMentor = role === 'mentor'
  const isStudent = role === 'student'
  const value = {
    session,
    member,
    loading,
    role,
    isMentor,
    isStudent,
    // permission gates (mentor / student / viewer model)
    canTransact: isMentor,                       // income / expense / transfer / buy / delete tx
    canBudget: isMentor || isStudent,            // add & edit budgets
    canAddShopping: isMentor || isStudent,       // add & edit shopping items
    canChangeStatus: isMentor,                   // change a shopping item's status
    canSettings: isMentor,                       // manage config tables
    canEdit: isMentor,                           // legacy alias -> mentor only
    signOut: () => supabase.auth.signOut(),
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
