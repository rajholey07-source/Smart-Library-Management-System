import { useState } from 'react';
import { CalendarClock, AlertTriangle, BookOpen, Loader2 } from 'lucide-react';
import { api } from '../api.js';
import { useData } from '../hooks/useFetch.js';
import { useToast } from '../context/ToastContext.jsx';
import { Badge, Button, Spinner, ErrorState, EmptyState, Select } from '../components/ui.jsx';

function fmtDate(d) {
  return d ? new Date(d.replace(' ', 'T')).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

export default function MyBooks() {
  const [status, setStatus] = useState('');
  const toast = useToast();
  const [returningId, setReturningId] = useState(null);
  const { data, loading, error, refetch } = useData(() => api.records(status ? { status } : {}), [status]);

  const returnBook = async (r) => {
    setReturningId(r.id);
    try {
      const res = await api.returnBook(r.id);
      if (res.fine) {
        toast.error(`Book returned ${res.days_overdue} day(s) late — a fine of ${res.fine.amount} was added.`);
      } else {
        toast.success(`"${r.title}" returned on time. Thank you!`);
      }
      refetch();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setReturningId(null);
    }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;

  const records = data.records;
  const active = records.filter((r) => r.status === 'BORROWED');
  const history = records.filter((r) => r.status === 'RETURNED');

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My books</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage your current loans and view your borrowing history.</p>

      {/* Current loans */}
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-bold tracking-tight">Currently borrowed ({active.length})</h2>
        {active.length === 0 ? (
          <div className="card">
            <EmptyState icon={BookOpen} title="Nothing borrowed right now"
              hint="Books you borrow will appear here with their due dates."
              action={<Button to="/catalog">Browse catalog</Button>} />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {active.map((r) => (
              <div key={r.id} className="card flex gap-4 p-4">
                <div className="h-24 w-16 shrink-0 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                  {r.cover_url
                    ? <img src={r.cover_url} alt="" className="h-full w-full object-cover" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    : <div className="flex h-full items-center justify-center text-slate-400"><BookOpen size={20} /></div>}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 font-semibold leading-snug">{r.title}</h3>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{r.author}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`flex items-center gap-1.5 text-sm ${r.is_overdue ? 'font-medium text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
                      <CalendarClock size={14} />
                      {r.is_overdue ? `${r.overdue_days} day(s) overdue (due ${fmtDate(r.due_date)})` : `Due ${fmtDate(r.due_date)}`}
                    </span>
                    {r.is_overdue && <Badge tone="red"><AlertTriangle size={12} /> Fine accruing</Badge>}
                  </div>
                  <Button
                    size="sm"
                    variant={r.is_overdue ? 'success' : 'outline'}
                    className="mt-3"
                    onClick={() => returnBook(r)}
                    disabled={returningId === r.id}
                  >
                    {returningId === r.id && <Loader2 size={13} className="animate-spin" />}
                    Return book
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* History */}
      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold tracking-tight">Borrowing history</h2>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-44">
            <option value="">All records</option>
            <option value="borrowed">Borrowed only</option>
            <option value="returned">Returned only</option>
          </Select>
        </div>
        {history.length === 0 ? (
          <div className="card"><EmptyState title="No returned books yet" /></div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left dark:border-slate-800">
                <tr className="table-head">
                  <th className="px-4 py-3">Book</th>
                  <th className="px-4 py-3">Borrowed</th>
                  <th className="px-4 py-3">Due date</th>
                  <th className="px-4 py-3">Returned</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {history.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-medium">{r.title}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{fmtDate(r.borrowed_at)}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{fmtDate(r.due_date)}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{fmtDate(r.returned_at)}</td>
                    <td className="px-4 py-3">
                      <Badge tone="green">Returned</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
