// Date + label helpers.

export function formatChatDate(input: Date | number | string): string {
  const date = typeof input === 'number' || typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return '';

  const dateStr = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeStr = date
    .toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase();
  return `${dateStr} ${timeStr}`;
}

export function formatShortTime(input: Date | number | string): string {
  const date = typeof input === 'number' || typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return '';
  return date
    .toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase();
}

export function epochMsNow(): number {
  return Date.now();
}

export function safeUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Convert a backend i18n key like `breakfast_label` → `Breakfast`.
 * Strips the `_label` suffix and title-cases the remaining tokens.
 */
export function humanizeLabel(key: string | undefined | null): string {
  if (!key) return '';
  return key
    .replace(/_label$/i, '')
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
