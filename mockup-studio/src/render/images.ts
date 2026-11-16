const cache = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(src: string): Promise<HTMLImageElement> {
  let p = cache.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        cache.delete(src);
        reject(new Error(`Could not load ${src}`));
      };
      img.src = src;
    });
    cache.set(src, p);
  }
  return p;
}

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export interface UserImage {
  element: HTMLImageElement;
  url: string;
  name: string;
  letterbox: string;
}

export function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return 'Please upload a PNG, JPG or WebP image.';
  if (file.size > MAX_UPLOAD_BYTES) return 'That file is larger than 20 MB. Try exporting a smaller image.';
  if (file.size === 0) return 'That file is empty.';
  return null;
}

/** Average colour of the image's top-left corner, used to fill fit-mode gaps. */
function cornerColor(img: HTMLImageElement): string {
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0, Math.min(8, img.naturalWidth), Math.min(8, img.naturalHeight), 0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return `rgb(${r}, ${g}, ${b})`;
  } catch {
    return '#ffffff';
  }
}

export async function readUserImage(file: File): Promise<UserImage> {
  const error = validateFile(file);
  if (error) throw new Error(error);
  const url = URL.createObjectURL(file);
  try {
    const element = new Image();
    element.src = url;
    await element.decode();
    if (!element.naturalWidth || !element.naturalHeight) throw new Error('empty');
    return { element, url, name: file.name || 'pasted-image', letterbox: cornerColor(element) };
  } catch {
    URL.revokeObjectURL(url);
    throw new Error('That image could not be read. It may be corrupted.');
  }
}
