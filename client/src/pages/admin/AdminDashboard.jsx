import {
  BookOpen, BookMarked, Repeat, Users, AlertTriangle, Wallet, RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { api } from '../../api.js';
import { useData } from '../../hooks/useFetch.js';
import { DashboardCard, Badge, Spinner, ErrorState, Button } from '../../components/ui.jsx';

const PIE_COLORS = ['#274de3', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', '#64748b', '#14b8a6'];

function fmtDate(d) {
  return d ? new Date(d.replace(' ', 'T')).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
}

export default function AdminDashboard() {
  const { data, loading, error, refetch } = useData(() => api.dashboardStats(), []);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;

  const { stats, recent, popular, chart, categories } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Library overview</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Live statistics across the whole collection.</p>
        </div>
        <Button variant="outline" size="sm" onClick={refetch}><RefreshCw size={14} /> Refresh</Button>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <DashboardCard icon={BookOpen} tone="brand" label="Total copies" value={stats.totalBooks} sub={`${stats.totalTitles} distinct titles`} />
        <DashboardCard icon={BookMarked} tone="green" label="Available on shelf" value={stats.availableBooks} />
        <DashboardCard icon={Repeat} tone="violet" label="Currently borrowed" value={stats.borrowedBooks} />
        <DashboardCard icon={AlertTriangle} tone={stats.overdueBooks ? 'red' : 'green'} label="Overdue books" value={stats.overdueBooks}
          sub={stats.overdueBooks ? 'Action needed' : 'All on time'} />
        <DashboardCard icon={Users} tone="brand" label="Registered students" value={stats.totalStudents} sub={`${stats.activeStudents} active`} />
        <DashboardCard icon={Wallet} tone="amber" label="Unpaid fines" value={stats.unpaidFines} sub={`${stats.collectedFines} collected`} />
      </div>

      {/* Charts */}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="card p-5 xl:col-span-2">
          <h2 className="font-semibold">Borrowing activity — last 6 months</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="currentColor" className="text-slate-400" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="currentColor" className="text-slate-400" width={28} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="borrow_count" name="Borrowed" fill="#274de3" radius={[4, 4, 0, 0]} maxBarSize={38} />
                <Bar dataKey="return_count" name="Returned" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={38} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold">Collection by category</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categories} dataKey="book_count" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {categories.map((c, i) => <Cell key={c.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Popular books */}
        <div className="card">
          <h2 className="border-b border-slate-200 px-5 py-4 font-semibold dark:border-slate-800">Most popular books</h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {popular.map((b, i) => (
              <div key={b.id} className="flex items-center gap-3 px-5 py-3">
                <span className="w-5 text-sm font-bold text-slate-300 dark:text-slate-600">{i + 1}</span>
                <div className="h-10 w-7 shrink-0 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                  {b.cover_url && <img src={b.cover_url} alt="" className="h-full w-full object-cover" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{b.title}</p>
                  <p className="truncate text-xs text-slate-400">{b.author}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{b.borrow_count}</p>
                  <p className="text-[11px] text-slate-400">borrows</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent transactions */}
        <div className="card">
          <h2 className="border-b border-slate-200 px-5 py-4 font-semibold dark:border-slate-800">Recent transactions</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left dark:border-slate-800">
                <tr className="table-head">
                  <th className="px-5 py-2.5">Student</th>
                  <th className="px-5 py-2.5">Book</th>
                  <th className="px-5 py-2.5">Date</th>
                  <th className="px-5 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recent.map((r) => (
                  <tr key={r.id}>
                    <td className="max-w-32 truncate px-5 py-2.5 font-medium">{r.borrower_name}</td>
                    <td className="max-w-44 truncate px-5 py-2.5 text-slate-500 dark:text-slate-400">{r.title}</td>
                    <td className="px-5 py-2.5 text-slate-500 dark:text-slate-400">{fmtDate(r.borrowed_at)}</td>
                    <td className="px-5 py-2.5">
                      {r.status === 'RETURNED'
                        ? <Badge tone="green">Returned</Badge>
                        : r.is_overdue ? <Badge tone="red">Overdue</Badge> : <Badge tone="blue">Borrowed</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
