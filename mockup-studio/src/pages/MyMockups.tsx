import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CornerPicker from '../components/CornerPicker';
import { CATEGORIES, useManifest } from '../data/useManifest';
import { deleteCustom, saveCustom } from '../data/customMockups';
import { defaultQuad, guessCategory, isConvex, quadSize } from '../render/quad';
import type { Category, Quad } from '../types';

interface Draft {
  file: File;
  url: string;
  width: number;
  height: number;
}

async function readDraft(file: File): Promise<Draft> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch {
    URL.revokeObjectURL(url);
    throw new Error(`${file.name} could not be read as an image.`);
  }
  return { file, url, width: img.naturalWidth, height: img.naturalHeight };
}

export default function MyMockups() {
  const { mockups } = useManifest();
  const mine = mockups.filter((m) => m.custom && !m.imported);
  const importedCount = mockups.filter((m) => m.imported).length;

  const [queue, setQueue] = useState<File[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [quad, setQuad] = useState<Quad>([[0, 0], [0, 0], [0, 0], [0, 0]]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('phones');
  const [ratioText, setRatioText] = useState('');
  const [radius, setRadius] = useState(0);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const measured = useMemo(() => quadSize(quad), [quad]);
  const ratio = Number(ratioText) > 0 ? Number(ratioText) : measured.w / Math.max(measured.h, 1);

  // Load the next file in the queue whenever the current one is finished.
  useEffect(() => {
    if (draft || queue.length === 0) return;
    let live = true;
    const [next, ...rest] = queue;
    readDraft(next)
      .then((d) => {
        if (!live) return;
        setDraft(d);
        setQueue(rest);
        setQuad(defaultQuad(d.width, d.height));
        const base = next.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
        setName(base);
        setCategory(guessCategory(base));
        setRatioText('');
        setRadius(0);
      })
      .catch((e: Error) => {
        if (!live) return;
        setMessage({ ok: false, text: e.message });
        setQueue(rest);
      });
    return () => {
      live = false;
    };
  }, [queue, draft]);

  const finish = () => {
    if (draft) URL.revokeObjectURL(draft.url);
    setDraft(null);
  };

  const save = async () => {
    if (!draft) return;
    if (!isConvex(quad)) {
      setMessage({ ok: false, text: 'The four corners cross over. Drag them so they outline the screen in order 1 to 4.' });
      return;
    }
    setSaving(true);
    try {
      const screenWidth = Math.round(measured.w);
      await saveCustom({
        name: name.trim() || draft.file.name,
        category,
        blob: draft.file,
        width: draft.width,
        height: draft.height,
        quad: quad.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]) as Quad,
        screenWidth,
        screenHeight: Math.round(screenWidth / ratio),
        radius,
      });
      setMessage({ ok: true, text: `Saved “${name.trim() || draft.file.name}”.` });
      finish();
    } catch {
      setMessage({ ok: false, text: 'Could not save. Your browser may be blocking storage (private window?).' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">My mockups</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Add your own mockup images. For each one, drag the four numbered corners onto the device screen, so your design
        can be placed there. Everything is stored only in this browser: nothing is uploaded or shared.
      </p>

      {message && (
        <p
          role="status"
          className={`mt-4 rounded-control px-3 py-2 text-sm font-medium ${message.ok ? 'bg-surface' : 'bg-primary-soft text-primary-ink'}`}
        >
          {message.text}
        </p>
      )}

      {draft ? (
        <section aria-label="Mark the screen" className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div>
            <CornerPicker url={draft.url} width={draft.width} height={draft.height} quad={quad} onChange={setQuad} />
            <p className="mt-2 text-xs text-muted">
              Corners in order: 1 top left, 2 top right, 3 bottom right, 4 bottom left. Tip: focus a corner and use the arrow
              keys (hold Shift for bigger steps) for precise placement.
            </p>
          </div>
          <div className="space-y-5">
            <div>
              <label htmlFor="mm-name" className="label">Name</label>
              <input
                id="mm-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-control border border-border bg-bg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="mm-cat" className="label">Category</label>
              <select
                id="mm-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full rounded-control border border-border bg-bg px-3 py-2 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="mm-ratio" className="label">Screen shape (width ÷ height)</label>
              <input
                id="mm-ratio"
                inputMode="decimal"
                value={ratioText}
                placeholder={(measured.w / Math.max(measured.h, 1)).toFixed(3)}
                onChange={(e) => setRatioText(e.target.value)}
                className="w-full rounded-control border border-border bg-bg px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-muted">
                Leave blank to measure it from the corners. For angled photos, type the real ratio instead (phone about 0.46,
                laptop 1.6, monitor 1.78).
              </p>
            </div>
            <div>
              <label htmlFor="mm-radius" className="label">Screen corner rounding</label>
              <input
                id="mm-radius"
                type="range"
                min={0}
                max={Math.round(Math.min(measured.w, measured.h) / 4)}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-primary flex-1" disabled={saving} onClick={save}>
                {queue.length ? `Save and next (${queue.length} more)` : 'Save mockup'}
              </button>
              <button type="button" className="btn-secondary" onClick={finish}>
                Skip
              </button>
            </div>
          </div>
        </section>
      ) : (
        <div className="mt-8">
          <label
            htmlFor="mm-files"
            className="flex cursor-pointer flex-col items-center gap-2 rounded-card border-2 border-dashed border-border px-4 py-12 text-center hover:border-primary hover:bg-primary-soft/50"
          >
            <span className="font-semibold">Choose mockup images</span>
            <span className="text-sm text-muted">PNG, JPG or WebP. You can pick many at once and mark them one by one.</span>
          </label>
          <input
            id="mm-files"
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => {
              setMessage(null);
              setQueue([...(e.target.files ?? [])]);
              e.target.value = '';
            }}
          />
        </div>
      )}

      {importedCount > 0 && (
        <p className="mt-6 rounded-card bg-surface p-3 text-sm text-muted">
          {importedCount} mockups were imported from your folder. Find them under “My mockups” on the home page.
        </p>
      )}

      <section className="mt-12" aria-label="Saved mockups">
        <h2 className="text-xl font-bold">Saved ({mine.length})</h2>
        {mine.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nothing saved yet.</p>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {mine.map((m) => (
              <li key={m.id} className="rounded-card border border-border p-2">
                <Link to={`/editor/${m.id}`} className="block rounded-md">
                  <img src={m.thumbnail} alt="" className="aspect-[4/3] w-full rounded-md bg-surface object-contain" />
                  <p className="mt-2 truncate text-sm font-semibold" title={m.name}>{m.name}</p>
                </Link>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="capitalize text-muted">{m.category}</span>
                  <button
                    type="button"
                    className="font-semibold text-primary-ink hover:underline"
                    onClick={() => {
                      if (window.confirm(`Delete “${m.name}”?`)) void deleteCustom(m.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
