import { useState } from 'react';
import { Search, Repeat, BookPlus, ScanLine, Loader2 } from 'lucide-react';
import { api } from '../../api.js';
import { useData } from '../../hooks/useFetch.js';
import { useToast } from '../../context/ToastContext.jsx';
import {
  Button, Select, Modal, Badge, Spinner, ErrorState, EmptyState, Pagination,
} from '../../components/ui.jsx';

function fmtDate(d) {
  return d ? new Date(d.replace(' ', 'T')).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

export default function AdminBorrowing() {
  const toast = useToast();
  const [tab, setTab] = useState('borrowed'); // borrowed | overdue | returned | all
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');

  const { data, loading, error, refetch } = useData(
    () => api.records({ status: tab === 'all' ? '' : tab, page, limit: 10, q }),
    [tab, page, q]
  );

  // Issue-book modal state
  const [issueOpen, setIssueOpen] = useState(false);
  const students = useData(() => (issueOpen ? api.users({ limit: 100, role: 'student', status: 'active' }) : Promise.resolve(null)), [issueOpen]);
  const booksAvail = useData(() => (issueOpen ? api.books({ limit: 60, availability: 'available' }) : Promise.resolve(null)), [issueOpen]);
  const [issueForm, setIssueForm] = useState({ user_id: '', book_id: '' });
  const [issueBusy, setIssueBusy] = useState(false);

  const [returningId, setReturningId] = useState(null);
  const [sweepBusy, setSweepBusy] = useState(false);

  const tabs = [
    { key: 'borrowed', label: 'Borrowed' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'returned', label: 'Returned' },
    { key: 'all', label: 'All records' },
  ];

  const issue = async (e) => {
    e.preventDefault();
    if (!issueForm.user_id || !issueForm.book_id) {
      toast.error('Select both a student and a book.');
      return;
    }
    setIssueBusy(true);
    try {
      const res = await api.issueBook(Number(issueForm.book_id), Number(issueForm.user_id));
      toast.success(`Issued "${res.record.title}" — due ${fmtDate(res.record.due_date)}.`);
      setIssueOpen(false);
      setIssueForm({ user_id: '', book_id: '' });
      refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIssueBusy(false);
    }
  };

  const markReturned = async (r) => {
    setReturningId(r.id);
    try {
      const res = await api.returnBook(r.id);
      if (res.fine) {
        toast.error(`Returned ${res.days_overdue} day(s) late — fine of ${res.fine.amount} recorded as unpaid.`);
      } else {
        toast.success(`"${r.title}" marked as returned.`);
      }
      refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setReturningId(null);
    }
  };

  const runOverdueSweep = async () => {
    setSweepBusy(true);
    try {
      const res = await api.overdueCheck();
      toast.info(`Checked ${res.checked} overdue loan(s); ${res.created} fine notice(s) created.`);
      refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSweepBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Borrowing management</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Issue books at the desk, record returns, and track overdue loans.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={runOverdueSweep} disabled={sweepBusy}>
            {sweepBusy ? <Loader2 size={14} className="animate-spin" /> : <ScanLine size={14} />} Overdue check
          </Button>
          <Button onClick={() => setIssueOpen(true)}><BookPlus size={16} /> Issue book</Button>
        </div>
      </div>

      {/* Tabs + search */}
      <div className="card flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
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
          <input className="input pl-9" placeholder="Search book or student…" value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
      </div>

      {loading ? <Spinner /> : error ? <ErrorState message={error.message} onRetry={refetch} /> : data.records.length === 0 ? (
        <div className="card"><EmptyState icon={Repeat} title="No records here" hint="Try another tab or clear the search." /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left dark:border-slate-800">
              <tr className="table-head">
                <th className="px-4 py-3">Book</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Borrowed</th>
                <th className="px-4 py-3">Due date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.records.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <p className="max-w-52 truncate font-medium">{r.title}</p>
                    <p className="max-w-52 truncate text-xs text-slate-400">{r.author}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.borrower_name}</p>
                    <p className="font-mono text-xs text-slate-400">{r.student_id || r.borrower_email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{fmtDate(r.borrowed_at)}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{fmtDate(r.due_date)}</td>
                  <td className="px-4 py-3">
                    {r.status === 'RETURNED'
                      ? <Badge tone="green">Returned {fmtDate(r.returned_at)}</Badge>
                      : r.is_overdue
                        ? <Badge tone="red">{r.overdue_days}d overdue</Badge>
                        : <Badge tone="blue">On time</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.status === 'BORROWED' && (
                      <Button size="sm" variant={r.is_overdue ? 'success' : 'outline'} onClick={() => markReturned(r)} disabled={returningId === r.id}>
                        {returningId === r.id && <Loader2 size={13} className="animate-spin" />} Mark returned
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={data.page} pages={data.pages} onPage={setPage} />
        </div>
      )}

      {/* Issue modal */}
      <Modal open={issueOpen} onClose={() => setIssueOpen(false)} title="Issue a book">
        <form onSubmit={issue} className="space-y-4">
          <Select label="Student" value={issueForm.user_id} onChange={(e) => setIssueForm({ ...issueForm, user_id: e.target.value })}>
            <option value="">— Select a student —</option>
            {(students.data?.users || []).map((u) => (
              <option key={u.id} value={u.id}>{u.full_name} ({u.student_id || u.email})</option>
            ))}
          </Select>
          <Select label="Book (available copies only)" value={issueForm.book_id} onChange={(e) => setIssueForm({ ...issueForm, book_id: e.target.value })}>
            <option value="">— Select a book —</option>
            {(booksAvail.data?.books || []).map((b) => (
              <option key={b.id} value={b.id}>{b.title} — {b.available_copies} available</option>
            ))}
          </Select>
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            The due date is calculated automatically from the borrow period set in Settings.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIssueOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={issueBusy}>{issueBusy ? 'Issuing…' : 'Issue book'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
