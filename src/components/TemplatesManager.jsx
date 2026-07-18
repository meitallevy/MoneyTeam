import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useI18n } from '../lib/i18n'
import { useToast } from '../lib/toast'
import Modal from './Modal'

// Mentor-managed shopping templates: a name + a list of required/optional fields.
export default function TemplatesManager({ canWrite }) {
  const { t } = useI18n()
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)

  async function load() {
    const { data } = await supabase.from('shopping_templates').select('*').order('name')
    setRows(data || [])
  }
  useEffect(() => { load() }, [])

  async function del(row) {
    if (!confirm(t('confirmDelete'))) return
    await supabase.from('shopping_templates').delete().eq('id', row.id)
    toast.success(t('deleted')); load()
  }

  return (
    <div>
      <p style={{ color: 'var(--text-faint)', fontSize: 13, marginTop: 0 }}>{t('templatesHint')}</p>
      {canWrite && (
        <div className="toolbar"><div className="spacer" />
          <button className="btn btn-primary" onClick={() => { setEditing(null); setOpen(true) }}>+ {t('add')}</button>
        </div>
      )}
      <div className="panel table-wrap">
        <table className="data">
          <thead><tr><th>{t('name')}</th><th>{t('fields')}</th>{canWrite && <th>{t('actions')}</th>}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td style={{ color: 'var(--text-dim)' }}>{(r.fields || []).map((f) => f.label + (f.required ? ' *' : '')).join(', ') || '—'}</td>
                {canWrite && (
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(r); setOpen(true) }}>{t('edit')}</button>
                    <button className="btn btn-ghost btn-sm btn-danger" onClick={() => del(r)}>{t('delete')}</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="empty">{t('noRows')}</div>}
      </div>
      {open && <TemplateForm editing={editing} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); toast.success(t('saved')); load() }} />}
    </div>
  )
}

function TemplateForm({ editing, onClose, onSaved }) {
  const { t } = useI18n()
  const [name, setName] = useState(editing?.name || '')
  const [fields, setFields] = useState(() => editing?.fields?.length ? editing.fields : [{ label: '', required: true }])
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const setField = (i, k, v) => setFields(fields.map((f, idx) => idx === i ? { ...f, [k]: v } : f))
  const addField = () => setFields([...fields, { label: '', required: false }])
  const removeField = (i) => setFields(fields.length > 1 ? fields.filter((_, idx) => idx !== i) : fields)

  async function save() {
    if (!name.trim()) { setErr(t('requiredField') + ': ' + t('name')); return }
    const clean = fields.filter((f) => f.label.trim()).map((f) => ({ label: f.label.trim(), required: !!f.required }))
    if (!clean.length) { setErr(t('needOneField')); return }
    setErr(''); setBusy(true)
    const payload = { name: name.trim(), fields: clean }
    const res = editing
      ? await supabase.from('shopping_templates').update(payload).eq('id', editing.id)
      : await supabase.from('shopping_templates').insert(payload)
    setBusy(false)
    if (res.error) { setErr(res.error.message); return }
    onSaved()
  }

  return (
    <Modal
      title={editing ? t('edit') : t('add')} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? '…' : t('save')}</button>
      </>}
    >
      <div className="field"><label>{t('name')} *</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="למשל: ברגים" /></div>
      <div className="field">
        <label>{t('fields')}</label>
        {fields.map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
            <input value={f.label} onChange={(e) => setField(i, 'label', e.target.value)} placeholder={t('fieldLabel')} style={{ flex: 1 }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, margin: 0, whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={!!f.required} onChange={(e) => setField(i, 'required', e.target.checked)} style={{ width: 'auto' }} />
              {t('required')}
            </label>
            <button className="btn btn-ghost btn-sm btn-danger" onClick={() => removeField(i)}>✕</button>
          </div>
        ))}
        <button className="btn btn-sm" onClick={addField}>+ {t('addField')}</button>
      </div>
      {err && <div className="err">{err}</div>}
    </Modal>
  )
}
