// Wire-format helpers matching iOS JSONSerialization conventions.
// camelCase <-> snake_case (preserving leading underscores like `_id`)
// and stringifyForWire for deterministic body hashing.

type Json =
  | null
  | undefined
  | string
  | number
  | boolean
  | Json[]
  | { [k: string]: Json };

function camelToSnake(key: string): string {
  const leading = key.match(/^_+/)?.[0] ?? '';
  const rest = key.slice(leading.length);
  return leading + rest.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
}

function snakeToCamel(key: string): string {
  const leading = key.match(/^_+/)?.[0] ?? '';
  const rest = key.slice(leading.length);
  return leading + rest.replace(/_([a-z0-9])/gi, (_, c: string) => c.toUpperCase());
}

export function toSnakeCase(input: Json): Json {
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) return input.map(toSnakeCase) as Json[];
  if (typeof input === 'object') {
    const out: { [k: string]: Json } = {};
    for (const [k, v] of Object.entries(input)) {
      out[camelToSnake(k)] = toSnakeCase(v as Json);
    }
    return out;
  }
  return input;
}

export function toCamelCase(input: Json): Json {
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) return input.map(toCamelCase) as Json[];
  if (typeof input === 'object') {
    const out: { [k: string]: Json } = {};
    for (const [k, v] of Object.entries(input)) {
      out[snakeToCamel(k)] = toCamelCase(v as Json);
    }
    return out;
  }
  return input;
}

export function stringifyForWire(input: unknown): string {
  return sortedStringify(toSnakeCase(input as Json));
}

function sortedStringify(value: Json): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(sortedStringify).join(',') + ']';
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    const parts: string[] = [];
    for (const k of keys) {
      const v = (value as { [k: string]: Json })[k];
      if (v === undefined) continue;
      parts.push(JSON.stringify(k) + ':' + sortedStringify(v));
    }
    return '{' + parts.join(',') + '}';
  }
  return 'null';
}
