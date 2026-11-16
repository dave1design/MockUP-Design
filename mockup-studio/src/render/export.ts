import { outputSize, renderMockup, type RenderInput } from './render';

export type ExportFormat = 'png' | 'jpg';

const MAX_SIDE = 16384;
const MAX_AREA = 100_000_000;

export interface ExportResult {
  blob: Blob;
  scaleUsed: number;
  reduced: boolean;
  filename: string;
}

/** Largest scale (<= requested) that stays inside browser canvas limits. */
export function safeScale(width: number, height: number, requested: number) {
  const bySide = MAX_SIDE / Math.max(width, height);
  const byArea = Math.sqrt(MAX_AREA / (width * height));
  return Math.min(requested, bySide, byArea);
}

export async function exportMockup(
  input: RenderInput,
  format: ExportFormat,
  requestedScale: number,
): Promise<ExportResult> {
  const { width, height } = outputSize(input.mockup, input.settings);
  const scale = safeScale(width, height, requestedScale);
  // JPG has no alpha, so a transparent background becomes white.
  const settings =
    format === 'jpg' && input.settings.background.type === 'transparent'
      ? { ...input.settings, background: { type: 'solid', color: '#ffffff' } as const }
      : input.settings;

  const canvas = document.createElement('canvas');
  renderMockup(canvas, { ...input, settings }, scale);
  const mime = format === 'png' ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, 0.95));
  canvas.width = canvas.height = 0;
  if (!blob) throw new Error('The browser could not create the image file.');
  return {
    blob,
    scaleUsed: scale,
    reduced: scale < requestedScale - 1e-6,
    filename: `mockup-${input.mockup.id}-${requestedScale}x.${format}`,
  };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
