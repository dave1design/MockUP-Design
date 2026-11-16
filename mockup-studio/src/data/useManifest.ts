import { useEffect, useState } from 'react';
import type { Category, Manifest, Mockup } from '../types';
import { listCustom, subscribeCustom } from './customMockups';

export const assetUrl = (path: string) =>
  /^(blob:|data:)/.test(path) ? path : `${import.meta.env.BASE_URL}${path}`;

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'phones', label: 'Phones' },
  { id: 'tablets', label: 'Tablets' },
  { id: 'laptops', label: 'Laptops' },
  { id: 'desktops', label: 'Desktops' },
];

let pending: Promise<Manifest> | null = null;
let importedPending: Promise<Mockup[]> | null = null;

/** Mockups imported from the owner's folder (public/my-mockups). Optional: absent on a fresh checkout. */
function fetchImported(): Promise<Mockup[]> {
  importedPending ??= fetch(assetUrl('my-mockups/manifest.json'))
    .then((r) => (r.ok ? (r.json() as Promise<Manifest>) : { version: 1, mockups: [] }))
    .then((m) => m.mockups ?? [])
    .catch(() => []); // a dev server may answer with index.html when the file is missing
  return importedPending;
}

function fetchManifest(): Promise<Manifest> {
  pending ??= fetch(assetUrl('mockups/manifest.json'))
    .then((r) => {
      if (!r.ok) throw new Error(`Manifest request failed (${r.status})`);
      return r.json() as Promise<Manifest>;
    })
    .catch((e) => {
      pending = null;
      throw e;
    });
  return pending;
}

export function useManifest() {
  const [state, setState] = useState<{ mockups: Mockup[]; loading: boolean; error: string | null }>({
    mockups: [],
    loading: true,
    error: null,
  });
  const [custom, setCustom] = useState<Mockup[] | null>(null);
  const [imported, setImported] = useState<Mockup[] | null>(null);

  useEffect(() => {
    let live = true;
    fetchImported().then((list) => live && setImported(list));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    let live = true;
    fetchManifest()
      .then((m) => live && setState({ mockups: m.mockups, loading: false, error: null }))
      .catch(() => live && setState({ mockups: [], loading: false, error: 'The mockup library could not be loaded.' }));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    let live = true;
    const refresh = () =>
      listCustom()
        .then((list) => live && setCustom(list))
        .catch(() => live && setCustom([])); // storage can be blocked; the built-in library still works
    refresh();
    const off = subscribeCustom(refresh);
    return () => {
      live = false;
      off();
    };
  }, []);

  return {
    mockups: [...state.mockups, ...(imported ?? []), ...(custom ?? [])],
    loading: state.loading || custom === null || imported === null,
    error: state.error,
  };
}

export function matchesQuery(m: Mockup, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [m.name, m.category, m.color, ...m.tags].join(' ').toLowerCase().includes(q);
}
