import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useI18n } from '../lib/i18n'
import Modal from './Modal'
import { TX_TYPES } from '../lib/format'

export default function TransactionForm({ editing, initial, seasonId, accounts, categories, sources, onClose, onSaved }) {
  const { t } = useI18n()
  const seed = editing || initial || {}
  const [f, setF] = useState(() => ({
    type: seed.type || 'expense',
    date: seed.date || new Date().toISOString().slice(0, 10),
    amount: seed.amount || '',
    account_id: seed.account_id || '',
    to_account_id: seed.to_account_id || '',
    income_source_id: seed.income_source_id || '',
    category_id: seed.category_id || '',
    vendor: seed.vendor || '',
    description: seed.description || '',
    receipt_number: seed.receipt_number || '',
    receipt_url: seed.receipt_url || '',
    notes: seed.notes || '',
  }))
  const [file, setFile] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const showAmount = f.type !== 'in_kind'
  const showAccount = f.type !== 'in_kind'
  const showTo = f.type === 'transfer'
  const showSource = f.type === 'income' || f.type === 'in_kind'
  const showCategory = f.type === 'expense' || f.type === 'in_kind'
  const showReceipt = f.type === 'expense'

  function validate() {
    if (showAmount && !(Number(f.amount) > 0)) return t('requiredField') + ': ' + t('amount')
    if (showAccount && !f.account_id) return t('requiredField') + ': ' + (showTo ? t('fromAccount') : t('account'))
    if (showTo && !f.to_account_id) return t('requiredField') + ': ' + t('toAccount')
    if (showTo && f.account_id === f.to_account_id) return t('fromAccount') + ' ≠ ' + t('toAccount')
    if (showSource && !f.income_source_id) return t('requiredField') + ': ' + t('source')
    if (f.type === 'in_kind' && !f.category_id) return t('requiredField') + ': ' + t('category')
    return ''
  }

  async function save() {
    const v = validate()
    if (v) { setErr(v); return }
    setErr(''); setBusy(true)
    try {
      let receipt_url = f.receipt_url
      if (file) {
        const path = `${seasonId}/${crypto.randomUUID()}-${file.name}`
        const up = await supabase.storage.from('receipts').upload(path, file)
        if (up.error) throw up.error
        receipt_url = up.data.path
      }
      // Shape payload to the DB constraint: null everything the type doesn't use.
      const payload = {
        season_id: seasonId,
        type: f.type,
        date: f.date,
        amount: showAmount ? Number(f.amount) : 1,
        account_id: showAccount ? f.account_id : null,
        to_account_id: showTo ? f.to_account_id : null,
        income_source_id: showSource ? f.income_source_id : null,
        category_id: showCategory ? (f.category_id || null) : null,
        vendor: f.type === 'expense' ? f.vendor || null : null,
        description: f.description || null,
        receipt_url: showReceipt ? receipt_url || null : null,
        receipt_number: showReceipt ? f.receipt_number || null : null,
        notes: f.notes || null,
      }
      const res = editing
        ? await supabase.from('transactions').update(payload).eq('id', editing.id).select().single()
        : await supabase.from('transactions').insert(payload).select().single()
      if (res.error) throw res.error
      onSaved(res.data)
    } catch (e) {
      setErr(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={editing ? t('editTransaction') : t('addTransaction')}
      onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? '…' : t('save')}</button>
      </>}
    >
      <div className="field">
        <label>{t('type')}</label>
        <div className="tabs" style={{ marginBottom: 0 }}>
          {TX_TYPES.map((ty) => (
            <button key={ty} className={'tab' + (f.type === ty ? ' active' : '')} onClick={() => setF({ ...f, type: ty })}>{t(ty)}</button>
          ))}
        </div>
      </div>

      <div className="grid-2">
        <div className="field"><label>{t('date')}</label><input type="date" value={f.date} onChange={set('date')} /></div>
        {showAmount && <div className="field"><label>{t('amount')} (₪)</label><input type="number" step="0.01" min="0" value={f.amount} onChange={set('amount')} /></div>}
      </div>

      {showAccount && (
        <div className="field">
          <label>{showTo ? t('fromAccount') : t('account')}</label>
          <select value={f.account_id} onChange={set('account_id')}>
            <option value="">—</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      )}
      {showTo && (
        <div className="field">
          <label>{t('toAccount')}</label>
          <select value={f.to_account_id} onChange={set('to_account_id')}>
            <option value="">—</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      )}
      {showSource && (
        <div className="field">
          <label>{t('source')}</label>
          <select value={f.income_source_id} onChange={set('income_source_id')}>
            <option value="">—</option>
            {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}
      {showCategory && (
        <div className="field">
          <label>{t('category')}</label>
          <select value={f.category_id} onChange={set('category_id')}>
            <option value="">—</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}
      {f.type === 'expense' && (
        <div className="field"><label>{t('vendor')}</label><input value={f.vendor} onChange={set('vendor')} /></div>
      )}
      <div className="field"><label>{t('description')}</label><input value={f.description} onChange={set('description')} /></div>

      {showReceipt && (
        <div className="grid-2">
          <div className="field"><label>{t('receiptNumber')}</label><input value={f.receipt_number} onChange={set('receipt_number')} /></div>
          <div className="field"><label>{t('receipt')} (קבלה)</label><input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
        </div>
      )}
      <div className="field"><label>{t('notes')}</label><textarea rows="2" value={f.notes} onChange={set('notes')} /></div>

      {err && <div className="err">{err}</div>}
    </Modal>
  )
}
