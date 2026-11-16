import type { FitMode } from '../types';

export interface Placement {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where the image lands inside the screen, in screen units. */
export function computePlacement(
  imgW: number,
  imgH: number,
  screenW: number,
  screenH: number,
  fit: FitMode,
  zoom: number,
  offsetX: number,
  offsetY: number,
): Placement {
  const cover = Math.max(screenW / imgW, screenH / imgH);
  const contain = Math.min(screenW / imgW, screenH / imgH);
  const scale = (fit === 'fill' ? cover : contain) * zoom;
  const w = imgW * scale;
  const h = imgH * scale;
  return { x: (screenW - w) / 2 + offsetX * screenW, y: (screenH - h) / 2 + offsetY * screenH, w, h };
}

/** Keeps the image from being dragged off the screen (offsets are screen fractions). */
export function clampOffset(
  imgW: number,
  imgH: number,
  screenW: number,
  screenH: number,
  fit: FitMode,
  zoom: number,
  offsetX: number,
  offsetY: number,
) {
  const p = computePlacement(imgW, imgH, screenW, screenH, fit, zoom, 0, 0);
  const maxX = Math.max(0, (p.w - screenW) / 2) / screenW;
  const maxY = Math.max(0, (p.h - screenH) / 2) / screenH;
  return {
    offsetX: Math.max(-maxX, Math.min(maxX, offsetX)) || 0,
    offsetY: Math.max(-maxY, Math.min(maxY, offsetY)) || 0,
  };
}
