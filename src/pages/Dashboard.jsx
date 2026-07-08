import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { useSeason } from '../context/SeasonContext'
import { useI18n } from '../lib/i18n'
import { useLookups } from '../lib/useLookups'
import { money, monthKey, typeColor } from '../lib/format'

const axis = { fontSize: 12, fill: '#4c5570', fontFamily: 'Space Mono, monospace' }
const CATCOLORS = ['#ff9100', '#4d63ff', '#b06bff', '#35c26b', '#ff4d5e', '#ffc14d', '#7aa0ff', '#d98aff']

export default function Dashboard() {
  const { t } = useI18n()
  const { activeId, active } = useSeason()
  const { categoryName, sourceName } = useLookups()
  const [rows, setRows] = useState([])
  const [balances, setBalances] = useState([])

  useEffect(() => {
    if (!activeId) return
    supabase.from('transactions').select('*').eq('season_id', activeId)
      .then(({ data }) => setRows(data || []))
    supabase.from('account_balances').select('*').then(({ data }) => setBalances(data || []))
  }, [activeId])

  const totals = useMemo(() => {
    let income = 0, expense = 0, inkind = 0
    for (const r of rows) {
      if (r.type === 'income') income += Number(r.amount)
      else if (r.type === 'expense') expense += Number(r.amount)
      else if (r.type === 'in_kind') inkind += Number(r.amount)
    }
    return { income, expense, inkind, net: income - expense }
  }, [rows])

  const byMonth = useMemo(() => {
    const m = {}
    for (const r of rows) {
      if (r.type !== 'income' && r.type !== 'expense') continue
      const k = monthKey(r.date)
      m[k] = m[k] || { month: k, income: 0, expense: 0 }
      m[k][r.type] += Number(r.amount)
    }
    return Object.values(m).sort((a, b) => a.month.localeCompare(b.month))
  }, [rows])

  const byCategory = useMemo(() => group(rows.filter((r) => r.type === 'expense' || r.type === 'in_kind'), (r) => categoryName[r.category_id] || '—'), [rows, categoryName])
  const bySource = useMemo(() => group(rows.filter((r) => r.type === 'income' || r.type === 'in_kind'), (r) => sourceName[r.income_source_id] || '—'), [rows, sourceName])

  return (
    <div>
      <div className="stats">
        <Stat k={t('totalIncome')} v={money(totals.income)} c="var(--in)" />
        <Stat k={t('totalExpense')} v={money(totals.expense)} c="var(--out)" />
        <Stat k={t('net')} v={money(totals.net)} c={totals.net >= 0 ? 'var(--ok)' : 'var(--danger)'} />
        <Stat k={t('totalInKind')} v={money(totals.inkind)} c="var(--inkind)" />
      </div>

      <div className="section-title">{t('accountBalances')}</div>
      <div className="stats">
        {balances.map((b) => <Stat key={b.id} k={b.name} v={money(b.balance)} c="var(--text)" small />)}
        {!balances.length && <div className="empty">{t('noRows')}</div>}
      </div>

      <div className="section-title">{t('incomeVsExpense')} · {active?.name || ''}</div>
      <div className="panel panel-pad" style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={byMonth} margin={{ top: 6, right: 8, left: 8, bottom: 6 }}>
            <CartesianGrid stroke="#dde2ee" vertical={false} />
            <XAxis dataKey="month" tick={axis} />
            <YAxis tick={axis} width={60} />
            <Tooltip contentStyle={tip} formatter={(v) => money(v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="income" name={t('income')} fill={typeColor.income} radius={[3, 3, 0, 0]} />
            <Bar dataKey="expense" name={t('expense')} fill={typeColor.expense} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="charts" style={{ marginTop: 16 }}>
        <div className="panel panel-pad">
          <div className="section-title" style={{ marginTop: 0 }}>{t('byCategory')}</div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" outerRadius={90} innerRadius={48}>
                  {byCategory.map((_, i) => <Cell key={i} fill={CATCOLORS[i % CATCOLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tip} formatter={(v) => money(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel panel-pad">
          <div className="section-title" style={{ marginTop: 0 }}>{t('bySource')}</div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bySource} layout="vertical" margin={{ left: 10, right: 16 }}>
                <XAxis type="number" tick={axis} />
                <YAxis type="category" dataKey="name" tick={axis} width={90} />
                <Tooltip contentStyle={tip} formatter={(v) => money(v)} />
                <Bar dataKey="value" fill={typeColor.income} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

const tip = { background: '#ffffff', border: '1px solid #c6cde0', borderRadius: 8, fontSize: 13, color: '#151a2b' }

function Stat({ k, v, c, small }) {
  return (
    <div className="stat panel">
      <div className="k">{k}</div>
      <div className="v" style={{ color: c, fontSize: small ? 20 : 26 }}>{v}</div>
    </div>
  )
}

function group(rows, keyFn) {
  const m = {}
  for (const r of rows) { const k = keyFn(r); m[k] = (m[k] || 0) + Number(r.amount) }
  return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}
