import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { BarChart3, Download } from 'lucide-react';
import { api } from '../../api.js';
import { useData } from '../../hooks/useFetch.js';
import { Badge, Spinner, ErrorState, Button } from '../../components/ui.jsx';

function fmtDate(d) {
  return d ? new Date(d.replace(' ', 'T')).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

function toCSV(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
}

function downloadCSV(name, rows) {
  const blob = new Blob([toCSV(rows)], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminReports() {
  const { data, loading, error, refetch } = useData(() => api.reports(), []);
  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;

  const { mostBorrowed, mostActive, monthly, overdue, summary } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Reports & analytics</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Insights across the entire library, exportable to CSV.</p>
        </div>
        <Button variant="outline" size="sm"
          onClick={() => downloadCSV('library-monthly-report', monthly.map((m) => ({ month: m.ym, borrows: m.borrow_count, returns: m.return_count })))}>
          <Download size={14} /> Export monthly CSV
        </Button>
      </div>

      {/* Summary strip */}
      <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {[
          ['Total titles', summary.totalBooks],
          ['Available copies', summary.availableBooks],
          ['Total borrows', summary.totalBorrows],
          ['Returned', summary.returned],
          ['Fines collected', `${summary.fines.paid} / ${summary.fines.paid + summary.fines.unpaid}`],
        ].map(([label, value]) => (
          <div key={label} className="card p-4 text-center">
            <p className="text-xl font-bold">{value}</p>
            <p className="mt-0.5 text-xs text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Monthly chart */}
      <div className="card p-5">
        <h2 className="font-semibold">Monthly borrowing & returns (all time)</h2>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthly.map((m) => ({
              month: new Date(`${m.ym}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
              borrowed: m.borrow_count,
              returned: m.return_count,
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="currentColor" className="text-slate-400" />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="currentColor" className="text-slate-400" width={28} />
              <Tooltip contentStyle={{ borderRadius: 10, fontSize: 13 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="borrowed" stroke="#274de3" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="returned" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Most borrowed */}
        <div className="card">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <h2 className="font-semibold">Most borrowed books</h2>
            <button className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
              onClick={() => downloadCSV('most-borrowed-books', mostBorrowed)}>Export</button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {mostBorrowed.map((b, i) => (
              <div key={b.id} className="flex items-center gap-3 px-5 py-2.5">
                <span className="w-5 text-sm font-bold text-slate-300 dark:text-slate-600">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{b.title}</p>
                  <p className="truncate text-xs text-slate-400">{b.author}</p>
                </div>
                <span className="text-sm font-semibold">{b.borrow_count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Most active students */}
        <div className="card">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <h2 className="font-semibold">Most active students</h2>
            <button className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
              onClick={() => downloadCSV('most-active-students', mostActive)}>Export</button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {mostActive.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3 px-5 py-2.5">
                <span className="w-5 text-sm font-bold text-slate-300 dark:text-slate-600">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.full_name}</p>
                  <p className="font-mono text-xs text-slate-400">{s.student_id}</p>
                </div>
                <span className="text-sm text-slate-400">{s.currently_borrowed} now ·</span>
                <span className="text-sm font-semibold">{s.borrow_count} total</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Overdue table */}
      <div className="card">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="font-semibold">Currently overdue ({overdue.length})</h2>
          <button className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
            onClick={() => downloadCSV('overdue-books', overdue)}>Export</button>
        </div>
        {overdue.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">No overdue books right now. 🎉</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left dark:border-slate-800">
                <tr className="table-head">
                  <th className="px-5 py-2.5">Student</th>
                  <th className="px-5 py-2.5">Book</th>
                  <th className="px-5 py-2.5">Due date</th>
                  <th className="px-5 py-2.5">Days overdue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {overdue.map((o) => (
                  <tr key={o.id}>
                    <td className="px-5 py-2.5">
                      <p className="font-medium">{o.borrower_name}</p>
                      <p className="font-mono text-xs text-slate-400">{o.student_id}</p>
                    </td>
                    <td className="max-w-56 truncate px-5 py-2.5 text-slate-500 dark:text-slate-400">{o.title}</td>
                    <td className="px-5 py-2.5 text-slate-500 dark:text-slate-400">{fmtDate(o.due_date)}</td>
                    <td className="px-5 py-2.5"><Badge tone="red">{o.days_overdue} days</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
