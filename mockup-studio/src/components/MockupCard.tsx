import { Link } from 'react-router-dom';
import { assetUrl } from '../data/useManifest';
import type { Mockup } from '../types';

/** Vivid tiles that sit behind the transparent device illustrations. */
const TILES = [
  'linear-gradient(160deg,#FF4D5A,#6B0220)',
  'linear-gradient(160deg,#2B3BFF,#080C58)',
  'linear-gradient(170deg,#FFB347,#FF4F7B 55%,#5B2BD9)',
  'linear-gradient(160deg,#19F0B1,#5B3DFF)',
  'linear-gradient(160deg,#FFE1EF,#FFB3C9)',
  'linear-gradient(165deg,#FFF0A8,#FF6A3D)',
  'linear-gradient(170deg,#7BE7FF,#1D4BFF 60%,#0A2A8C)',
  'linear-gradient(160deg,#E9FFF4,#9EDFC2)',
];

const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

export default function MockupCard({ mockup }: { mockup: Mockup }) {
  const photo = mockup.layer === 'under';
  return (
    <Link to={`/editor/${mockup.id}`} className="group block rounded-card" aria-label={`Use ${mockup.name}`}>
      <div
        className="relative grid aspect-[4/5] place-items-center overflow-hidden rounded-card border border-border transition duration-300 group-hover:-translate-y-1 group-hover:shadow-xl"
        style={photo ? { background: 'rgb(var(--surface))' } : { background: TILES[hash(mockup.id) % TILES.length] }}
      >
        <img
          src={assetUrl(mockup.thumbnail)}
          alt=""
          loading="lazy"
          width={mockup.canvas.width}
          height={mockup.canvas.height}
          className={photo ? 'h-full w-full object-cover' : 'h-full w-full object-contain p-5 drop-shadow-2xl'}
        />
        <span className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-white text-[#1c1c1e] opacity-0 shadow-md transition group-hover:opacity-100" aria-hidden="true">
          →
        </span>
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2 px-1">
        <h3 className="truncate text-sm font-semibold text-ink">{mockup.name}</h3>
        <span className="shrink-0 font-mono text-[11px] uppercase tracking-wider text-muted">{mockup.category}</span>
      </div>
    </Link>
  );
}
