import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, BookOpen } from 'lucide-react';
import { api } from '../api.js';
import { useData } from '../hooks/useFetch.js';
import BookCard from '../components/BookCard.jsx';
import { Spinner, ErrorState, EmptyState, Pagination, Select, Button } from '../components/ui.jsx';

export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const page = Number(params.get('page')) || 1;
  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const author = params.get('author') || '';
  const availability = params.get('availability') || '';
  const sort = params.get('sort') || 'title';

  const query = useMemo(() => ({ page, limit: 12, q, category, author, availability, sort }),
    [page, q, category, author, availability, sort]);

  const { data, loading, error, refetch } = useData(() => api.books(query), [page, q, category, author, availability, sort]);
  const filters = useData(() => api.bookFilters(), []);

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => {
      if (v) next.set(k, v); else next.delete(k);
    });
    if (!('page' in patch)) next.set('page', '1');
    setParams(next, { replace: true });
  };

  const hasFilters = q || category || author || availability;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Book catalog</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {data ? `${data.total} title${data.total === 1 ? '' : 's'} found` : 'Loading catalog…'}
        </p>
      </div>

      {/* Search + controls */}
      <div className="card mb-6 p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <form
            className="relative flex-1"
            onSubmit={(e) => { e.preventDefault(); update({ q: e.currentTarget.elements.q.value }); }}
          >
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Search size={16} /></span>
            <input
              name="q"
              defaultValue={q}
              key={q}
              placeholder="Search title, author, ISBN or category…"
              className="input pl-9"
            />
          </form>
          <div className="flex gap-3">
            <select className="input lg:w-44" value={sort} onChange={(e) => update({ sort: e.target.value })}>
              <option value="title">Sort: Title A–Z</option>
              <option value="newest">Sort: Newest</option>
              <option value="popular">Sort: Most borrowed</option>
              <option value="available">Sort: Most available</option>
            </select>
            <Button variant="outline" className="lg:hidden" onClick={() => setFiltersOpen((o) => !o)}>
              <SlidersHorizontal size={15} /> Filters
            </Button>
          </div>
        </div>

        <div className={`${filtersOpen ? 'grid' : 'hidden lg:grid'} mt-3 grid gap-3 border-t border-slate-100 pt-3 dark:border-slate-800 sm:grid-cols-3`}>
          <Select label="Category" value={category} onChange={(e) => update({ category: e.target.value })}>
            <option value="">All categories</option>
            {(filters.data?.categories || []).map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </Select>
          <Select label="Author" value={author} onChange={(e) => update({ author: e.target.value })}>
            <option value="">All authors</option>
            {(filters.data?.authors || []).map((a) => <option key={a} value={a}>{a}</option>)}
          </Select>
          <Select label="Availability" value={availability} onChange={(e) => update({ availability: e.target.value })}>
            <option value="">Any availability</option>
            <option value="available">Available now</option>
            <option value="unavailable">All copies borrowed</option>
          </Select>
        </div>

        {hasFilters && (
          <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
            <button onClick={() => setParams({}, { replace: true })} className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {loading ? <Spinner /> : error ? <ErrorState message={error.message} onRetry={refetch} /> : data.books.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No books match your search"
          hint="Try different keywords or clear some filters."
          action={<Button variant="outline" onClick={() => setParams({}, { replace: true })}>Clear filters</Button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {data.books.map((b) => <BookCard key={b.id} book={b} />)}
          </div>
          <div className="card mt-8">
            <Pagination page={data.page} pages={data.pages} onPage={(p) => update({ page: String(p) })} />
          </div>
        </>
      )}
    </div>
  );
}
