// NotificationBell — bell icon with unread count badge. Click opens a
// dropdown panel listing recent notifications.

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Bell, Check } from 'lucide-react';
import { useNotificationStore, type AppNotification } from '@/shared/stores/notificationStore';
import { formatShortTime } from '@/shared/utils/date';
import { subscribeChat } from '@/shared/api/socket';
import { toCamelCase } from '@/shared/wire';

interface NotificationBellProps {
  moduleId: string;
}

export function NotificationBell({ moduleId }: NotificationBellProps) {
  const { notifications, unreadCount, loadNotifications, addNotification, markRead, markAllRead } =
    useNotificationStore();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Load notifications on mount
  useEffect(() => {
    loadNotifications(moduleId);
  }, [moduleId, loadNotifications]);

  // Listen for real-time notification events
  useEffect(() => {
    const unsub = subscribeChat(moduleId as 'catering' | 'craftservice', (event, rawPayload) => {
      if (event === ('notification:new' as 'chat:new')) {
        const notif = toCamelCase(rawPayload as never) as unknown as AppNotification;
        if (notif && notif._id) {
          addNotification(notif);
        }
      }
    });
    return () => unsub();
  }, [moduleId, addNotification]);

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        className="btn-ghost relative"
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="glass absolute right-0 top-full z-50 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl p-2 shadow-xl">
          <div className="flex items-center justify-between px-3 py-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Notifications
            </h3>
            {unreadCount > 0 ? (
              <button
                type="button"
                className="text-[10px] text-brand-300 hover:text-brand-200"
                onClick={() => markAllRead(moduleId)}
              >
                Mark all read
              </button>
            ) : null}
          </div>

          {notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-slate-400">
              No notifications yet.
            </p>
          ) : (
            notifications.slice(0, 20).map((n) => (
              <div
                key={n._id}
                className={clsx(
                  'flex items-start gap-2 rounded-lg px-3 py-2 transition',
                  !n.read
                    ? 'bg-brand-500/10 hover:bg-brand-500/15'
                    : 'hover:bg-white/5'
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-100">{n.title}</p>
                  {n.body ? (
                    <p className="text-[10px] text-slate-400 line-clamp-2">{n.body}</p>
                  ) : null}
                  <p className="mt-0.5 text-[9px] text-slate-500">
                    {n.created ? formatShortTime(n.created) : ''}
                  </p>
                </div>
                {!n.read ? (
                  <button
                    type="button"
                    className="flex-shrink-0 rounded p-1 text-slate-400 hover:bg-white/10 hover:text-slate-200"
                    onClick={() => markRead(moduleId, n._id)}
                    title="Mark read"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
