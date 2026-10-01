import { Link } from 'react-router-dom';
import {
  BookOpen, BookMarked, CheckCircle2, AlertTriangle, ArrowRight, Sparkles, CalendarClock,
} from 'lucide-react';
import { api } from '../api.js';
import { useData } from '../hooks/useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import BookCard from '../components/BookCard.jsx';
import { DashboardCard, Badge, Spinner, ErrorState, EmptyState, Button } from '../components/ui.jsx';

function fmtDate(d) {
  return d ? new Date(d.replace(' ', 'T')).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const records = useData(() => api.records({ limit: 100 }), []);
  const recs = useData(() => api.recommendations(), []);

  if (records.loading) return <Spinner />;
  if (records.error) return <ErrorState message={records.error.message} onRetry={records.refetch} />;

  const all = records.data.records;
  const active = all.filter((r) => r.status === 'BORROWED');
  const overdue = active.filter((r) => r.is_overdue);
  const returned = all.filter((r) => r.status === 'RETURNED');
  const unpaidFines = all.reduce((sum, r) => sum + (r.unpaid_fine_amount || 0), 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Hello, {user.full_name.split(' ')[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {user.student_id ? `Student ID ${user.student_id} · ` : ''}Here's your library activity.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" to="/profile">Profile settings</Button>
          <Button to="/catalog">Browse catalog</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard icon={BookMarked} tone="brand" label="Currently borrowed" value={active.length} sub={`Limit is 5 books`} />
        <DashboardCard icon={AlertTriangle} tone={overdue.length ? 'red' : 'green'} label="Overdue" value={overdue.length}
          sub={overdue.length ? 'Return soon to avoid fines' : 'All on time — nice!'} />
        <DashboardCard icon={CheckCircle2} tone="green" label="Returned" value={returned.length} sub="All-time completions" />
        <DashboardCard icon={BookOpen} tone="violet" label="Total borrows" value={all.length} sub="Lifetime checkouts" />
      </div>

      {/* Active loans */}
      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-lg font-bold tracking-tight">Currently borrowed</h2>
          <Link to="/my-books" className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
            My books <ArrowRight size={14} />
          </Link>
        </div>
        {active.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={BookOpen}
              title="No books borrowed yet"
              hint="Browse the catalog and borrow your first book — the due date is set automatically."
              action={<Button to="/catalog">Find a book</Button>}
            />
          </div>
        ) : (
          <div className="card divide-y divide-slate-100 dark:divide-slate-800">
            {active.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="h-16 w-12 shrink-0 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                  {r.cover_url && <img src={r.cover_url} alt="" className="h-full w-full object-cover" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                </div>
                <div className="min-w-0 flex-1">
                  <Link to={`/books/${r.book_id}`} className="font-medium hover:text-brand-600 dark:hover:text-brand-400">{r.title}</Link>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{r.author}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <CalendarClock size={14} /> Due {fmtDate(r.due_date)}
                  </p>
                  {r.is_overdue
                    ? <Badge tone="red"><AlertTriangle size={12} /> {r.overdue_days} day(s) overdue</Badge>
                    : <Badge tone="green">On time</Badge>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recommendations */}
      <section className="mt-10">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="text-brand-600 dark:text-brand-400" size={18} />
          <h2 className="text-lg font-bold tracking-tight">Recommended for you</h2>
          <p className="hidden text-sm text-slate-400 sm:block">based on your borrowing history</p>
        </div>
        {recs.loading ? <Spinner /> : recs.error ? (
          <p className="text-sm text-slate-400">{recs.error.message}</p>
        ) : recs.data.books.length === 0 ? (
          <p className="text-sm text-slate-400">Borrow a few books to unlock personalized recommendations.</p>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {recs.data.books.slice(0, 4).map((b) => <BookCard key={b.id} book={b} />)}
          </div>
        )}
      </section>

      {/* Recent history */}
      <section className="mt-10">
        <h2 className="mb-4 text-lg font-bold tracking-tight">Recent borrowing history</h2>
        {all.length === 0 ? (
          <div className="card"><EmptyState icon={BookOpen} title="No history yet" /></div>
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
                {all.slice(0, 8).map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-medium">{r.title}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{fmtDate(r.borrowed_at)}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{fmtDate(r.due_date)}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{r.returned_at ? fmtDate(r.returned_at) : '—'}</td>
                    <td className="px-4 py-3">
                      {r.status === 'RETURNED'
                        ? <Badge tone="green">Returned</Badge>
                        : r.is_overdue
                          ? <Badge tone="red">Overdue</Badge>
                          : <Badge tone="blue">Borrowed</Badge>}
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
