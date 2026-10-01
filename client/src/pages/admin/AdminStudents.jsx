import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Pencil, Eye, UserCheck, UserX, ArrowLeft, Wallet } from 'lucide-react';
import { api } from '../../api.js';
import { useData } from '../../hooks/useFetch.js';
import { useToast } from '../../context/ToastContext.jsx';
import {
  Button, Input, Select, Modal, Badge, Spinner, ErrorState, EmptyState, Pagination,
} from '../../components/ui.jsx';

function fmtDate(d) {
  return d ? new Date(d.replace(' ', 'T')).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

function StudentDetail({ id, onClose }) {
  const { data, loading, error, refetch } = useData(() => api.user(id), [id]);
  const toast = useToast();

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;

  const { user, history, fines } = data;
  const unpaid = fines.filter((f) => f.status === 'UNPAID');

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 font-bold text-white">
          {user.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
        </span>
        <div>
          <p className="font-semibold">{user.full_name}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{user.email} · ID {user.student_id || '—'}</p>
        </div>
        {user.is_active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Deactivated</Badge>}
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
          <p className="text-xl font-bold">{user.active_borrows}</p>
          <p className="text-xs text-slate-400">Borrowed now</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
          <p className="text-xl font-bold">{user.total_borrows}</p>
          <p className="text-xs text-slate-400">Lifetime</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
          <p className="text-xl font-bold text-rose-600 dark:text-rose-400">{unpaid.reduce((s, f) => s + f.amount, 0)}</p>
          <p className="text-xs text-slate-400">Unpaid fines</p>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Borrowing history</h3>
        {history.length === 0 ? <p className="text-sm text-slate-400">No borrows yet.</p> : (
          <div className="card max-h-56 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white text-left dark:bg-slate-900">
                <tr className="table-head">
                  <th className="px-3 py-2">Book</th>
                  <th className="px-3 py-2">Due</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {history.map((h) => (
                  <tr key={h.id}>
                    <td className="max-w-40 truncate px-3 py-2">{h.title}</td>
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{fmtDate(h.due_date)}</td>
                    <td className="px-3 py-2">
                      {h.status === 'RETURNED'
                        ? <Badge tone="green">Returned</Badge>
                        : h.is_overdue ? <Badge tone="red">Overdue</Badge> : <Badge tone="blue">Borrowed</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {unpaid.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <p className="flex items-center gap-2 font-medium"><Wallet size={15} /> {unpaid.length} unpaid fine(s) totalling {unpaid.reduce((s, f) => s + f.amount, 0)}</p>
          <Button size="sm" variant="outline" className="mt-2"
            onClick={async () => {
              try {
                await api.payAllFines(user.id);
                toast.success('All fines marked as paid.');
                refetch();
              } catch (e) { toast.error(e.message); }
            }}>
            Settle all fines
          </Button>
        </div>
      )}
    </div>
  );
}

export default function AdminStudents() {
  const params = useParams();
  const navigate = useNavigate();
  const detailId = params.id ? Number(params.id) : null;

  const toast = useToast();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  const { data, loading, error, refetch } = useData(
    () => api.users({ page, limit: 10, q, status, role: 'student' }),
    [page, q, status]
  );

  const openEdit = (u) => {
    setEditing(u);
    setForm({ full_name: u.full_name, email: u.email, student_id: u.student_id || '' });
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.updateUser(editing.id, {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        student_id: form.student_id.trim() || null,
      });
      toast.success('Student updated.');
      setEditing(null);
      refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (u) => {
    try {
      await api.updateUser(u.id, { is_active: !u.is_active });
      toast.success(`${u.full_name} ${u.is_active ? 'deactivated' : 'reactivated'}.`);
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Student management</h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{data ? `${data.total} registered students` : 'Loading…'}</p>
      </div>

      <div className="card grid gap-3 p-4 sm:grid-cols-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Search size={15} /></span>
          <input className="input pl-9" placeholder="Search name, email, student ID…" value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Deactivated</option>
        </Select>
      </div>

      {loading ? <Spinner /> : error ? <ErrorState message={error.message} onRetry={refetch} /> : data.users.length === 0 ? (
        <div className="card"><EmptyState title="No students found" hint="Try a different search." /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left dark:border-slate-800">
              <tr className="table-head">
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Student ID</th>
                <th className="px-4 py-3">Borrowed</th>
                <th className="px-4 py-3">Unpaid fines</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <p className="font-medium">{u.full_name}</p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{u.student_id || '—'}</td>
                  <td className="px-4 py-3">{u.active_borrows} now · {u.total_borrows} total</td>
                  <td className="px-4 py-3">
                    {u.unpaid_fines > 0
                      ? <span className="font-medium text-rose-600 dark:text-rose-400">{u.unpaid_fines}</span>
                      : <span className="text-slate-400">0</span>}
                  </td>
                  <td className="px-4 py-3">
                    {u.is_active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Deactivated</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/students/${u.id}`)} aria-label={`View ${u.full_name}`}>
                        <Eye size={15} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(u)} aria-label={`Edit ${u.full_name}`}>
                        <Pencil size={15} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={u.is_active ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950' : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950'}
                        onClick={() => toggleActive(u)}
                        aria-label={u.is_active ? `Deactivate ${u.full_name}` : `Reactivate ${u.full_name}`}
                      >
                        {u.is_active ? <UserX size={15} /> : <UserCheck size={15} />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={data.page} pages={data.pages} onPage={setPage} />
        </div>
      )}

      {/* Edit modal */}
      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={`Edit ${editing?.full_name}`}>
        <form onSubmit={save} className="space-y-4">
          <Input label="Full name" value={form.full_name || ''} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <Input label="Email" type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Student ID" value={form.student_id || ''} onChange={(e) => setForm({ ...form, student_id: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button>
          </div>
        </form>
      </Modal>

      {/* Detail modal (route /admin/students/:id) */}
      <Modal
        open={Boolean(detailId)}
        onClose={() => navigate('/admin/students')}
        title="Student details"
      >
        {detailId && <StudentDetail id={detailId} onClose={() => navigate('/admin/students')} />}
        <div className="mt-5">
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/students')}>
            <ArrowLeft size={14} /> Back to list
          </Button>
        </div>
      </Modal>
    </div>
  );
}
