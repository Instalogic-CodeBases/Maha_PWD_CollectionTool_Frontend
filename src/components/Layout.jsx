import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';

/* ------------------------------------------------------------------ */
/* Lightweight inline icon set (stroke-based, inherits currentColor).  */
/* No extra dependency required.                                       */
/* ------------------------------------------------------------------ */
const S = { width: 19, height: 19, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
const ICONS = {
  dashboard: (<svg {...S}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>),
  users: (<svg {...S}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>),
  dataform: (<svg {...S}><path d="M9 2h6a1 1 0 0 1 1 1v1h1a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1z" /><path d="M9 12h6M9 16h4" /></svg>),
  template: (<svg {...S}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>),
  cids: (<svg {...S}><path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18" /></svg>),
  viewdata: (<svg {...S}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" /></svg>),
  reports: (<svg {...S}><path d="M3 3v18h18" /><rect x="7" y="12" width="3" height="6" rx="1" /><rect x="12" y="8" width="3" height="10" rx="1" /><rect x="17" y="5" width="3" height="13" rx="1" /></svg>),
  upload: (<svg {...S}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M12 3v12M7 8l5-5 5 5" /></svg>),
};
function NavIcon({ name }) { return ICONS[name] || ICONS.dashboard; }

const NAV_ADMIN = [
  ['dashboard', 'Dashboard'],
  ['users', 'User Management'],
  ['dataform', 'Data Form'],
  ['template', 'Dynamic Template'],
  ['cids', 'Computer ID Management'],
  ['viewdata', 'View Submitted Data'],
  ['reports', 'Reports'],
];
const NAV_OFFICER = [
  ['dashboard', 'Dashboard'],
  ['dataform', 'Fill Daily Form'],
  ['upload', 'Upload Excel'],
  ['viewdata', 'View Submitted Data'],
  ['reports', 'Reports'],
];

export default function Layout() {
  const { currentUser, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'admin';
  const items = isAdmin ? NAV_ADMIN : NAV_OFFICER;
  const page = location.pathname.replace('/', '') || 'dashboard';

  const titleMap = {
    dashboard: 'Dashboard',
    users: 'User Management',
    dataform: isAdmin ? 'Data Form' : 'Fill Daily Form',
    template: 'Dynamic Template',
    cids: 'Computer ID Management',
    upload: 'Upload Excel',
    viewdata: 'View Submitted Data',
    reports: 'Reports',
  };
  const title = titleMap[page] || page;

  const go = (k) => { setDrawerOpen(false); navigate('/' + k); };
  const onLogout = async () => { await logout(); navigate('/login', { replace: true }); };

  return (
    <div className="shell">
      <div className={'sidebar-backdrop' + (drawerOpen ? ' show' : '')} onClick={() => setDrawerOpen(false)} />
      <aside className={'sidebar' + (drawerOpen ? ' open' : '')}>
        <div className="sidebar-logo">
          <div className="emblem">म</div>
          <div className="titles">
            <div>PWD</div>
            <div>Data Collection System</div>
          </div>
        </div>
        <nav className="nav">
          {items.map(([k, l]) => (
            <button key={k} className={'nav-item' + (page === k ? ' active' : '')} onClick={() => go(k)}>
              <NavIcon name={k} />
              <span>{l}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">v1.0 · Connected to backend</div>
      </aside>

      <div className="main">
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="menu-btn" onClick={() => setDrawerOpen(true)} aria-label="Menu">☰</button>
            <div>
              <div className="topbar-left">{title}</div>
              <div className="topbar-crumb">Home / {title}</div>
            </div>
          </div>
          <div className="topbar-right">
            <div className="user-chip">
              <div className="user-avatar">{(currentUser.name || 'A').charAt(0).toUpperCase()}</div>
              <div>
                <div className="u-name">{currentUser.name}</div>
                <div className="u-role">{isAdmin ? 'Super Admin' : 'Circle Officer'}</div>
              </div>
            </div>
            <button className="btn btn-sm" onClick={onLogout}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></svg>
              Logout
            </button>
          </div>
        </div>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}