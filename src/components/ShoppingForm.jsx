import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useI18n } from '../lib/i18n'
import { useAuth } from '../context/AuthContext'
import Modal from './Modal'

const STATUSES = ['pending_approval', 'approved', 'ordered', 'received', 'cancelled']

export default function ShoppingForm({ editing, seasonId, categoryTree, vendorsActive, levels, onClose, onSaved }) {
  const { t } = useI18n()
  const { isMentor } = useAuth()

  const knownVendor = editing?.vendor && vendorsActive.some((v) => v.name === editing.vendor)
  const [vendorMode, setVendorMode] = useState(() => (editing?.vendor && !knownVendor ? 'other' : 'list'))

  const [f, setF] = useState(() => ({
    name: editing?.name || '',
    url: editing?.url || '',
    sku: editing?.sku || '',
    category_id: editing?.category_id || '',
    vendor: editing?.vendor || '',
    est_price: editing?.est_price || '',
    quantity: editing?.quantity || 1,
    priority_level_id: editing?.priority_level_id || '',
    status: editing?.status || 'pending_approval',
    notes: editing?.notes || '',
  }))
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function save() {
    if (!f.name.trim()) { setErr(t('requiredField') + ': ' + t('name')); return }
    if (!f.sku.trim()) { setErr(t('requiredField') + ': ' + t('sku')); return }
    if (!f.category_id) { setErr(t('requiredField') + ': ' + t('category')); return }
    setErr(''); setBusy(true)
    const payload = {
      season_id: seasonId,
      name: f.name.trim(),
      url: f.url || null,
      sku: f.sku.trim(),
      category_id: f.category_id,
      vendor: f.vendor || null,
      est_price: f.est_price === '' ? null : Number(f.est_price),
      quantity: Number(f.quantity) || 1,
      priority_level_id: f.priority_level_id || null,
      notes: f.notes || null,
    }
    // Only mentors set status; students always create as pending_approval.
    // (The DB trigger also blocks non-mentors from changing status.)
    if (isMentor) payload.status = f.status
    else if (!editing) payload.status = 'pending_approval'

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
      <div className="field"><label>{t('name')} *</label><input value={f.name} onChange={set('name')} /></div>
      <div className="field"><label>{t('url')}</label><input value={f.url} onChange={set('url')} placeholder="https://" /></div>
      <div className="grid-2">
        <div className="field"><label>{t('sku')} (מק״ט) *</label><input value={f.sku} onChange={set('sku')} /></div>
        <div className="field">
          <label>{t('category')} *</label>
          <select value={f.category_id} onChange={set('category_id')}>
            <option value="">—</option>
            {categoryTree.map((c) => (
              <option key={c.id} value={c.id}>{'\u00A0\u00A0'.repeat(c.depth) + c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label>{t('vendor')}</label>
        {vendorMode === 'other' ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={f.vendor} onChange={set('vendor')} placeholder={t('vendor')} />
            <button className="btn btn-sm" onClick={() => { setVendorMode('list'); setF({ ...f, vendor: '' }) }}>↩</button>
          </div>
        ) : (
          <select value={f.vendor} onChange={(e) => {
            if (e.target.value === '__other__') { setVendorMode('other'); setF({ ...f, vendor: '' }) }
            else setF({ ...f, vendor: e.target.value })
          }}>
            <option value="">—</option>
            {vendorsActive.map((v) => <option key={v.id} value={v.name}>{v.name}</option>)}
            <option value="__other__">{t('vendorOther')}</option>
          </select>
        )}
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
        {isMentor && (
          <div className="field">
            <label>{t('status')}</label>
            <select value={f.status} onChange={set('status')}>
              {STATUSES.map((s) => <option key={s} value={s}>{t(s)}</option>)}
            </select>
          </div>
        )}
      </div>
      <div className="field"><label>{t('notes')}</label><textarea rows="2" value={f.notes} onChange={set('notes')} /></div>
      {err && <div className="err">{err}</div>}
    </Modal>
  )
}
