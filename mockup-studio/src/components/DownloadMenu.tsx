import { useEffect, useRef, useState } from 'react';
import { downloadBlob, exportMockup, safeScale, type ExportFormat } from '../render/export';
import { outputSize } from '../render/render';
import type { RenderInput } from '../render/render';
import Segmented from './Segmented';

type Scale = '1' | '2' | '3';

export default function DownloadMenu({ input }: { input: RenderInput | null }) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('png');
  const [scale, setScale] = useState<Scale>('2');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const { width, height } = input ? outputSize(input.mockup, input.settings) : { width: 0, height: 0 };
  const dims = (s: Scale) => {
    const used = safeScale(width, height, Number(s));
    return `${Math.round(width * used)} × ${Math.round(height * used)}`;
  };

  const run = async () => {
    if (!input) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await exportMockup(input, format, Number(scale));
      downloadBlob(result.blob, result.filename);
      setMessage({
        ok: true,
        text: result.reduced
          ? `Downloaded at ${result.scaleUsed.toFixed(1)}x. Your browser can’t render ${scale}x of this mockup, so it was reduced.`
          : `Downloaded ${result.filename}`,
      });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : 'Export failed. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        className="btn-primary"
        aria-expanded={open}
        aria-haspopup="dialog"
        disabled={!input}
        title={input ? undefined : 'Upload an image to enable download'}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
          <path d="M12 4v12m0 0-4-4m4 4 4-4M4 20h16" />
        </svg>
        Download
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Download options"
          className="absolute right-0 top-full z-40 mt-2 w-[min(20rem,calc(100vw-2rem))] space-y-5 rounded-card border border-border bg-bg p-4 shadow-xl"
        >
          <Segmented
            legend="Format"
            value={format}
            onChange={setFormat}
            options={[
              { value: 'png', label: 'PNG', hint: 'Supports transparency' },
              { value: 'jpg', label: 'JPG', hint: 'Smaller file' },
            ]}
          />
          <Segmented
            legend="Size"
            value={scale}
            onChange={setScale}
            options={(['1', '2', '3'] as Scale[]).map((s) => ({ value: s, label: `${s}x`, hint: dims(s) }))}
          />
          {format === 'jpg' && input?.settings.background.type === 'transparent' && (
            <p className="text-xs text-muted">JPG can’t be transparent, so the background will be white.</p>
          )}
          <button type="button" className="btn-primary w-full" disabled={busy} onClick={run}>
            {busy ? 'Preparing…' : `Download ${format.toUpperCase()}`}
          </button>
          <p role="status" className={`text-xs ${message ? (message.ok ? 'text-text' : 'font-medium text-primary-ink') : 'sr-only'}`}>
            {message?.text}
          </p>
        </div>
      )}
    </div>
  );
}
