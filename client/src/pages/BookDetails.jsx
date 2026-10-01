import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BookOpen, Building2, Calendar, Barcode, Tag, BookCopy, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '../api.js';
import { useData } from '../hooks/useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import BookCard from '../components/BookCard.jsx';
import { Spinner, ErrorState, EmptyState, Badge, Button } from '../components/ui.jsx';

export default function BookDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [borrowing, setBorrowing] = useState(false);
  const { data, loading, error, refetch } = useData(() => api.book(id), [id]);

  if (loading) return <Spinner />;
  if (error) return <div className="mx-auto max-w-7xl px-4 py-10"><ErrorState message={error.message} onRetry={refetch} /></div>;

  const { book, related } = data;
  const available = book.available_copies > 0;

  const borrow = async () => {
    setBorrowing(true);
    try {
      await api.borrow(book.id);
      toast.success(`You borrowed "${book.title}". Due in 14 days.`);
      refetch();
    } catch (e) {
      if (e.status === 401) {
        toast.info('Please sign in to borrow books.');
      } else {
        toast.error(e.message);
      }
    } finally {
      setBorrowing(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Link to="/catalog" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600 dark:text-slate-400">
        <ArrowLeft size={15} /> Back to catalog
      </Link>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        {/* Cover */}
        <div>
          <div className="card flex h-80 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-850">
            {book.cover_url ? (
              <img src={book.cover_url} alt={`Cover of ${book.title}`} className="h-full w-auto object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            ) : (
              <BookOpen className="text-slate-400" size={48} />
            )}
          </div>
        </div>

        {/* Info */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="blue">{book.category_name || 'General'}</Badge>
            {available
              ? <Badge tone="green"><CheckCircle2 size={12} /> Available · {book.available_copies} of {book.total_copies} copies</Badge>
              : <Badge tone="red"><XCircle size={12} /> All copies borrowed</Badge>}
            {book.is_featured ? <Badge tone="amber">Featured</Badge> : null}
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{book.title}</h1>
          <p className="mt-1 text-lg text-slate-500 dark:text-slate-400">by {book.author}</p>

          {book.description && (
            <p className="mt-4 max-w-3xl leading-relaxed text-slate-600 dark:text-slate-300">{book.description}</p>
          )}

          <dl className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {[
              { icon: Barcode, label: 'ISBN', value: book.isbn },
              { icon: Building2, label: 'Publisher', value: book.publisher || '—' },
              { icon: Calendar, label: 'Publication year', value: book.publication_year || '—' },
              { icon: Tag, label: 'Category', value: book.category_name || '—' },
              { icon: BookCopy, label: 'Total copies', value: book.total_copies },
              { icon: BookCopy, label: 'Available copies', value: book.available_copies },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-3">
                <span className="rounded-lg bg-slate-100 p-2 text-slate-500 dark:bg-slate-800 dark:text-slate-400"><row.icon size={15} /></span>
                <div>
                  <dt className="text-xs text-slate-400">{row.label}</dt>
                  <dd className="text-sm font-medium">{row.value}</dd>
                </div>
              </div>
            ))}
          </dl>

          <div className="mt-8 flex flex-wrap gap-3">
            {available ? (
              user ? (
                <Button size="lg" onClick={borrow} disabled={borrowing}>
                  {borrowing ? 'Borrowing…' : 'Borrow this book'}
                </Button>
              ) : (
                <Button size="lg" to="/login" state={{ from: `/books/${book.id}` }}>Sign in to borrow</Button>
              )
            ) : (
              <Button size="lg" disabled>All copies are borrowed</Button>
            )}
            <Button size="lg" variant="outline" to="/catalog">Continue browsing</Button>
          </div>
        </div>
      </div>

      {/* Related */}
      {related && related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-xl font-bold tracking-tight">Related books</h2>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((b) => <BookCard key={b.id} book={b} />)}
          </div>
        </section>
      )}
    </div>
  );
}
