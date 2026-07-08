import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useSeason } from '../context/SeasonContext'
import { useI18n } from '../lib/i18n'
import { useToast } from '../lib/toast'
import { useLookups } from '../lib/useLookups'
import { money } from '../lib/format'
import ShoppingForm from '../components/ShoppingForm'
import TransactionForm from '../components/TransactionForm'

const STATUSES = ['wish', 'approved', 'ordered', 'received', 'cancelled']

export default function Shopping() {
  const { t } = useI18n()
  const { canEdit } = useAuth()
  const { activeId } = useSeason()
  const toast = useToast()
  const lk = useLookups()
  const [rows, setRows] = useState([])
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [buying, setBuying] = useState(null)
  const [fStatus, setFStatus] = useState('')
  const [fPriority, setFPriority] = useState('')

  const rankOf = useMemo(() => Object.fromEntries(lk.levels.map((l) => [l.id, l.rank])), [lk.levels])

  async function load() {
    if (!activeId) return
    const { data } = await supabase.from('shopping_items').select('*').eq('season_id', activeId)
    setRows(data || [])
  }
  useEffect(() => { load() }, [activeId])

  const filtered = useMemo(() => rows
    .filter((r) => (!fStatus || r.status === fStatus) && (!fPriority || r.priority_level_id === fPriority))
    .sort((a, b) => (rankOf[a.priority_level_id] ?? 999) - (rankOf[b.priority_level_id] ?? 999)),
    [rows, fStatus, fPriority, rankOf])

  async function del(id) {
    if (!confirm(t('confirmDelete'))) return
    await supabase.from('shopping_items').delete().eq('id', id)
    toast.success(t('deleted')); load()
  }

  async function onBought(tx) {
    setShowForm(false)
    if (buying && tx?.id) {
      await supabase.from('shopping_items').update({ transaction_id: tx.id, status: 'received' }).eq('id', buying.id)
    }
    setBuying(null)
    toast.success(t('saved'))
    load()
  }

  const buyPrefill = buying ? {
    type: 'expense',
    amount: buying.est_price ? Number(buying.est_price) * (buying.quantity || 1) : '',
    account_id: buying.planned_account_id || '',
    vendor: buying.vendor || '',
    description: buying.name,
  } : null

  return (
    <div>
      <div className="toolbar">
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">{t('status')}: {t('all')}</option>
          {STATUSES.map((s) => <option key={s} value={s}>{t(s)}</option>)}
        </select>
        <select value={fPriority} onChange={(e) => setFPriority(e.target.value)}>
          <option value="">{t('priority')}: {t('all')}</option>
          {lk.levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <div className="spacer" />
        {canEdit && <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>+ {t('add')}</button>}
      </div>

      {filtered.length ? (
        <div className="panel table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t('priority')}</th>
                <th>{t('name')}</th>
                <th>{t('sku')}</th>
                <th>{t('estPrice')}</th>
                <th>{t('quantity')}</th>
                <th>{t('status')}</th>
                <th>{t('plannedAccount')}</th>
                <th>{t('url')}</th>
                {canEdit && <th>{t('actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const lvl = lk.levels.find((l) => l.id === r.priority_level_id)
                const canBuy = canEdit && !r.transaction_id && r.status !== 'cancelled'
                return (
                  <tr key={r.id}>
                    <td>{lvl ? <span className="pill" style={{ background: (lvl.color || '#8a8aa0') + '22', color: lvl.color || '#c2c2d4' }}>{lvl.name}</span> : '—'}</td>
                    <td>{r.name}{r.description && <div style={{ color: 'var(--text-faint)', fontSize: 12 }}>{r.description}</div>}</td>
                    <td className="mono" style={{ color: 'var(--text-dim)' }}>{r.sku || '—'}</td>
                    <td className="num">{r.est_price != null ? money(r.est_price) : '—'}</td>
                    <td className="num">{r.quantity}</td>
                    <td>
                      <span className="badge">{t(r.status)}</span>
                      {r.transaction_id && <span className="pill pill-out" style={{ marginInlineStart: 6 }}>{t('linked')}</span>}
                    </td>
                    <td>{lk.accountName[r.planned_account_id] || '—'}</td>
                    <td>{r.url ? <a href={r.url} target="_blank" rel="noreferrer">{t('openLink')} ↗</a> : '—'}</td>
                    {canEdit && (
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {canBuy && <button className="btn btn-sm" onClick={() => { setBuying(r); setShowForm(true) }}>{t('buy')}</button>}
                        <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(r); setShowForm(true) }}>{t('edit')}</button>
                        <button className="btn btn-ghost btn-sm btn-danger" onClick={() => del(r.id)}>{t('delete')}</button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="panel empty-cta">
          <p>{t('noItemsYet')}</p>
          {canEdit && <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>+ {t('addFirst')}</button>}
        </div>
      )}

      {showForm && buying && (
        <TransactionForm
          initial={buyPrefill}
          seasonId={activeId}
          accounts={lk.accountsActive}
          categories={lk.categories}
          sources={lk.sourcesActive}
          onClose={() => { setShowForm(false); setBuying(null) }}
          onSaved={onBought}
        />
      )}
      {showForm && !buying && (
        <ShoppingForm
          editing={editing}
          seasonId={activeId}
          levels={lk.levels}
          accounts={lk.accountsActive}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); toast.success(t('saved')); load() }}
        />
      )}
    </div>
  )
}
