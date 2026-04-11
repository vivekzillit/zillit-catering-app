// LoginPage — glassmorphism login screen with mock quick-login cards for
// the seeded dev users + a real email/password form.

import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, LogIn } from 'lucide-react';
import { useAuthStore } from '@/shared/stores/authStore';
import { Glass } from '@/shared/components/Glass';
import { ThemeToggle } from '@/shared/components/ThemeToggle';

const QUICK_USERS = [
  { label: 'Vivek (caterer)', email: 'caterer@zillit.dev', password: 'password123' },
  { label: 'iPhone Red (member)', email: 'member@zillit.dev', password: 'password123' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/catering', { replace: true });
    } catch {
      // error is surfaced via the store
    }
  }

  async function quickLogin(u: { email: string; password: string }) {
    setEmail(u.email);
    setPassword(u.password);
    try {
      await login(u.email, u.password);
      navigate('/catering', { replace: true });
    } catch {
      // store holds error
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>
      <Glass className="w-full max-w-md p-8">
        <header className="mb-6 space-y-1 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-500/30">
            <LogIn className="h-6 w-6" />
          </div>
          <h1 className="mt-3 text-xl font-semibold">Zillit Kitchen</h1>
          <p className="text-xs text-slate-400">Catering &amp; Craft Service</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Email
            </label>
            <input
              className="input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Password
            </label>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          ) : null}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Sign In
          </button>
        </form>

        <div className="mt-6 space-y-2">
          <p className="text-center text-[10px] uppercase tracking-wider text-slate-500">
            Quick login (dev)
          </p>
          {QUICK_USERS.map((u) => (
            <button
              key={u.email}
              type="button"
              className="btn-secondary w-full justify-between"
              onClick={() => quickLogin(u)}
              disabled={loading}
            >
              <span>{u.label}</span>
              <span className="text-[10px] opacity-70">{u.email}</span>
            </button>
          ))}
        </div>
      </Glass>
    </div>
  );
}
