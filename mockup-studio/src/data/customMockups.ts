import type { Category, Mockup, Quad } from '../types';

/**
 * Mockups the owner adds themselves. They live in this browser's IndexedDB only:
 * nothing is uploaded, shipped with the site, or listed in the public manifest.
 */
const DB_NAME = 'mockup-studio-custom';
const STORE = 'mockups';

interface Stored {
  id: string;
  name: string;
  category: Category;
  blob: Blob;
  width: number;
  height: number;
  quad: Quad;
  screenWidth: number;
  screenHeight: number;
  radius: number;
  createdAt: number;
}

export type NewCustomMockup = Omit<Stored, 'id' | 'createdAt'>;

const listeners = new Set<() => void>();
const urls = new Map<string, string>();
const notify = () => listeners.forEach((fn) => fn());

export const subscribeCustom = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const run = async <T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
};

function toMockup(r: Stored): Mockup {
  let url = urls.get(r.id);
  if (!url) {
    url = URL.createObjectURL(r.blob);
    urls.set(r.id, url);
  }
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    tags: ['custom', 'mine'],
    frame: url,
    thumbnail: url,
    canvas: { width: r.width, height: r.height },
    screen: { quad: r.quad, width: r.screenWidth, height: r.screenHeight, radius: r.radius },
    color: 'Custom',
    license: { type: 'personal', source: 'added by the owner', author: 'You' },
    layer: 'under',
    custom: true,
  };
}

export async function listCustom(): Promise<Mockup[]> {
  const all = await run<Stored[]>('readonly', (s) => s.getAll());
  return all.sort((a, b) => b.createdAt - a.createdAt).map(toMockup);
}

export async function saveCustom(input: NewCustomMockup) {
  const record: Stored = { ...input, id: `custom-${crypto.randomUUID()}`, createdAt: Date.now() };
  await run('readwrite', (s) => s.put(record));
  notify();
}

export async function deleteCustom(id: string) {
  await run('readwrite', (s) => s.delete(id));
  const url = urls.get(id);
  if (url) URL.revokeObjectURL(url);
  urls.delete(id);
  notify();
}
