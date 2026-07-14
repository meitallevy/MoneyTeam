import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'
import { useAuth } from '../context/AuthContext'

const nameMap = (rows) => Object.fromEntries((rows || []).map((r) => [r.id, r.name]))
const isActive = (r) => r.is_active !== false

// Build a display order for hierarchical categories: each parent followed by its
// children, with a `depth` for indentation and a `path` label ("robot › sensors").
function buildTree(cats) {
  const byParent = {}
  for (const c of cats) {
    const k = c.parent_id || '__root__'
    ;(byParent[k] = byParent[k] || []).push(c)
  }
  const out = []
  const walk = (parentKey, depth, prefix) => {
    for (const c of (byParent[parentKey] || []).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = prefix ? `${prefix} › ${c.name}` : c.name
      out.push({ ...c, depth, path })
      walk(c.id, depth + 1, path)
    }
  }
  walk('__root__', 0, '')
  return out
}

// descendants (inclusive) of a category id — used for budget roll-up
function descendantsOf(cats, id) {
  const kids = {}
  for (const c of cats) if (c.parent_id) (kids[c.parent_id] = kids[c.parent_id] || []).push(c.id)
  const acc = new Set([id])
  const stack = [id]
  while (stack.length) {
    const cur = stack.pop()
    for (const k of kids[cur] || []) if (!acc.has(k)) { acc.add(k); stack.push(k) }
  }
  return acc
}

export function useLookups() {
  const { session } = useAuth()
  const [accounts, setAccounts] = useState([])
  const [categories, setCategories] = useState([])
  const [sources, setSources] = useState([])
  const [levels, setLevels] = useState([])
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [a, c, s, p, v] = await Promise.all([
      supabase.from('accounts').select('*').order('name'),
      supabase.from('categories').select('*').order('name'),
      supabase.from('income_sources').select('*').order('name'),
      supabase.from('priority_levels').select('*').order('rank'),
      supabase.from('vendors').select('*').order('name'),
    ])
    setAccounts(a.data || [])
    setCategories(c.data || [])
    setSources(s.data || [])
    setLevels(p.data || [])
    setVendors(v.data || [])
    setLoading(false)
  }, [])

  // Wait for auth before querying — otherwise RLS returns empty and the screen
  // looks "stuck"/blank. Re-run when the logged-in user changes.
  useEffect(() => {
    if (session?.user?.id) load()
    else setLoading(false)
  }, [session?.user?.id, load])

  return {
    accounts, categories, sources, levels, vendors, loading, reload: load,
    accountsActive: accounts.filter(isActive),
    sourcesActive: sources.filter(isActive),
    vendorsActive: vendors.filter(isActive),
    categoryTree: buildTree(categories),
    descendantsOf: (id) => descendantsOf(categories, id),
    accountName: nameMap(accounts),
    categoryName: nameMap(categories),
    sourceName: nameMap(sources),
    levelName: nameMap(levels),
  }
}
