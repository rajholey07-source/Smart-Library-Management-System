import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen, LayoutDashboard, Library, LogIn, LogOut, Menu, Moon, Sun, UserPlus,
  Bell, BookMarked, Users, Repeat, Wallet, BarChart3, Settings, X, ChevronDown, CalendarClock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { api } from '../api.js';
import { Button, Spinner } from './ui.jsx';

function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      aria-label="Toggle dark mode"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);
  const location = useLocation();

  const load = async () => {
    try {
      const data = await api.notifications();
      setItems(data.notifications || []);
      setUnread(data.unread || 0);
    } catch {
      /* signed out */
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [location.pathname]);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const markAll = async () => {
    await api.markAllRead();
    load();
  };

  const toneDot = { success: 'bg-emerald-500', warning: 'bg-amber-500', danger: 'bg-rose-500', info: 'bg-sky-500' };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="card absolute right-0 z-40 mt-2 w-80 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-2.5">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-400">No notifications yet.</p>}
            {items.map((n) => (
              <div key={n.id} className={`flex gap-2.5 border-b border-slate-100 dark:border-slate-800/60 px-4 py-3 last:border-0 ${n.is_read ? '' : 'bg-brand-50/50 dark:bg-brand-950/20'}`}>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${toneDot[n.type] || 'bg-sky-500'}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-snug">{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{n.message}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{new Date(n.created_at.replace(' ', 'T')).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const links = [
    { to: '/', label: 'Home' },
    { to: '/catalog', label: 'Catalog' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
          <span className="rounded-lg bg-brand-600 p-1.5 text-white"><Library size={18} /></span>
          <span className="hidden sm:block">Smart Library</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-medium transition
                ${isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}
            >
              {l.label}
            </NavLink>
          ))}
          {user?.role === 'admin' && (
            <NavLink to="/admin" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
              Admin
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {user ? (
            <>
              <NotificationsBell />
              <div className="hidden items-center gap-2 md:flex">
                <Link to="/dashboard" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                    {user.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                  </span>
                  <span className="max-w-28 truncate">{user.full_name}</span>
                </Link>
              </div>
              <Button variant="ghost" size="sm" onClick={async () => { await logout(); navigate('/'); }}>
                <LogOut size={16} />
              </Button>
            </>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Button variant="ghost" size="sm" to="/login"><LogIn size={15} /> Sign in</Button>
              <Button size="sm" to="/register"><UserPlus size={15} /> Register</Button>
            </div>
          )}
          <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden dark:hover:bg-slate-800" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">
                {l.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">My dashboard</Link>
                <Link to="/my-books" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">My books</Link>
                {user.role === 'admin' && (
                  <Link to="/admin" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Admin panel</Link>
                )}
                <button onClick={async () => { setOpen(false); await logout(); navigate('/'); }} className="rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950">
                  Sign out
                </button>
              </>
            ) : (
              <div className="mt-2 flex gap-2">
                <Button variant="outline" className="flex-1" to="/login" onClick={() => setOpen(false)}>Sign in</Button>
                <Button className="flex-1" to="/register" onClick={() => setOpen(false)}>Register</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 font-bold">
            <span className="rounded-lg bg-brand-600 p-1.5 text-white"><Library size={16} /></span>
            Smart Library Management System
          </div>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            A complete library platform for students and librarians — search the catalog, borrow books, and track everything in one place.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Explore</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-500 dark:text-slate-400">
            <li><Link className="hover:text-brand-600 dark:hover:text-brand-400" to="/catalog">Book catalog</Link></li>
            <li><Link className="hover:text-brand-600 dark:hover:text-brand-400" to="/register">Become a member</Link></li>
            <li><Link className="hover:text-brand-600 dark:hover:text-brand-400" to="/login">Student sign in</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Opening hours</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-500 dark:text-slate-400">
            <li>Mon – Fri: 8:00 – 20:00</li>
            <li>Saturday: 9:00 – 17:00</li>
            <li>Sunday: Closed</li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Contact</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-500 dark:text-slate-400">
            <li>library@smartlibrary.edu</li>
            <li>+1 (555) 014-2277</li>
            <li>12 College Road, Campus North</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-200 py-4 text-center text-xs text-slate-400 dark:border-slate-800">
        © {new Date().getFullYear()} Smart Library Management System · All rights reserved
      </div>
    </footer>
  );
}

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

const adminNav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/books', label: 'Books', icon: BookMarked },
  { to: '/admin/students', label: 'Students', icon: Users },
  { to: '/admin/borrowing', label: 'Borrowing', icon: Repeat },
  { to: '/admin/fines', label: 'Fines', icon: Wallet },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminLayout() {
  const { user, loading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      navigate('/login?admin=1', { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  if (loading) return <Spinner label="Checking your session…" />;
  if (!user || user.role !== 'admin') return null;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-200 bg-white transition-transform dark:border-slate-800 dark:bg-slate-900 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5 dark:border-slate-800">
          <span className="rounded-lg bg-brand-600 p-1.5 text-white"><Library size={18} /></span>
          <div>
            <p className="text-sm font-bold leading-tight">Smart Library</p>
            <p className="text-[11px] text-slate-400">Librarian console</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {adminNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition
                ${isActive ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}
            >
              <item.icon size={17} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 w-full border-t border-slate-200 p-3 dark:border-slate-800">
          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
              {user.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.full_name}</p>
              <p className="text-[11px] text-slate-400">Administrator</p>
            </div>
            <button onClick={logout} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800" aria-label="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 dark:border-slate-800 dark:bg-slate-900/90">
          <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <p className="hidden text-sm text-slate-400 sm:block">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <NotificationsBell />
            <Button variant="outline" size="sm" to="/">View site <BookOpen size={14} /></Button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function StudentLayout() {
  return <Outlet />;
}

export { CalendarClock };
