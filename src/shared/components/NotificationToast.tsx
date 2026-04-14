// NotificationToast — floating toast popup when a notification arrives.
// Auto-dismisses after 6 seconds. Shown at the top-right of the viewport.

import { AnimatePresence, motion } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { useNotificationStore } from '@/shared/stores/notificationStore';

export function NotificationToast() {
  const toast = useNotificationStore((s) => s.toast);
  const clearToast = useNotificationStore((s) => s.clearToast);

  return (
    <AnimatePresence>
      {toast ? (
        <motion.div
          key={toast._id}
          initial={{ opacity: 0, y: -20, x: 20 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="fixed right-4 top-4 z-[200] flex max-w-sm items-start gap-3 rounded-2xl border border-green-500/30 bg-slate-900/95 px-4 py-3 shadow-2xl shadow-green-500/10 backdrop-blur-xl"
        >
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-500/20 text-green-400">
            <Bell className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-100">{toast.title}</p>
            {toast.body ? (
              <p className="mt-0.5 text-xs text-slate-300 line-clamp-2">{toast.body}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="flex-shrink-0 rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-slate-200"
            onClick={clearToast}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
