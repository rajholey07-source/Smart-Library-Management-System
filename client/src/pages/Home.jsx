import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, BookOpen, Users, ArrowRight, LibraryBig, ScanSearch, CalendarClock, Wallet, Sparkles } from 'lucide-react';
import { api } from '../api.js';
import { useData } from '../hooks/useFetch.js';
import BookCard from '../components/BookCard.jsx';
import { Spinner, ErrorState, Button } from '../components/ui.jsx';

function HeroSearch() {
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); navigate(`/catalog?q=${encodeURIComponent(q.trim())}`); }}
      className="flex w-full max-w-xl overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <span className="flex items-center pl-4 text-slate-400"><Search size={18} /></span>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by title, author, ISBN or category…"
        className="w-full bg-transparent px-3 py-3.5 text-sm focus:outline-none"
      />
      <button type="submit" className="bg-brand-600 px-6 text-sm font-semibold text-white transition hover:bg-brand-700">
        Search
      </button>
    </form>
  );
}

function SectionHeader({ title, subtitle, to, linkLabel }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {to && (
        <Link to={to} className="flex shrink-0 items-center gap-1 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
          {linkLabel || 'View all'} <ArrowRight size={15} />
        </Link>
      )}
    </div>
  );
}

export default function Home() {
  const featured = useData(() => api.featured(), []);
  const recent = useData(() => api.recent(), []);

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              <Sparkles size={13} /> Smart Library Management System
            </p>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
              Discover your next great read at <span className="text-brand-600 dark:text-brand-400">Smart Library</span>
            </h1>
            <p className="mt-4 max-w-lg text-base text-slate-600 dark:text-slate-300">
              Search thousands of titles, borrow with one click, and manage returns and due dates —
              the complete digital experience of our campus library.
            </p>
            <div className="mt-6">
              <HeroSearch />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" to="/catalog">Browse catalog</Button>
              <Button size="lg" variant="outline" to="/register">Join the library</Button>
            </div>
          </div>
          <div className="hidden justify-center lg:flex">
            <div className="grid grid-cols-2 gap-4">
              {['9780262046305', '9780132350884', '9781098125974', '9780134610993'].map((isbn, i) => (
                <img
                  key={isbn}
                  src={`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`}
                  alt="Featured book cover"
                  loading="lazy"
                  className={`h-48 w-36 rounded-lg object-cover shadow-md ring-1 ring-slate-200 dark:ring-slate-800 ${i % 2 ? 'translate-y-6' : ''}`}
                  onError={(e) => { e.currentTarget.src = '/vite.svg'; }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 lg:grid-cols-4">
          {[
            { icon: BookOpen, value: '22', label: 'Titles in catalog' },
            { icon: LibraryBig, value: '90+', label: 'Copies on shelves' },
            { icon: Users, value: '700+', label: 'Active members' },
            { icon: CalendarClock, value: '14', label: 'Day borrow period' },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-4">
              <span className="rounded-xl bg-brand-50 p-3 text-brand-600 dark:bg-brand-950 dark:text-brand-300"><s.icon size={22} /></span>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        {/* Featured */}
        <section>
          <SectionHeader title="Featured books" subtitle="Hand-picked highlights from our collection" to="/catalog?sort=popular" linkLabel="Browse popular" />
          {featured.loading ? <Spinner /> : featured.error ? <ErrorState message={featured.error.message} onRetry={featured.refetch} /> : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {featured.data.books.slice(0, 4).map((b) => <BookCard key={b.id} book={b} />)}
            </div>
          )}
        </section>

        {/* How it works */}
        <section className="mt-16">
          <SectionHeader title="How the system works" subtitle="Borrowing a book takes less than a minute" />
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { icon: ScanSearch, title: '1 · Find a book', text: 'Search the catalog by title, author, ISBN or category and check live availability.' },
              { icon: BookOpen, title: '2 · Borrow online', text: 'Click borrow to reserve your copy. The due date is set automatically — usually 14 days.' },
              { icon: Wallet, title: '3 · Return on time', text: 'Return at the desk or from your dashboard. Late returns are fined per day, transparently.' },
            ].map((s) => (
              <div key={s.title} className="card p-6">
                <span className="inline-flex rounded-lg bg-brand-50 p-3 text-brand-600 dark:bg-brand-950 dark:text-brand-300"><s.icon size={20} /></span>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Recently added */}
        <section className="mt-16">
          <SectionHeader title="Recently added" subtitle="The newest arrivals on our shelves" to="/catalog?sort=newest" />
          {recent.loading ? <Spinner /> : recent.error ? <ErrorState message={recent.error.message} onRetry={recent.refetch} /> : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {recent.data.books.slice(0, 8).map((b) => <BookCard key={b.id} book={b} />)}
            </div>
          )}
        </section>

        {/* CTA */}
        <section className="mt-16 rounded-2xl bg-slate-900 px-6 py-12 text-center dark:bg-slate-800">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready to start borrowing?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-300">
            Create your free student membership with your college email and student ID.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button size="lg" to="/register">Create account</Button>
            <Button size="lg" variant="outline" to="/login" className="border-slate-600 text-slate-200 hover:bg-slate-800 dark:hover:bg-slate-700">
              Student sign in
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
