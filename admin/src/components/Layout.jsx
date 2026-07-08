import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './Layout.css';

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/users', label: 'Users' },
  { to: '/daily-codes', label: 'Daily Codes' },
  { to: '/user-codes', label: 'User Submissions' },
  { to: '/withdrawals', label: 'Withdrawals' },
  { to: '/kyc', label: 'KYC Review' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">X</span>
          <div>
            <strong>Xceed Admin</strong>
            <small>equity-eyes</small>
          </div>
        </div>
        <nav>
          {NAV.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => isActive ? 'nav active' : 'nav'}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span>{user?.name}</span>
          <button type="button" className="ghost" onClick={handleLogout}>Sign out</button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
