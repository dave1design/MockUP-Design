import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import CanvasStage from '../components/CanvasStage';
import ControlsPanel from '../components/ControlsPanel';
import DownloadMenu from '../components/DownloadMenu';
import Logo from '../components/Logo';
import MockupStrip from '../components/MockupStrip';
import ThemeToggle from '../components/ThemeToggle';
import { assetUrl, useManifest } from '../data/useManifest';
import { loadImage } from '../render/images';
import type { RenderInput } from '../render/render';
import { useSession } from '../state/Session';

export default function Editor() {
  const { id } = useParams();
  const { mockups, loading, error } = useManifest();
  const { image, settings, loadFile, resetPlacement } = useSession();
  const mockup = mockups.find((m) => m.id === id) ?? null;
  const [frame, setFrame] = useState<HTMLImageElement | null>(null);
  const [overlay, setOverlay] = useState<HTMLImageElement | null>(null);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [frameError, setFrameError] = useState(false);

  useEffect(() => {
    document.title = mockup ? `${mockup.name} · Mockup Studio` : 'Mockup Studio';
  }, [mockup]);

  // Each device has its own screen shape, so start from a clean placement.
  useEffect(() => resetPlacement(), [id, resetPlacement]);

  useEffect(() => {
    if (!mockup) return;
    let live = true;
    setFrame(null);
    setOverlay(null);
    setFrameError(false);
    if (mockup.overlay) {
      loadImage(assetUrl(mockup.overlay))
        .then((img) => live && setOverlay(img))
        .catch(() => undefined); // the scene still works without the overlay
    }
    loadImage(assetUrl(mockup.frame))
      .then((img) => live && setFrame(img))
      .catch(() => live && setFrameError(true));
    return () => {
      live = false;
    };
  }, [mockup]);

  const bgSrc = settings.background.type === 'image' ? settings.background.src : null;
  useEffect(() => {
    if (!bgSrc) {
      setBgImage(null);
      return;
    }
    let live = true;
    loadImage(bgSrc)
      .then((img) => live && setBgImage(img))
      .catch(() => live && setBgImage(null));
    return () => {
      live = false;
    };
  }, [bgSrc]);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
      if (file) {
        e.preventDefault();
        void loadFile(file);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [loadFile]);

  const input = useMemo<RenderInput | null>(
    () => (mockup && frame && image ? { mockup, frame, image: image.element, settings, letterbox: image.letterbox, overlay, backgroundImage: bgImage } : null),
    [mockup, frame, image, settings, overlay, bgImage],
  );

  if (loading) return <p className="grid min-h-screen place-items-center text-muted">Loading…</p>;
  if (error || !mockup) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <h1 className="text-2xl font-bold">{error ?? 'That mockup doesn’t exist'}</h1>
          <Link to="/" className="btn-primary mt-6">
            Browse mockups
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col lg:h-screen">
      <header className="z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-bg px-4">
        <div className="flex min-w-0 items-center gap-4">
          <Logo />
          <span className="hidden h-6 w-px bg-border sm:block" aria-hidden="true" />
          <Link to="/#library" className="hidden text-sm font-medium text-muted hover:text-text sm:inline">
            ← All mockups
          </Link>
          <h1 className="hidden min-w-0 truncate text-sm font-semibold md:block">{mockup.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <DownloadMenu input={input} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section aria-label="Preview" className="flex min-h-0 min-w-0 flex-1 flex-col lg:order-2">
          <div className="min-h-0 flex-1">
            {frameError ? (
              <p role="alert" className="grid h-full min-h-[22rem] place-items-center px-4 text-center text-primary-ink">
                This mockup couldn’t be loaded. Try another one.
              </p>
            ) : (
              <CanvasStage
                mockup={mockup}
                frame={frame}
                overlay={overlay}
                bgImage={bgImage}
                onPickFile={() => document.getElementById('design-file')?.click()}
              />
            )}
          </div>
          <MockupStrip current={mockup} mockups={mockups} />
        </section>
        <aside
          aria-label="Controls"
          className="w-full shrink-0 overflow-y-auto border-t border-border bg-bg p-5 lg:order-1 lg:w-[340px] lg:border-r lg:border-t-0"
        >
          <ControlsPanel photoMockup={mockup.layer === 'under'} />
        </aside>
      </div>
    </div>
  );
}
