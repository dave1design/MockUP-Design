import { readFileSync } from 'node:fs';
import { initializeCanvas, readPsd } from 'ag-psd';
const imageData = (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
initializeCanvas(((w: number, h: number) => ({ width: w, height: h, getContext: () => ({ createImageData: imageData }) })) as any, imageData as any);
const psd = readPsd(readFileSync(process.argv[2]), { skipThumbnail: true, useImageData: true, totalMemoryLimit: 10 * 1024 ** 3 } as any);
console.log('doc', psd.width, psd.height, 'bits', psd.bitsPerChannel, 'mode', psd.colorMode, 'composite', !!psd.imageData);
if (psd.imageData) { const d = psd.imageData.data as any; let nonWhite = 0; for (let i = 0; i < d.length; i += 4 * 211) if (d[i] < 245 || d[i+1] < 245 || d[i+2] < 245) nonWhite++; console.log('composite non-white samples', nonWhite, 'of', Math.floor(d.length / 4 / 211)); }
const walk = (ls: any[] | undefined, depth = 0) => {
  for (const l of ls ?? []) {
    const f = [l.hidden ? 'HIDDEN' : '', l.children ? 'GROUP' : '', l.imageData ? `px${l.imageData.width}x${l.imageData.height}` : 'nopx', l.placedLayer ? 'SMART' : '', l.vectorMask ? 'vmask' : '', l.vectorFill ? 'vfill' : '', l.text ? 'text' : '', l.adjustment ? 'adj' : '', l.effects ? 'fx' : '', l.blendMode && l.blendMode !== 'normal' ? l.blendMode : '', l.clipping ? 'clip' : '', l.opacity !== undefined && l.opacity < 1 ? 'op' + l.opacity.toFixed(2) : ''].filter(Boolean).join(' ');
    console.log(`${'  '.repeat(depth)}- ${l.name} [${f}]`);
    walk(l.children, depth + 1);
  }
};
walk(psd.children);
