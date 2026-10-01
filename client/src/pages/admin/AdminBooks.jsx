import { useState } from 'react';
import { Plus, Pencil, Trash2, Search, BookMarked } from 'lucide-react';
import { api } from '../../api.js';
import { useData } from '../../hooks/useFetch.js';
import { useToast } from '../../context/ToastContext.jsx';
import {
  Button, Input, Select, Textarea, Modal, ConfirmDialog, Badge, Spinner, ErrorState, EmptyState, Pagination,
} from '../../components/ui.jsx';

const EMPTY = {
  title: '', author: '', isbn: '', category_id: '', publisher: '', publication_year: '',
  description: '', total_copies: 1, available_copies: 1, cover_url: '', is_featured: false,
};

export default function AdminBooks() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [availability, setAvailability] = useState('');

  const filters = useData(() => api.bookFilters(), []);
  const { data, loading, error, refetch } = useData(
    () => api.books({ page, limit: 10, q, category, availability }),
    [page, q, category, availability]
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = create
  const [form, setForm] = useState(EMPTY);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setFormErrors({}); setModalOpen(true); };
  const openEdit = (book) => {
    setEditing(book);
    setForm({
      title: book.title, author: book.author, isbn: book.isbn,
      category_id: book.category_id || '', publisher: book.publisher || '',
      publication_year: book.publication_year || '', description: book.description || '',
      total_copies: book.total_copies, available_copies: book.available_copies,
      cover_url: book.cover_url || '', is_featured: Boolean(book.is_featured),
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const errs = {};
    if (form.title.trim().length < 2) errs.title = 'Title is required.';
    if (form.author.trim().length < 2) errs.author = 'Author is required.';
    const digits = form.isbn.replace(/[-\s]/g, '');
    if (!/^\d{9}[\dxX]$|^\d{13}$/.test(digits)) errs.isbn = 'Enter a valid ISBN-10 or ISBN-13.';
    if (form.publication_year && (Number(form.publication_year) < 1500 || Number(form.publication_year) > 2100)) {
      errs.publication_year = 'Year must be between 1500 and 2100.';
    }
    if (Number(form.total_copies) < 1) errs.total_copies = 'Total copies must be at least 1.';
    if (Number(form.available_copies) < 0) errs.available_copies = 'Available copies cannot be negative.';
    if (Number(form.available_copies) > Number(form.total_copies)) errs.available_copies = 'Available cannot exceed total copies.';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const payload = {
      ...form,
      category_id: form.category_id ? Number(form.category_id) : null,
      publication_year: form.publication_year ? Number(form.publication_year) : null,
      total_copies: Number(form.total_copies),
      available_copies: Number(form.available_copies),
      cover_url: form.cover_url.trim() || null,
    };
    try {
      if (editing) {
        await api.updateBook(editing.id, payload);
        toast.success(`"${form.title}" updated.`);
      } else {
        await api.createBook(payload);
        toast.success(`"${form.title}" added to the catalog.`);
      }
      setModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(err.message);
      if (err.details) setFormErrors(Object.fromEntries(err.details.map((d) => [d, d])));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.deleteBook(deleting.id);
      toast.success(`"${deleting.title}" deleted.`);
      setDeleting(null);
      refetch();
    } catch (err) {
      toast.error(err.message);
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Book management</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {data ? `${data.total} titles in the catalog` : 'Loading…'}
          </p>
        </div>
        <Button onClick={openCreate}><Plus size={16} /> Add book</Button>
      </div>

      {/* Filters */}
      <div className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Search size={15} /></span>
          <input className="input pl-9" placeholder="Search title, author, ISBN…" value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
          <option value="">All categories</option>
          {(filters.data?.categories || []).map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </Select>
        <Select value={availability} onChange={(e) => { setAvailability(e.target.value); setPage(1); }}>
          <option value="">Any availability</option>
          <option value="available">Available</option>
          <option value="unavailable">Fully borrowed</option>
        </Select>
      </div>

      {loading ? <Spinner /> : error ? <ErrorState message={error.message} onRetry={refetch} /> : data.books.length === 0 ? (
        <div className="card"><EmptyState icon={BookMarked} title="No books found" hint="Adjust the filters or add a new book." /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left dark:border-slate-800">
              <tr className="table-head">
                <th className="px-4 py-3">Book</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">ISBN</th>
                <th className="px-4 py-3">Copies</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.books.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-7 shrink-0 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                        {b.cover_url && <img src={b.cover_url} alt="" className="h-full w-full object-cover" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                      </div>
                      <div className="min-w-0">
                        <p className="max-w-56 truncate font-medium">{b.title}</p>
                        <p className="max-w-56 truncate text-xs text-slate-400">{b.author}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{b.category_name || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{b.isbn}</td>
                  <td className="px-4 py-3">{b.available_copies} / {b.total_copies}</td>
                  <td className="px-4 py-3">
                    {b.available_copies > 0 ? <Badge tone="green">Available</Badge> : <Badge tone="red">All out</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(b)} aria-label={`Edit ${b.title}`}>
                        <Pencil size={15} />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950" onClick={() => setDeleting(b)} aria-label={`Delete ${b.title}`}>
                        <Trash2 size={15} />
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

      {/* Create / edit modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit “${editing.title}”` : 'Add a new book'} wide>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2" noValidate>
          <div className="sm:col-span-2">
            <Input label="Title *" value={form.title} error={formErrors.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <Input label="Author *" value={form.author} error={formErrors.author}
            onChange={(e) => setForm({ ...form, author: e.target.value })} />
          <Input label="ISBN *" value={form.isbn} error={formErrors.isbn} placeholder="978…"
            onChange={(e) => setForm({ ...form, isbn: e.target.value })} />
          <Select label="Category" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
            <option value="">— None —</option>
            {(filters.data?.categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Input label="Publisher" value={form.publisher}
            onChange={(e) => setForm({ ...form, publisher: e.target.value })} />
          <Input label="Publication year" type="number" value={form.publication_year} error={formErrors.publication_year}
            onChange={(e) => setForm({ ...form, publication_year: e.target.value })} />
          <Input label="Cover image URL" placeholder="https://…" value={form.cover_url}
            onChange={(e) => setForm({ ...form, cover_url: e.target.value })} />
          <div className="sm:col-span-2">
            <Textarea label="Description" rows={3} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <Input label="Total copies *" type="number" min="1" value={form.total_copies} error={formErrors.total_copies}
            onChange={(e) => setForm({ ...form, total_copies: e.target.value })} />
          <Input label="Available copies *" type="number" min="0" value={form.available_copies} error={formErrors.available_copies}
            onChange={(e) => setForm({ ...form, available_copies: e.target.value })} />
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={form.is_featured} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} />
            Show on the home page as a featured book
          </label>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add book'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        busy={deleteBusy}
        title="Delete book"
        message={`Delete "${deleting?.title}"? This also removes its borrowing history. This action cannot be undone.`}
        confirmLabel="Delete book"
      />
    </div>
  );
}
