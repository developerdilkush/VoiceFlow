import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Phone, Users, History, BarChart3, Settings, LogOut, Menu, X, AudioLines, UserCircle, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { ThemeToggle } from '../components/common/ThemeToggle.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/call', label: 'Single Call', icon: Phone },
  { to: '/bulk', label: 'Bulk Calling', icon: Users },
  { to: '/history', label: 'Call History', icon: History },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/profile', label: 'Profile', icon: UserCircle },
  { to: '/security', label: 'Security', icon: Lock },
];

const Logo = () => (
  <div className="flex items-center gap-2.5 font-semibold text-[17px]">
    <span className="h-8 w-8 rounded-lg bg-accent text-on-accent grid place-items-center"><AudioLines className="h-5 w-5" aria-hidden /></span>
    VoiceFlow
  </div>
);

function NavList({ onNavigate }) {
  return (
    <nav aria-label="Main" className="space-y-1">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} onClick={onNavigate}
          className={({ isActive }) => `flex items-center gap-3 min-h-[44px] px-3 rounded-ctl text-sm font-medium transition-colors ${isActive ? 'bg-accent/10 text-accent' : 'text-muted hover:text-ink hover:bg-elevated'}`}>
          <Icon className="h-[18px] w-[18px]" aria-hidden />{label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);

  const out = async () => { await logout(); nav('/login'); };
  return (
    <div className="min-h-dvh lg:flex">
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-line bg-surface p-4 sticky top-0 h-dvh">
        <div className="px-2 py-3 mb-4"><Logo /></div>
        <div className="flex-1 overflow-y-auto"><NavList /></div>
        <button onClick={out} className="btn-ghost justify-start mt-2"><LogOut className="h-[18px] w-[18px]" />Sign out</button>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 h-14 px-3 sm:px-6 border-b border-line bg-surface/90 backdrop-blur">
          <button className="btn-ghost !px-3 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}><Menu className="h-5 w-5" /></button>
          <div className="lg:hidden"><Logo /></div>
          <div className="hidden lg:block text-sm text-muted">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <NavLink to="/profile" className="btn-ghost !px-2 max-w-[10rem]" aria-label="Profile">
              <span className="h-8 w-8 rounded-full bg-accent/15 text-accent grid place-items-center text-sm font-semibold shrink-0">{user?.displayName?.[0]?.toUpperCase()}</span>
              <span className="hidden sm:block truncate">{user?.displayName}</span>
            </NavLink>
          </div>
        </header>
        <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 py-5 sm:py-8 pb-28 lg:pb-8"><Outlet /></main>
        <NavLink to="/call" className="btn-primary lg:hidden fixed bottom-4 right-4 z-30 shadow-soft rounded-full !min-h-[52px] px-5"><Phone className="h-5 w-5" />New call</NavLink>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} aria-hidden />
          <div role="dialog" aria-modal="true" aria-label="Navigation" className="absolute left-0 top-0 h-full w-[min(18rem,85vw)] bg-surface border-r border-line p-4 flex flex-col">
            <div className="flex items-center justify-between px-2 py-2 mb-3"><Logo /><button className="btn-ghost !px-2" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button></div>
            <div className="flex-1 overflow-y-auto"><NavList onNavigate={() => setOpen(false)} /></div>
            <button onClick={out} className="btn-ghost justify-start"><LogOut className="h-[18px] w-[18px]" />Sign out</button>
          </div>
        </div>
      )}
    </div>
  );
}
