// Dark/light mode toggle. Persists to localStorage and toggles the `dark`
// class on <html>. Dark is the default.

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'dark' | 'light';

function readTheme(): Theme {
  try {
    return localStorage.getItem('zillit.theme') === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => readTheme());

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem('zillit.theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  return (
    <button
      type="button"
      className="btn-ghost"
      onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  );
}
