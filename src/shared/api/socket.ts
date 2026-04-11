// Socket.io client — one connection per module, reused across mounts.
//
// Connects to `/ws/<moduleId>` with the current JWT in the handshake. Keeps
// track of subscribers so multiple components can listen to the same events
// without creating duplicate connections.

import { io, Socket } from 'socket.io-client';
import type { ModuleId } from '@/shared/types';
import { getAuthToken } from './client';

type ChatEventName = 'chat:new' | 'chat:update' | 'chat:delete';
type ChatHandler = (event: ChatEventName, payload: unknown) => void;

interface ModuleConnection {
  socket: Socket;
  handlers: Set<ChatHandler>;
  currentUnitId: string | null;
}

const connections: Partial<Record<ModuleId, ModuleConnection>> = {};

function buildUrl(moduleId: ModuleId): string {
  // Production (Render static site): the browser lives on the frontend
  // origin but the backend is a different host, so we must use the
  // absolute URL from VITE_WS_BASE_URL (baked in at build time).
  //
  // Local dev: fall back to window.location so the Vite proxy handles
  // /socket.io transparently.
  const envBase = (
    import.meta.env.VITE_WS_BASE_URL as string | undefined
  )?.replace(/\/$/, '');
  if (envBase) return `${envBase}/ws/${moduleId}`;
  if (typeof window === 'undefined') return `/ws/${moduleId}`;
  const { protocol, host } = window.location;
  return `${protocol}//${host}/ws/${moduleId}`;
}

function connect(moduleId: ModuleId): ModuleConnection {
  const existing = connections[moduleId];
  if (existing) return existing;

  const token = getAuthToken();
  const socket = io(buildUrl(moduleId), {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  const conn: ModuleConnection = {
    socket,
    handlers: new Set(),
    currentUnitId: null,
  };

  const relay = (event: ChatEventName) => (payload: unknown) => {
    for (const handler of conn.handlers) {
      try {
        handler(event, payload);
      } catch (err) {
        console.error('socket handler failed', err);
      }
    }
  };

  socket.on('chat:new', relay('chat:new'));
  socket.on('chat:update', relay('chat:update'));
  socket.on('chat:delete', relay('chat:delete'));

  socket.on('connect', () => {
    if (conn.currentUnitId) socket.emit('join:unit', conn.currentUnitId);
  });
  socket.on('connect_error', (err) => {
    console.warn(`[ws/${moduleId}] connect_error:`, err.message);
  });

  connections[moduleId] = conn;
  return conn;
}

/**
 * Subscribe to chat events for a module. Returns an unsubscribe function.
 * Idempotent — calling multiple times per module reuses the same socket.
 */
export function subscribeChat(
  moduleId: ModuleId,
  handler: ChatHandler
): () => void {
  const conn = connect(moduleId);
  conn.handlers.add(handler);
  return () => {
    conn.handlers.delete(handler);
  };
}

/**
 * Join a unit's event room. Emits the join to the server once connected
 * (even if the socket is currently reconnecting — `connect` listener
 * re-emits after a reconnect).
 */
export function joinUnitRoom(moduleId: ModuleId, unitId: string): void {
  if (!unitId) return;
  const conn = connect(moduleId);
  if (conn.currentUnitId === unitId) return;
  if (conn.currentUnitId) conn.socket.emit('leave:unit', conn.currentUnitId);
  conn.currentUnitId = unitId;
  if (conn.socket.connected) conn.socket.emit('join:unit', unitId);
}

export function leaveUnitRoom(moduleId: ModuleId): void {
  const conn = connections[moduleId];
  if (!conn || !conn.currentUnitId) return;
  if (conn.socket.connected) conn.socket.emit('leave:unit', conn.currentUnitId);
  conn.currentUnitId = null;
}

/**
 * Drop the module's socket entirely. Call on logout so the handshake is
 * re-issued with a fresh token the next time the user logs back in.
 */
export function disconnectModule(moduleId: ModuleId): void {
  const conn = connections[moduleId];
  if (!conn) return;
  try {
    conn.socket.disconnect();
  } catch {
    /* ignore */
  }
  delete connections[moduleId];
}
