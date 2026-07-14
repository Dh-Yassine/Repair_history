import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  push: (message: string, kind?: ToastKind) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4200);
  }, []);

  const value: ToastContextValue = {
    push,
    success: (m) => push(m, 'success'),
    error: (m) => push(m, 'error'),
    info: (m) => push(m, 'info'),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <ToastItemView key={t.id} toast={t} onClose={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItemView({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const { t } = useLanguage();

  useEffect(() => {
    const id = setTimeout(onClose, 4200);
    return () => clearTimeout(id);
  }, [onClose]);

  const Icon = toast.kind === 'success' ? CheckCircle2 : toast.kind === 'error' ? AlertTriangle : Info;

  return (
    <motion.div
      className={`toast ${toast.kind}`}
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      role="status"
    >
      <Icon size={18} className="toast-icon" />
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        type="button"
        className="toast-dismiss"
        onClick={onClose}
        aria-label={t('common.dismiss')}
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}
