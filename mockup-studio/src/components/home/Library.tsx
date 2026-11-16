import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CATEGORIES, matchesQuery } from '../../data/useManifest';
import type { Category, Mockup } from '../../types';
import MockupCard from '../MockupCard';

export type Filter = Category | 'all' | 'mine';

interface Props {
  mockups: Mockup[];
  loading: boolean;
  error: string | null;
  category: Filter;
  setCategory: (c: Filter) => void;
  query: string;
  setQuery: (q: string) => void;
}

export default function Library({ mockups, loading, error, category, setCategory, query, setQuery }: Props) {
  const visible = useMemo(
    () =>
      mockups.filter(
        (m) => (category === 'all' ? true : category === 'mine' ? !!m.custom : m.category === category) && matchesQuery(m, query),
      ),
    [mockups, category, query],
  );
  const count = (c: Category) => mockups.filter((m) => m.category === c).length;
  const mineCount = mockups.filter((m) => m.custom).length;

  const tab = (active: boolean) =>
    `rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
      active ? 'border-ink bg-ink text-bg' : 'border-border bg-surface text-ink hover:border-muted'
    }`;

  return (
    <section id="library" className="frame rule scroll-mt-16">
      <div className="px-6 pb-8 pt-16 sm:px-10">
        <p className="eyebrow">Mockups</p>
        <h2 className="mt-3 max-w-2xl text-4xl sm:text-5xl">Pick the device that fits your design</h2>
      </div>

      <div className="flex flex-col gap-4 px-6 pb-8 sm:px-10 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label="Device category" className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={category === 'all'} className={tab(category === 'all')} onClick={() => setCategory('all')}>
            All {mockups.length || ''}
          </button>
          {CATEGORIES.map((c) => (
            <button key={c.id} type="button" aria-pressed={category === c.id} className={tab(category === c.id)} onClick={() => setCategory(c.id)}>
              {c.label} {count(c.id) || ''}
            </button>
          ))}
          <button type="button" aria-pressed={category === 'mine'} className={tab(category === 'mine')} onClick={() => setCategory('mine')}>
            My mockups {mineCount || ''}
          </button>
        </div>
        <div>
          <label htmlFor="search" className="sr-only">
            Search mockups
          </label>
          <input
            id="search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search: silver, tilted, hand, android…"
            className="w-full rounded-full border border-border bg-surface px-5 py-2.5 text-sm placeholder:text-muted lg:w-80"
          />
        </div>
      </div>

      <div className="rule px-6 py-10 sm:px-10" aria-live="polite">
        {loading && <p className="py-16 text-center text-muted">Loading mockups…</p>}
        {error && (
          <p role="alert" className="py-16 text-center text-primary-ink">
            {error} Please refresh the page.
          </p>
        )}
        {!loading && !error && visible.length === 0 && category === 'mine' && !query && (
          <div className="py-16 text-center">
            <p className="font-semibold">You haven’t added any mockups yet.</p>
            <Link to="/my-mockups" className="btn-primary mt-4">
              Add your own mockups
            </Link>
          </div>
        )}
        {!loading && !error && visible.length === 0 && !(category === 'mine' && !query) && (
          <div className="py-16 text-center">
            <p className="font-semibold">No mockups match “{query}”.</p>
            <button
              type="button"
              className="btn-secondary mt-4"
              onClick={() => {
                setQuery('');
                setCategory('all');
              }}
            >
              Clear search and filters
            </button>
          </div>
        )}
        <ul className="grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-3 lg:grid-cols-4">
          {visible.map((m) => (
            <li key={m.id}>
              <MockupCard mockup={m} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
