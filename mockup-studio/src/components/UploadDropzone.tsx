import { useRef } from 'react';
import { ACCEPTED_TYPES } from '../render/images';
import { useSession } from '../state/Session';

export default function UploadDropzone() {
  const { image, error, loadFile, clearImage } = useSession();
  const input = useRef<HTMLInputElement>(null);

  return (
    <div>
      <span className="label">Your design</span>
      <input
        ref={input}
        id="design-file"
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void loadFile(f);
          e.target.value = '';
        }}
      />
      {image ? (
        <div className="flex items-center gap-3 rounded-card border border-border p-2">
          <img src={image.url} alt="" className="h-14 w-14 shrink-0 rounded-md bg-surface object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium" title={image.name}>{image.name}</p>
            <p className="text-xs text-muted">
              {image.element.naturalWidth} × {image.element.naturalHeight}px
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-1">
            <button type="button" className="text-xs font-semibold text-primary-ink hover:underline" onClick={() => input.current?.click()}>
              Replace
            </button>
            <button type="button" className="text-xs font-semibold text-muted hover:text-text hover:underline" onClick={clearImage}>
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-card border-2 border-dashed border-border px-4 py-8 text-center transition-colors hover:border-primary hover:bg-primary-soft/50"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary-ink" aria-hidden="true">
            <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
          </svg>
          <span className="text-sm font-semibold">Upload your design</span>
          <span className="text-xs text-muted">Drop it anywhere, paste, or click. PNG, JPG or WebP up to 20 MB.</span>
        </button>
      )}
      {error && (
        <p role="alert" className="mt-2 rounded-control bg-primary-soft px-3 py-2 text-sm font-medium text-primary-ink">
          {error}
        </p>
      )}
      <p className="mt-2 text-xs text-muted">Your image stays on your device and is not saved.</p>
    </div>
  );
}
