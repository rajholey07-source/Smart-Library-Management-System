import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import { api } from '../../api.js';
import { useData } from '../../hooks/useFetch.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Button, Input, Spinner, ErrorState } from '../../components/ui.jsx';

export default function AdminSettings() {
  const toast = useToast();
  const { data, loading, error, refetch } = useData(() => api.settings(), []);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        libraryName: data.settings.libraryName || '',
        borrowDays: Number(data.settings.borrowDays || 14),
        maxBooksPerStudent: Number(data.settings.maxBooksPerStudent || 5),
        finePerDay: Number(data.settings.finePerDay || 5),
      });
    }
  }, [data]);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!form) return null;

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.updateSettings(form);
      toast.success('Settings saved — new rules apply to future borrows and returns immediately.');
      refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Library settings</h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          These rules drive due dates, borrow limits and automatic fine calculations.
        </p>
      </div>

      <form onSubmit={save} className="card space-y-5 p-6">
        <h2 className="flex items-center gap-2 font-semibold"><SettingsIcon size={17} /> General rules</h2>

        <Input
          label="Library name"
          value={form.libraryName}
          onChange={(e) => setForm({ ...form, libraryName: e.target.value })}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Borrow period (days)"
            type="number" min="1" max="90"
            value={form.borrowDays}
            onChange={(e) => setForm({ ...form, borrowDays: e.target.value })}
          />
          <Input
            label="Max books per student"
            type="number" min="1" max="20"
            value={form.maxBooksPerStudent}
            onChange={(e) => setForm({ ...form, maxBooksPerStudent: e.target.value })}
          />
          <Input
            label="Fine per overdue day"
            type="number" min="1" max="500"
            value={form.finePerDay}
            onChange={(e) => setForm({ ...form, finePerDay: e.target.value })}
          />
        </div>

        <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
          Example: with a {form.borrowDays}-day borrow period and a fine of {form.finePerDay}/day, a book returned
          3 days late generates a fine of {Number(form.finePerDay) * 3}.
        </p>

        <Button type="submit" disabled={busy}>
          <Save size={15} /> {busy ? 'Saving…' : 'Save settings'}
        </Button>
      </form>

      <div className="card p-6">
        <h2 className="font-semibold">How these rules are applied</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-500 dark:text-slate-400">
          <li>Due dates are set automatically when a book is borrowed (today + borrow period).</li>
          <li>The borrow limit blocks new loans once a student reaches the maximum.</li>
          <li>Fines are generated on return as (days overdue × fine per day) and when running the overdue check.</li>
          <li>Availability counters update automatically on every borrow and return.</li>
        </ul>
      </div>
    </div>
  );
}
