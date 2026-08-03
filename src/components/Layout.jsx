import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import ChangePasswordModal from './ChangePasswordModal.jsx';
import { Icon, PwdLogo } from './Icons.jsx';

/* Navigation uses the shared, consistent icon set (see Icons.jsx). */
function NavIcon({ name }) { return <Icon name={name} size={19} />; }

const NAV_ADMIN = [
  ['dashboard', 'Dashboard'],
  ['users', 'User Management'],
  ['viewdata', 'View Submitted Data'],
  ['reports', 'Reports'],
];
const NAV_OFFICER = [
  ['dashboard', 'Dashboard'],
  ['upload', 'Upload Excel'],
  ['viewdata', 'View Submitted Data'],
  ['reports', 'Reports'],
];

export default function Layout() {
  const { currentUser, logout } = useApp();
  const [pwOpen, setPwOpen] = useState(false);
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
          <div className="emblem" style={{ background: '#fff', padding: 3 }}><PwdLogo size={36} /></div>
          <div className="titles">
            <div>PWD Maharashtra</div>
            <div>Public Works Department</div>
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
            <button className="btn btn-sm" onClick={() => setPwOpen(true)} title="Change Password"><Icon name="lock" size={15} /> Change Password</button>
            <button className="btn btn-sm" onClick={onLogout}><Icon name="logout" size={15} /> Logout</button>
          </div>
        </div>
        <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}