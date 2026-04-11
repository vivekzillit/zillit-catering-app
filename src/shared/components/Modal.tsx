// Modal — glass-style sheet with framer-motion transitions.
//
// Rendered through a React portal to document.body so that `position: fixed`
// escapes every parent stacking context (important because the `.glass`
// class uses backdrop-filter, which creates a containing block for fixed
// children — otherwise the modal is trapped inside the card that opened it).

import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { Glass } from './Glass';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  widthClass?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  widthClass = 'max-w-lg',
  children,
  footer,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <Glass className={clsx('mx-auto', widthClass)}>
              {title ? (
                <header className="flex items-center justify-between border-b hr-soft px-5 py-4">
                  <h2 className="text-base font-semibold">{title}</h2>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </header>
              ) : null}
              <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
              {footer ? (
                <footer className="flex items-center justify-end gap-2 border-t hr-soft px-5 py-3">
                  {footer}
                </footer>
              ) : null}
            </Glass>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
