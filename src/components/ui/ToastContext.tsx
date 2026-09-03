import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = 'toast-' + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const toastMethods = {
    success: (msg: string, dur?: number) => addToast('success', msg, dur),
    error: (msg: string, dur?: number) => addToast('error', msg, dur),
    info: (msg: string, dur?: number) => addToast('info', msg, dur),
  };

  return (
    <ToastContext.Provider value={{ toast: toastMethods }}>
      {children}
      {/* Accessible Toast Container */}
      <div
        role="region"
        aria-label="Notifications"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none p-2"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-lg backdrop-blur-md ${
                t.type === 'success'
                  ? 'bg-emerald-50/95 border-emerald-200 text-emerald-900'
                  : t.type === 'error'
                  ? 'bg-rose-50/95 border-rose-200 text-rose-900'
                  : 'bg-indigo-50/95 border-indigo-200 text-indigo-900'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {t.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />}
                {t.type === 'error' && <AlertCircle className="h-4 w-4 text-rose-600" aria-hidden="true" />}
                {t.type === 'info' && <Info className="h-4 w-4 text-indigo-600" aria-hidden="true" />}
              </div>

              <div className="flex-1 text-xs font-semibold leading-snug">
                {t.message}
              </div>

              <button
                type="button"
                onClick={() => removeToast(t.id)}
                aria-label="Dismiss notification"
                className="shrink-0 p-1 rounded-md text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Safe fallback for isolated components or unit tests
    return {
      success: (msg: string) => {
        if (process.env.NODE_ENV === 'test') {
          // no-op in tests
        }
      },
      error: (msg: string) => {
        if (process.env.NODE_ENV === 'test') {
          // no-op in tests
        }
      },
      info: (msg: string) => {
        if (process.env.NODE_ENV === 'test') {
          // no-op in tests
        }
      },
    };
  }
  return context.toast;
};
