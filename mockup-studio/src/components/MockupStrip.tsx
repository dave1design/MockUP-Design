import { Link } from 'react-router-dom';
import { assetUrl } from '../data/useManifest';
import type { Mockup } from '../types';

export default function MockupStrip({ current, mockups }: { current: Mockup; mockups: Mockup[] }) {
  const siblings = mockups.filter((m) => m.category === current.category);
  return (
    <nav aria-label={`More ${current.category}`} className="min-w-0 border-t border-border bg-bg px-4 py-3">
      <p className="label">More {current.category}</p>
      <ul className="-m-1 flex max-w-full gap-2 overflow-x-auto p-1">
        {siblings.map((m) => (
          <li key={m.id} className="shrink-0">
            <Link
              to={`/editor/${m.id}`}
              replace
              aria-label={m.name}
              aria-current={m.id === current.id ? 'page' : undefined}
              title={m.name}
              className={`grid h-20 w-16 place-items-center rounded-control bg-surface p-1.5 ${
                m.id === current.id ? 'ring-2 ring-primary' : 'hover:bg-primary-soft'
              }`}
            >
              <img src={assetUrl(m.thumbnail)} alt="" loading="lazy" className="h-full w-full object-contain" />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
