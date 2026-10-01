import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);
let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((message, type = 'success') => {
    const id = nextId++;
    setToasts((list) => [...list, { id, message, type }]);
    setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  const toast = {
    success: (m) => push(m, 'success'),
    error: (m) => push(m, 'error'),
    info: (m) => push(m, 'info'),
  };

  const styles = {
    success: 'border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/60',
    error: 'border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/60',
    info: 'border-sky-300 dark:border-sky-700 text-sky-800 dark:text-sky-200 bg-sky-50 dark:bg-sky-950/60',
  };
  const icons = {
    success: <CheckCircle2 size={18} className="shrink-0" />,
    error: <AlertCircle size={18} className="shrink-0" />,
    info: <Info size={18} className="shrink-0" />,
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg animate-[fadeIn_.15s_ease-out] ${styles[t.type]}`}
            role="status"
          >
            {icons[t.type]}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="opacity-60 hover:opacity-100" aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
