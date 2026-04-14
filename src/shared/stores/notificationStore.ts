// Notification store — tracks unread notifications and manages the
// bell icon count + toast display state.

import { create } from 'zustand';
import { api } from '@/shared/api/client';
import { toCamelCase } from '@/shared/wire';

export interface AppNotification {
  _id: string;
  userId: string;
  type: 'order_ready' | 'order_accepted' | 'new_message';
  title: string;
  body: string;
  orderId?: string;
  read: boolean;
  created: number;
}

interface Envelope<T> { status: number; message: string; data: T; }
function cc<T>(raw: unknown): T { return toCamelCase(raw as never) as unknown as T; }

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  toast: AppNotification | null;
  loadNotifications: (moduleId: string) => Promise<void>;
  addNotification: (notif: AppNotification) => void;
  markRead: (moduleId: string, notifId: string) => Promise<void>;
  markAllRead: (moduleId: string) => Promise<void>;
  clearToast: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  toast: null,

  async loadNotifications(moduleId) {
    try {
      const { data } = await api.get<Envelope<unknown>>(`/${moduleId}/notifications`);
      const notifs = cc<AppNotification[]>(data.data) ?? [];
      set({
        notifications: notifs,
        unreadCount: notifs.filter((n) => !n.read).length,
      });
    } catch (err) {
      console.error('loadNotifications failed', err);
    }
  },

  addNotification(notif) {
    set((s) => ({
      notifications: [notif, ...s.notifications],
      unreadCount: s.unreadCount + 1,
      toast: notif, // show toast
    }));
    // Auto-clear toast after 6 seconds
    setTimeout(() => {
      if (get().toast?._id === notif._id) set({ toast: null });
    }, 6000);
  },

  async markRead(moduleId, notifId) {
    try {
      await api.put(`/${moduleId}/notifications/${notifId}/read`);
      set((s) => ({
        notifications: s.notifications.map((n) =>
          n._id === notifId ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, s.unreadCount - 1),
      }));
    } catch (err) {
      console.error('markRead failed', err);
    }
  },

  async markAllRead(moduleId) {
    try {
      await api.put(`/${moduleId}/notifications/read-all`);
      set((s) => ({
        notifications: s.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    } catch (err) {
      console.error('markAllRead failed', err);
    }
  },

  clearToast() {
    set({ toast: null });
  },
}));
