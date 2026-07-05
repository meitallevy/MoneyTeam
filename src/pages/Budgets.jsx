import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useSeason } from '../context/SeasonContext'
import { useI18n } from '../lib/i18n'
import { useToast } from '../lib/toast'
import { useLookups } from '../lib/useLookups'
import { money } from '../lib/format'
import Modal from '../components/Modal'

export default function Budgets() {
  const { t } = useI18n()
  const { isMentor } = useAuth()
  const { activeId } = useSeason()
  const toast = useToast()
  const lk = useLookups()
  const [budgets, setBudgets] = useState([])
  const [spentByCat, setSpentByCat] = useState({})
  const [spentTotal, setSpentTotal] = useState(0)
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)

  async function load() {
    if (!activeId) return
    const [b, tx] = await Promise.all([
      supabase.from('budgets').select('*').eq('season_id', activeId),
      supabase.from('transactions').select('amount,type,category_id').eq('season_id', activeId),
    ])
    setBudgets(b.data || [])
    const spend = {}
    let total = 0
    for (const r of tx.data || []) {
      if (r.type !== 'expense' && r.type !== 'in_kind') continue
      const amt = Number(r.amount)
      total += amt
      const k = r.category_id || '__none__'
      spend[k] = (spend[k] || 0) + amt
    }
    setSpentByCat(spend)
    setSpentTotal(total)
  }
  useEffect(() => { load() }, [activeId])

  const rows = useMemo(() => budgets.map((b) => {
    const isOverall = !b.category_id
    const spent = isOverall ? spentTotal : (spentByCat[b.category_id] || 0)
    return {
      ...b,
      label: isOverall ? t('overall') : (lk.categoryName[b.category_id] || t('uncategorized')),
      spent,
      remaining: Number(b.amount) - spent,
      pct: b.amount > 0 ? Math.min(999, (spent / Number(b.amount)) * 100) : 0,
    }
  }).sort((a, b) => (a.category_id ? 1 : 0) - (b.category_id ? 1 : 0) || b.amount - a.amount),
    [budgets, spentByCat, spentTotal, lk.categoryName, t])

  async function del(id) {
    if (!confirm(t('confirmDelete'))) return
    await supabase.from('budgets').delete().eq('id', id)
    toast.success(t('deleted')); load()
  }

  const barColor = (pct) => (pct > 100 ? 'var(--danger)' : pct >= 80 ? 'var(--orange)' : 'var(--ok)')

  return (
    <div>
      {isMentor && (
        <div className="toolbar">
          <div className="spacer" />
          <button className="btn btn-primary" onClick={() => { setEditing(null); setOpen(true) }}>+ {t('setBudget')}</button>
        </div>
      )}

      {rows.length ? (
        <div className="grid-2">
          {rows.map((r) => (
            <div key={r.id} className="panel panel-pad">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <h3 style={{ fontSize: 16 }}>{r.label}</h3>
                <span className="mono" style={{ color: 'var(--text-dim)', fontSize: 13 }}>{Math.round(r.pct)}%</span>
              </div>
              <div className="bar-track"><div className="bar-fill" style={{ width: Math.min(100, r.pct) + '%', background: barColor(r.pct) }} /></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 13 }}>
                <span><span style={{ color: 'var(--text-faint)' }}>{t('spent')} </span><b className="mono">{money(r.spent)}</b></span>
                <span><span style={{ color: 'var(--text-faint)' }}>{t('budget')} </span><b className="mono">{money(r.amount)}</b></span>
                <span style={{ color: r.remaining < 0 ? 'var(--danger)' : 'var(--ok)' }}>{t('remaining')} <b className="mono">{money(r.remaining)}</b></span>
              </div>
              {isMentor && (
                <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(r); setOpen(true) }}>{t('edit')}</button>
                  <button className="btn btn-ghost btn-sm btn-danger" onClick={() => del(r.id)}>{t('delete')}</button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="panel empty-cta">
          <p>{t('noBudgetsYet')}</p>
          {isMentor && <button className="btn btn-primary" onClick={() => { setEditing(null); setOpen(true) }}>+ {t('addFirst')}</button>}
        </div>
      )}

      {open && (
        <BudgetForm
          editing={editing} seasonId={activeId} categories={lk.categories} existing={budgets}
          onClose={() => setOpen(false)} onSaved={() => { setOpen(false); toast.success(t('saved')); load() }}
        />
      )}
    </div>
  )
}

function BudgetForm({ editing, seasonId, categories, existing, onClose, onSaved }) {
  const { t } = useI18n()
  const [categoryId, setCategoryId] = useState(editing?.category_id || '')
  const [amount, setAmount] = useState(editing?.amount || '')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  // Categories already budgeted (so we don't create duplicates, which the DB unique blocks anyway)
  const taken = new Set(existing.filter((b) => b.id !== editing?.id).map((b) => b.category_id || '__overall__'))

  async function save() {
    if (!(Number(amount) >= 0)) { setErr(t('requiredField') + ': ' + t('amount')); return }
    setErr(''); setBusy(true)
    const payload = { season_id: seasonId, category_id: categoryId || null, amount: Number(amount) }
    const res = editing
      ? await supabase.from('budgets').update(payload).eq('id', editing.id)
      : await supabase.from('budgets').insert(payload)
    setBusy(false)
    if (res.error) { setErr(res.error.message); return }
    onSaved()
  }

  return (
    <Modal
      title={t('setBudget')}
      onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? '…' : t('save')}</button>
      </>}
    >
      <div className="field">
        <label>{t('category')}</label>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={!!editing}>
          <option value="" disabled={taken.has('__overall__')}>{t('overall')}</option>
          {categories.map((c) => <option key={c.id} value={c.id} disabled={taken.has(c.id)}>{c.name}</option>)}
        </select>
      </div>
      <div className="field">
        <label>{t('budget')} (₪)</label>
        <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      {err && <div className="err">{err}</div>}
    </Modal>
  )
}
