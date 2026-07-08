import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useSeason } from '../context/SeasonContext'
import { useI18n } from '../lib/i18n'
import { useToast } from '../lib/toast'
import { useLookups } from '../lib/useLookups'
import { money, fmtDate, typePill, TX_TYPES } from '../lib/format'
import { exportTransactions } from '../lib/export'
import TransactionForm from '../components/TransactionForm'

export default function Transactions() {
  const { t } = useI18n()
  const { canEdit } = useAuth()
  const { activeId, active } = useSeason()
  const toast = useToast()
  const lk = useLookups()
  const [rows, setRows] = useState([])
  const [balances, setBalances] = useState([])
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const [q, setQ] = useState('')
  const [fType, setFType] = useState('')
  const [fAccount, setFAccount] = useState('')
  const [fCategory, setFCategory] = useState('')
  const [fSource, setFSource] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sort, setSort] = useState({ col: 'date', dir: 'desc' })

  async function load() {
    if (!activeId) return
    const { data } = await supabase.from('transactions').select('*').eq('season_id', activeId)
    setRows(data || [])
    const b = await supabase.from('account_balances').select('*')
    setBalances(b.data || [])
  }
  useEffect(() => { load() }, [activeId])

  const enriched = useMemo(() => rows.map((r) => ({
    ...r,
    accountName: lk.accountName[r.account_id] || '',
    toAccountName: lk.accountName[r.to_account_id] || '',
    categoryName: lk.categoryName[r.category_id] || '',
    sourceName: lk.sourceName[r.income_source_id] || '',
  })), [rows, lk.accountName, lk.categoryName, lk.sourceName])

  const filtered = useMemo(() => {
    let out = enriched.filter((r) => {
      if (fType && r.type !== fType) return false
      if (fAccount && r.account_id !== fAccount && r.to_account_id !== fAccount) return false
      if (fCategory && r.category_id !== fCategory) return false
      if (fSource && r.income_source_id !== fSource) return false
      if (from && r.date < from) return false
      if (to && r.date > to) return false
      if (q) {
        const hay = `${r.description} ${r.vendor} ${r.accountName} ${r.categoryName} ${r.sourceName} ${r.receipt_number}`.toLowerCase()
        if (!hay.includes(q.toLowerCase())) return false
      }
      return true
    })
    const { col, dir } = sort
    out.sort((a, b) => {
      let av = a[col], bv = b[col]
      if (col === 'amount') { av = Number(av); bv = Number(bv) }
      if (av < bv) return dir === 'asc' ? -1 : 1
      if (av > bv) return dir === 'asc' ? 1 : -1
      return 0
    })
    return out
  }, [enriched, fType, fAccount, fCategory, fSource, from, to, q, sort])

  function toggleSort(col) {
    setSort((s) => (s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' }))
  }

  async function del(id) {
    if (!confirm(t('confirmDelete'))) return
    await supabase.from('transactions').delete().eq('id', id)
    toast.success(t('deleted')); load()
  }

  function doExport() {
    exportTransactions(filtered, {
      seasonName: active?.name,
      periodLabel: from || to ? `${from || '…'}_${to || '…'}` : active?.name,
      accounts: balances.map((b) => ({ name: b.name, balance: b.balance })),
    })
  }

  const th = (col, label) => (
    <th onClick={() => toggleSort(col)}>{label}{sort.col === col ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}</th>
  )

  return (
    <div>
      <div className="toolbar">
        <input className="grow" placeholder={t('search')} value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={fType} onChange={(e) => setFType(e.target.value)}>
          <option value="">{t('type')}: {t('all')}</option>
          {TX_TYPES.map((ty) => <option key={ty} value={ty}>{t(ty)}</option>)}
        </select>
        <select value={fAccount} onChange={(e) => setFAccount(e.target.value)}>
          <option value="">{t('account')}: {t('all')}</option>
          {lk.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={fCategory} onChange={(e) => setFCategory(e.target.value)}>
          <option value="">{t('category')}: {t('all')}</option>
          {lk.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={fSource} onChange={(e) => setFSource(e.target.value)}>
          <option value="">{t('source')}: {t('all')}</option>
          {lk.sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} title={t('date')} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} title={t('date')} />
        <div className="spacer" />
        <button className="btn" onClick={doExport}>{t('export')}</button>
        {canEdit && <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>+ {t('add')}</button>}
      </div>

      <div className="panel table-wrap">
        <table className="data">
          <thead>
            <tr>
              {th('date', t('date'))}
              {th('type', t('type'))}
              {th('amount', t('amount'))}
              <th>{t('account')}</th>
              <th>{t('category')} / {t('source')}</th>
              <th>{t('description')}</th>
              <th>{t('receipt')}</th>
              {canEdit && <th>{t('actions')}</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className="mono">{fmtDate(r.date)}</td>
                <td><span className={typePill[r.type]}>{t(r.type)}</span></td>
                <td className="num">{money(r.amount)}</td>
                <td>{r.type === 'transfer' ? `${r.accountName} → ${r.toAccountName}` : r.accountName || '—'}</td>
                <td>{r.categoryName || r.sourceName || '—'}</td>
                <td style={{ color: 'var(--text-dim)' }}>{r.description || r.vendor || '—'}</td>
                <td><Receipt path={r.receipt_url} number={r.receipt_number} /></td>
                {canEdit && (
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(r); setShowForm(true) }}>{t('edit')}</button>
                    <button className="btn btn-ghost btn-sm btn-danger" onClick={() => del(r.id)}>{t('delete')}</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <div className="empty">{t('noRows')}</div>}
      </div>

      {showForm && (
        <TransactionForm
          editing={editing}
          seasonId={activeId}
          accounts={lk.accountsActive}
          categories={lk.categories}
          sources={lk.sourcesActive}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); toast.success(t('saved')); load() }}
        />
      )}
    </div>
  )
}

function Receipt({ path, number }) {
  const [url, setUrl] = useState(null)
  async function open() {
    if (url) { window.open(url, '_blank'); return }
    const { data } = await supabase.storage.from('receipts').createSignedUrl(path, 60)
    if (data?.signedUrl) { setUrl(data.signedUrl); window.open(data.signedUrl, '_blank') }
  }
  if (!path) return <span style={{ color: 'var(--text-faint)' }}>{number || '—'}</span>
  return <button className="btn btn-ghost btn-sm" onClick={open}>קבלה ↗</button>
}
