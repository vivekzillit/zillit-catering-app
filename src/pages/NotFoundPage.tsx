import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="glass max-w-md p-8 text-center">
        <p className="text-5xl font-bold text-brand-400">404</p>
        <h1 className="mt-2 text-xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-slate-400">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/catering" className="btn-primary mt-6 inline-flex">
          Back to Catering
        </Link>
      </div>
    </div>
  );
}
