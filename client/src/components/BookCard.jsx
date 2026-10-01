import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from './ui.jsx';

export default function BookCard({ book }) {
  const available = book.available_copies > 0;
  return (
    <Link
      to={`/books/${book.id}`}
      className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex h-44 items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-850 overflow-hidden">
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={`Cover of ${book.title}`}
            className="h-full w-auto max-w-full object-cover"
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <BookOpen className="text-slate-400" size={36} />
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-600 dark:text-brand-400">
          {book.category_name || 'General'}
        </p>
        <h3 className="mt-1 line-clamp-2 font-semibold leading-snug text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400">
          {book.title}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-sm text-slate-500 dark:text-slate-400">{book.author}</p>
        <div className="mt-auto pt-3">
          {available ? (
            <Badge tone="green"><CheckCircle2 size={12} /> {book.available_copies} of {book.total_copies} available</Badge>
          ) : (
            <Badge tone="red"><XCircle size={12} /> All copies borrowed</Badge>
          )}
        </div>
      </div>
    </Link>
  );
}
