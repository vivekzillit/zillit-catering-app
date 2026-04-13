// Top-level app shell — sticky glass nav bar with module switcher
// (Catering / Craft Service), theme toggle, and sign-out button.

import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { LogOut, Utensils, Coffee, Contact, FileText } from 'lucide-react';
import { useAuthStore } from '@/shared/stores/authStore';
import { ThemeToggle } from './ThemeToggle';

interface LayoutProps {
  children: ReactNode;
}

const MODULE_TABS = [
  { to: '/catering', label: 'Catering', icon: Utensils },
  { to: '/craftservice', label: 'Craft Service', icon: Coffee },
];

export function Layout({ children }: LayoutProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b hr-soft bg-slate-950/40 backdrop-blur-xl dark:bg-slate-950/40">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-lg text-white shadow-lg shadow-brand-500/30">
              🍴
            </span>
            <div>
              <h1 className="text-sm font-bold tracking-tight">Zillit</h1>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">
                Catering & Craft Service
              </p>
            </div>
          </div>

          {/* Module tabs */}
          <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-xl md:flex">
            {MODULE_TABS.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition',
                    isActive
                      ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  )
                }
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </NavLink>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{user?.name ?? 'Guest'}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">
                {user?.role ?? ''}
              </p>
            </div>
            <NavLink
              to="/callsheet"
              className={({ isActive }) =>
                clsx(
                  'btn-ghost',
                  isActive && 'bg-white/10 text-brand-300'
                )
              }
              title="Call Sheet"
              aria-label="Call Sheet"
            >
              <FileText className="h-4 w-4" />
            </NavLink>
            <NavLink
              to="/contacts"
              className={({ isActive }) =>
                clsx(
                  'btn-ghost',
                  isActive && 'bg-white/10 text-brand-300'
                )
              }
              title="Contacts"
              aria-label="Contacts"
            >
              <Contact className="h-4 w-4" />
            </NavLink>
            <ThemeToggle />
            <button
              type="button"
              className="btn-ghost"
              onClick={handleLogout}
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mobile tabs */}
        <nav className="flex items-center justify-center gap-1 border-t hr-soft p-2 md:hidden">
          {MODULE_TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                clsx(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                  isActive ? 'bg-brand-500 text-white' : 'text-slate-400'
                )
              }
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="relative mx-auto w-full max-w-7xl flex-1 px-4 py-4">{children}</main>
    </div>
  );
}
