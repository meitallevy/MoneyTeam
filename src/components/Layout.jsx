import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSeason } from '../context/SeasonContext'
import { useI18n } from '../lib/i18n'

export default function Layout({ children }) {
  const { t, toggle, lang } = useI18n()
  const { member, role, signOut } = useAuth()
  const { seasons, activeId, setActiveId } = useSeason()

  const links = [
    { to: '/', key: 'dashboard' },
    { to: '/transactions', key: 'transactions' },
    { to: '/budgets', key: 'budgets' },
    { to: '/shopping', key: 'shopping' },
    { to: '/settings', key: 'settings' },
  ]

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="tick" />
          <div>
            <small>Neat Team 1943</small>
            <b>Finance</b>
          </div>
        </div>
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.to === '/'} className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            <span className="dot" />
            {t(l.key)}
          </NavLink>
        ))}
      </aside>

      <div className="main">
        <header className="topbar">
          <select value={activeId || ''} onChange={(e) => setActiveId(e.target.value)} style={{ width: 'auto', minWidth: 160 }}>
            {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="spacer" />
          <button className="btn btn-ghost btn-sm" onClick={toggle}>{lang === 'he' ? 'EN' : 'עב'}</button>
          <span className="badge">{member?.full_name || member?.email} · {t(role || 'viewer')}</span>
          <button className="btn btn-ghost btn-sm" onClick={signOut}>{t('signOut')}</button>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  )
}
