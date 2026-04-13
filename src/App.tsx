// Root app — routing + auth bootstrap.
// Public route: /login. Everything else is wrapped in the Layout shell
// and redirected to /login when there's no current user.

import { ReactNode, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/shared/stores/authStore';
import { Layout } from '@/shared/components/Layout';
import LoginPage from '@/pages/LoginPage';
import NotFoundPage from '@/pages/NotFoundPage';
import CateringPage from '@/features/catering/CateringPage';
import CraftServicePage from '@/features/craftservice/CraftServicePage';
import ContactDirectory from '@/features/contacts/ContactDirectory';

function RequireAuth({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">
        Loading…
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Layout>{children}</Layout>;
}

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/catering/*"
        element={
          <RequireAuth>
            <CateringPage />
          </RequireAuth>
        }
      />
      <Route
        path="/craftservice/*"
        element={
          <RequireAuth>
            <CraftServicePage />
          </RequireAuth>
        }
      />
      <Route
        path="/contacts"
        element={
          <RequireAuth>
            <ContactDirectory />
          </RequireAuth>
        }
      />
      <Route path="/" element={<Navigate to="/catering" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
