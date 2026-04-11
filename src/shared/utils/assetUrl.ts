// resolveAssetUrl — map a backend asset path (e.g. "/uploads/123.jpg") to
// an absolute URL that works from a different-origin static site.
//
// The backend returns relative paths like "/uploads/<key>" from the
// upload controller. In local dev the Vite proxy forwards /uploads/* to
// the backend, so the relative path resolves naturally. In production the
// frontend is served from a different origin than the backend, so we
// prepend the backend origin by stripping "/api/v2" off VITE_API_BASE_URL.

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
const BACKEND_ORIGIN = API_BASE.replace(/\/api\/v2\/?$/, '').replace(/\/$/, '');

export function resolveAssetUrl(path?: string | null): string {
  if (!path) return '';
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  const normalised = path.startsWith('/') ? path : `/${path}`;
  return BACKEND_ORIGIN ? `${BACKEND_ORIGIN}${normalised}` : normalised;
}
