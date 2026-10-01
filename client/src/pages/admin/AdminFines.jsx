import { useState } from 'react';
import { Search, Wallet, CircleCheck, CircleX, Loader2 } from 'lucide-react';
import { api } from '../../api.js';
import { useData } from '../../hooks/useFetch.js';
import { useToast } from '../../context/ToastContext.jsx';
import {
  Button, DashboardCard, Badge, Spinner, ErrorState, EmptyState, Pagination, ConfirmDialog,
} from '../../components/ui.jsx';

function fmtDate(d) {
  return d ? new Date(d.replace(' ', 'T')).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

export default function AdminFines() {
  const toast = useToast();
  const [tab, setTab] = useState('unpaid');
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState(null);

  const { data, loading, error, refetch } = useData(
    () => api.fines({ status: tab === 'all' ? '' : tab, page, limit: 10, q }),
    [tab, page, q]
  );

  const [payAll, setPayAll] = useState(null);
  const [payAllBusy, setPayAllBusy] = useState(false);

  const act = async (fine, action) => {
    setBusyId(fine.id);
    try {
      if (action === 'pay') {
        await api.payFine(fine.id);
        toast.success(`Fine of ${fine.amount} for ${fine.borrower_name} marked as paid.`);
      } else {
        await api.unpayFine(fine.id);
        toast.info(`Fine of ${fine.amount} reverted to unpaid.`);
      }
      refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const settleAll = async () => {
    setPayAllBusy(true);
    try {
      const res = await api.payAllFines(payAll.user_id);
      toast.success(`${res.paid} fine(s) settled for ${payAll.borrower_name}.`);
      setPayAll(null);
      refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPayAllBusy(false);
    }
  };

  const tabs = [
    { key: 'unpaid', label: 'Unpaid' },
    { key: 'paid', label: 'Paid' },
    { key: 'all', label: 'All' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Fine management</h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Fines are calculated automatically on return: overdue days × fine per day (configurable in Settings).
        </p>
      </div>

      {/* Summary */}
      {data?.summary && (
        <div className="grid gap-4 sm:grid-cols-3">
          <DashboardCard icon={Wallet} tone="amber" label="Outstanding (unpaid)" value={data.summary.unpaid_total} sub={`${data.summary.unpaid_count || 0} open fine(s)`} />
          <DashboardCard icon={CircleCheck} tone="green" label="Collected (paid)" value={data.summary.paid_total} />
          <DashboardCard icon={CircleX} tone="red" label="Fine records" value={data.total} sub="All time" />
        </div>
      )}

      {/* Tabs + search */}
      <div className="card flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setPage(1); }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition
                ${tab === t.key ? 'bg-white shadow-sm dark:bg-slate-900' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Search size={15} /></span>
          <input className="input pl-9" placeholder="Search student, ID or book…" value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
      </div>

      {loading ? <Spinner /> : error ? <ErrorState message={error.message} onRetry={refetch} /> : data.fines.length === 0 ? (
        <div className="card"><EmptyState icon={Wallet} title="No fines here" hint="Fines appear automatically when overdue books are returned." /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left dark:border-slate-800">
              <tr className="table-head">
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Book</th>
                <th className="px-4 py-3">Overdue</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.fines.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <p className="font-medium">{f.borrower_name}</p>
                    <p className="font-mono text-xs text-slate-400">{f.student_id || f.borrower_email}</p>
                  </td>
                  <td className="max-w-52 truncate px-4 py-3 text-slate-500 dark:text-slate-400">{f.book_title}</td>
                  <td className="px-4 py-3">{f.days_overdue} days</td>
                  <td className="px-4 py-3 font-semibold">{f.amount}</td>
                  <td className="px-4 py-3">
                    {f.status === 'PAID'
                      ? <Badge tone="green">Paid {f.paid_at ? `· ${fmtDate(f.paid_at)}` : ''}</Badge>
                      : <Badge tone="red">Unpaid</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      {f.status === 'UNPAID' ? (
                        <>
                          <Button size="sm" variant="success" onClick={() => act(f, 'pay')} disabled={busyId === f.id}>
                            {busyId === f.id && <Loader2 size={13} className="animate-spin" />} Mark paid
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setPayAll({ user_id: f.user_id, borrower_name: f.borrower_name })}>
                            Settle all
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => act(f, 'unpay')} disabled={busyId === f.id}>
                          Revert
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={data.page} pages={data.pages} onPage={setPage} />
        </div>
      )}

      <ConfirmDialog
        open={Boolean(payAll)}
        onClose={() => setPayAll(null)}
        onConfirm={settleAll}
        busy={payAllBusy}
        tone="success"
        title="Settle all fines"
        message={`Mark ALL unpaid fines for ${payAll?.borrower_name} as paid?`}
        confirmLabel="Settle all"
      />
    </div>
  );
}
