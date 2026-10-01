import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, X, Inbox, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';

/** Button with variants; renders as internal link when `to` is passed. */
export function Button({ variant = 'primary', size = 'md', to, className = '', children, ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-base' };
  const variants = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 focus:ring-brand-500',
    secondary: 'bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 focus:ring-slate-400',
    outline: 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus:ring-slate-400',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500',
    ghost: 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:ring-slate-400',
  };
  const cls = `${base} ${sizes[size]} ${variants[variant]} ${className}`;
  if (to) return <Link to={to} className={cls} {...props}>{children}</Link>;
  return <button className={cls} {...props}>{children}</button>;
}

export function Input({ label, error, className = '', ...props }) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      <input className={`input ${error ? 'border-rose-500' : ''} ${className}`} {...props} />
      {error && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}

export function Select({ label, children, className = '', ...props }) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      <select className={`input ${className}`} {...props}>{children}</select>
    </div>
  );
}

export function Textarea({ label, className = '', ...props }) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      <textarea className={`input ${className}`} {...props} />
    </div>
  );
}

export function Badge({ tone = 'slate', children }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    red: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
    blue: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
  };
  return <span className={`badge ${tones[tone] || tones.slate}`}>{children}</span>;
}

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-slate-500 dark:text-slate-400">
      <Loader2 className="animate-spin" size={20} />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-slate-100 dark:bg-slate-800 p-4 text-slate-400">
        <Icon size={28} />
      </div>
      <h3 className="mt-4 font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
      {hint && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-rose-100 dark:bg-rose-950 p-4 text-rose-500">
        <AlertTriangle size={28} />
      </div>
      <h3 className="mt-4 font-semibold text-slate-800 dark:text-slate-200">Something went wrong</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{message || 'Please try again in a moment.'}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>Try again</Button>
      )}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/50" onClick={onClose} />
      <div className={`card relative z-10 w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto p-6`} role="dialog" aria-modal="true">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', tone = 'danger', busy }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant={tone} onClick={onConfirm} disabled={busy}>
          {busy && <Loader2 size={14} className="animate-spin" />} {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

export function Pagination({ page, pages, onPage }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-4 py-3">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <ChevronLeft size={14} /> Prev
      </Button>
      <span className="text-sm text-slate-500 dark:text-slate-400">Page {page} of {pages}</span>
      <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next <ChevronRight size={14} />
      </Button>
    </div>
  );
}

export function DashboardCard({ icon: Icon, label, value, sub, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300',
    red: 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-300',
  };
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`rounded-lg p-3 ${tones[tone]}`}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}
