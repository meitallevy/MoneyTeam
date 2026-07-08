import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const SeasonContext = createContext(null)

export function SeasonProvider({ children }) {
  const { session } = useAuth()
  const [seasons, setSeasons] = useState([])
  const [activeId, setActiveId] = useState(() => localStorage.getItem('activeSeason') || null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const { data } = await supabase.from('seasons').select('*').order('start_date', { ascending: false, nullsFirst: false })
    const list = data || []
    setSeasons(list)
    setActiveId((cur) => {
      if (cur && list.some((s) => s.id === cur)) return cur
      const def = list.find((s) => s.is_active) || list[0]
      return def?.id || null
    })
    setLoading(false)
  }, [])

  // Wait for an authenticated session before loading seasons. RLS returns zero
  // rows to an unauthenticated request, which used to show "no season" on first
  // load until something (like editing a season) re-fired the query post-login.
  // Re-runs whenever the logged-in user changes, so login immediately populates.
  useEffect(() => {
    if (session?.user?.id) {
      refresh()
    } else {
      setSeasons([])
      setLoading(false)
    }
  }, [session?.user?.id, refresh])

  useEffect(() => { if (activeId) localStorage.setItem('activeSeason', activeId) }, [activeId])

  const active = seasons.find((s) => s.id === activeId) || null
  return (
    <SeasonContext.Provider value={{ seasons, active, activeId, setActiveId, refresh, loading }}>
      {children}
    </SeasonContext.Provider>
  )
}

export const useSeason = () => useContext(SeasonContext)
