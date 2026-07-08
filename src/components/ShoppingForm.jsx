import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useI18n } from '../lib/i18n'
import Modal from './Modal'

const STATUSES = ['wish', 'approved', 'ordered', 'received', 'cancelled']

export default function ShoppingForm({ editing, seasonId, levels, accounts, onClose, onSaved }) {
  const { t } = useI18n()
  const [f, setF] = useState(() => ({
    name: editing?.name || '',
    description: editing?.description || '',
    url: editing?.url || '',
    sku: editing?.sku || '',
    vendor: editing?.vendor || '',
    est_price: editing?.est_price || '',
    quantity: editing?.quantity || 1,
    priority_level_id: editing?.priority_level_id || '',
    status: editing?.status || 'wish',
    planned_account_id: editing?.planned_account_id || '',
    notes: editing?.notes || '',
  }))
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function save() {
    if (!f.name.trim()) { setErr(t('requiredField') + ': ' + t('name')); return }
    if (!f.sku.trim()) { setErr(t('requiredField') + ': ' + t('sku')); return }
    setErr(''); setBusy(true)
    const payload = {
      season_id: seasonId,
      name: f.name.trim(),
      description: f.description || null,
      url: f.url || null,
      sku: f.sku || null,
      vendor: f.vendor || null,
      est_price: f.est_price === '' ? null : Number(f.est_price),
      quantity: Number(f.quantity) || 1,
      priority_level_id: f.priority_level_id || null,
      status: f.status,
      planned_account_id: f.planned_account_id || null,
      notes: f.notes || null,
    }
    const res = editing
      ? await supabase.from('shopping_items').update(payload).eq('id', editing.id)
      : await supabase.from('shopping_items').insert(payload)
    setBusy(false)
    if (res.error) { setErr(res.error.message); return }
    onSaved()
  }

  return (
    <Modal
      title={editing ? t('editItem') : t('addItem')}
      onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? '…' : t('save')}</button>
      </>}
    >
      <div className="field"><label>{t('name')}</label><input value={f.name} onChange={set('name')} /></div>
      <div className="field"><label>{t('url')}</label><input value={f.url} onChange={set('url')} placeholder="https://" /></div>
      <div className="grid-2">
        <div className="field"><label>{t('sku')} (מק״ט) *</label><input value={f.sku} onChange={set('sku')} /></div>
        <div className="field"><label>{t('vendor')}</label><input value={f.vendor} onChange={set('vendor')} /></div>
      </div>
      <div className="grid-2">
        <div className="field"><label>{t('estPrice')} (₪)</label><input type="number" step="0.01" value={f.est_price} onChange={set('est_price')} /></div>
        <div className="field"><label>{t('quantity')}</label><input type="number" min="1" value={f.quantity} onChange={set('quantity')} /></div>
      </div>
      <div className="grid-2">
        <div className="field">
          <label>{t('priority')}</label>
          <select value={f.priority_level_id} onChange={set('priority_level_id')}>
            <option value="">—</option>
            {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>{t('status')}</label>
          <select value={f.status} onChange={set('status')}>
            {STATUSES.map((s) => <option key={s} value={s}>{t(s)}</option>)}
          </select>
        </div>
      </div>
      <div className="field">
        <label>{t('plannedAccount')}</label>
        <select value={f.planned_account_id} onChange={set('planned_account_id')}>
          <option value="">—</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <div className="field"><label>{t('notes')}</label><textarea rows="2" value={f.notes} onChange={set('notes')} /></div>
      {err && <div className="err">{err}</div>}
    </Modal>
  )
}
