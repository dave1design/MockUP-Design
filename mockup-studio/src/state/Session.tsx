import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { readUserImage, type UserImage } from '../render/images';
import type { RenderSettings } from '../types';

const DEFAULT_SETTINGS: RenderSettings = {
  stage: { ratio: '4:3', padding: 0.12 },
  fit: 'fill',
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  background: { type: 'scene', id: 'podium-peach' },
  shadow: true,
};

interface Session {
  image: UserImage | null;
  error: string | null;
  loadFile: (file: File) => Promise<void>;
  clearImage: () => void;
  clearError: () => void;
  settings: RenderSettings;
  update: (patch: Partial<RenderSettings>) => void;
  resetPlacement: () => void;
}

const Ctx = createContext<Session | null>(null);

/** Everything lives in memory: closing or refreshing the tab clears it. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [image, setImage] = useState<UserImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<RenderSettings>(DEFAULT_SETTINGS);
  const urlRef = useRef<string | null>(null);

  const swap = useCallback((next: UserImage | null) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = next?.url ?? null;
    setImage(next);
  }, []);

  useEffect(() => {
    const release = () => urlRef.current && URL.revokeObjectURL(urlRef.current);
    window.addEventListener('pagehide', release);
    return () => window.removeEventListener('pagehide', release);
  }, []);

  const resetPlacement = useCallback(() => setSettings((s) => ({ ...s, zoom: 1, offsetX: 0, offsetY: 0 })), []);

  const loadFile = useCallback(
    async (file: File) => {
      try {
        const next = await readUserImage(file);
        setError(null);
        swap(next);
        resetPlacement();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'That image could not be read.');
      }
    },
    [swap, resetPlacement],
  );

  const value = useMemo<Session>(
    () => ({
      image,
      error,
      loadFile,
      clearImage: () => {
        swap(null);
        setError(null);
        resetPlacement();
      },
      clearError: () => setError(null),
      settings,
      update: (patch) => setSettings((s) => ({ ...s, ...patch })),
      resetPlacement,
    }),
    [image, error, loadFile, swap, settings, resetPlacement],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession must be used inside SessionProvider');
  return v;
}
