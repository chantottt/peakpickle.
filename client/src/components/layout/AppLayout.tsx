import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  UserRound,
  Grid2X2,
  CalendarDays,
  ListOrdered,
  Users,
  Swords,
  Trophy,
  ChartNoAxesCombined,
  Settings2,
  Menu,
  X,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react';
import { Brand } from './Brand';
import { Avatar, Button, Modal } from '../ui';
import { dateLabel, today } from '../../utils/format';
const items = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/activity', label: 'My Activity', icon: UserRound },
  { to: '/courts', label: 'Courts', icon: Grid2X2 },
  { to: '/reservations', label: 'Reservations', icon: CalendarDays },
  { to: '/queue', label: 'Live Queue', icon: ListOrdered },
  { to: '/players', label: 'Players', icon: Users },
  { to: '/matchmaking', label: 'Matchmaking', icon: Swords },
  { to: '/matches', label: 'Matches', icon: Swords },
  { to: '/rankings', label: 'Rankings', icon: Trophy },
  { to: '/statistics', label: 'Statistics', icon: ChartNoAxesCombined },
];
export function AppLayout() {
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, []);
  const current =
    items.find((item) => location.pathname.startsWith(item.to))?.label || 'PeakPickle';
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      {open && (
        <button
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside id="app-navigation" className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <Brand light />
          <button
            className="drawer-close"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X size={22} />
          </button>
        </div>
        <p className="sidebar-caption">YOUR CLUB, CONNECTED</p>
        <nav aria-label="Application">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <item.icon size={19} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-promo">
          <span>MAKE TIME FOR PLAY</span>
          <h3>
            A good game
            <br />
            starts here.
          </h3>
          <NavLink to="/reservations/new">
            Book your next court <ArrowUpRight size={17} />
          </NavLink>
        </div>
        <div className="sidebar-bottom">
          <button onClick={() => setAccount(true)} className="sidebar-link">
            <Settings2 size={18} />
            Account & settings
          </button>
          <button className="club-account" onClick={() => setAccount(true)}>
            <Avatar name="Club Manager" id="000000000000000000000001" />
            <span>
              <strong>Club Manager</strong>
              <small>PeakPickle community</small>
            </span>
            <ChevronRight size={16} />
          </button>
        </div>
      </aside>
      <div className="app-main">
        <header className="app-topbar">
          <div className="breadcrumb">
            <Button
              className="hamburger"
              variant="ghost"
              aria-label="Open navigation"
              aria-expanded={open}
              aria-controls="app-navigation"
              onClick={() => setOpen(true)}
            >
              <Menu size={22} />
            </Button>
            <span>PeakPickle</span>
            <ChevronRight size={14} />
            <strong>{current}</strong>
          </div>
          <div className="topbar-right">
            <span className="topbar-date">
              <CalendarDays size={16} />
              {dateLabel(today(), { weekday: 'short' })}
            </span>
            <button
              className="account-button"
              aria-label="Account information"
              onClick={() => setAccount(true)}
            >
              <Avatar name="Club Manager" id="000000000000000000000001" />
            </button>
          </div>
        </header>
        <main id="main-content" className="page-content">
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>© {new Date().getFullYear()} PeakPickle</span>
          <span>Your Court. Your Match. Your Turn.</span>
        </footer>
      </div>
      {account && (
        <Modal title="Your club workspace" onClose={() => setAccount(false)}>
          <p className="muted">
            PeakPickle is a shared club management workspace. Player profiles are managed in
            Players.
          </p>
          <div className="account-info">
            <strong>Club Manager</strong>
            <span>Timezone: Asia/Manila</span>
            <span>Authentication is outside this project’s core scope.</span>
          </div>
          <div className="form-actions">
            <Button onClick={() => setAccount(false)}>Done</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
