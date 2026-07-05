import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'

const nameMap = (rows) => Object.fromEntries((rows || []).map((r) => [r.id, r.name]))

export function useLookups() {
  const [accounts, setAccounts] = useState([])
  const [categories, setCategories] = useState([])
  const [sources, setSources] = useState([])
  const [levels, setLevels] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [a, c, s, p] = await Promise.all([
      supabase.from('accounts').select('*').order('name'),
      supabase.from('categories').select('*').order('name'),
      supabase.from('income_sources').select('*').order('name'),
      supabase.from('priority_levels').select('*').order('rank'),
    ])
    setAccounts(a.data || [])
    setCategories(c.data || [])
    setSources(s.data || [])
    setLevels(p.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return {
    accounts, categories, sources, levels, loading, reload: load,
    accountName: nameMap(accounts),
    categoryName: nameMap(categories),
    sourceName: nameMap(sources),
    levelName: nameMap(levels),
  }
}
