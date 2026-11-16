import { useEffect, useMemo, useRef, useState } from 'react';
import { clampOffset } from '../render/fit';
import { outputSize, renderMockup } from '../render/render';
import { useSession } from '../state/Session';
import type { Mockup, RenderSettings } from '../types';

function makePlaceholder(aspect: number): HTMLCanvasElement {
  const w = aspect >= 1 ? 1200 : Math.round(1200 * aspect);
  const h = Math.round(w / aspect);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#F7F7F8';
  ctx.fillRect(0, 0, w, h);
  const m = Math.min(w, h);
  ctx.fillStyle = '#FDECEE';
  ctx.beginPath();
  ctx.arc(w / 2, h / 2 - m * 0.04, m * 0.17, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#E11D2E';
  ctx.lineWidth = m * 0.022;
  ctx.lineCap = ctx.lineJoin = 'round';
  ctx.beginPath();
  const cx = w / 2;
  const cy = h / 2 - m * 0.04;
  ctx.moveTo(cx, cy + m * 0.07);
  ctx.lineTo(cx, cy - m * 0.07);
  ctx.moveTo(cx - m * 0.05, cy - m * 0.02);
  ctx.lineTo(cx, cy - m * 0.07);
  ctx.lineTo(cx + m * 0.05, cy - m * 0.02);
  ctx.stroke();
  ctx.fillStyle = '#6B6B76';
  ctx.font = `600 ${m * 0.05}px Inter Variable, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Your design here', w / 2, h / 2 + m * 0.24);
  return c;
}

interface Props {
  mockup: Mockup;
  frame: HTMLImageElement | null;
  overlay?: HTMLImageElement | null;
  bgImage?: HTMLImageElement | null;
  onPickFile: () => void;
}

export default function CanvasStage({ mockup, frame, overlay, bgImage, onPickFile }: Props) {
  const { image, settings, update, loadFile } = useSession();
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [over, setOver] = useState(false);

  const out = outputSize(mockup, settings);
  const aspect = out.width / out.height;
  const hasImage = !!image;
  const placeholder = useMemo(
    () => makePlaceholder(mockup.screen.width / mockup.screen.height),
    [mockup.screen.width, mockup.screen.height],
  );

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const availW = el.clientWidth - 32;
      // Leave room for the floating upload button until a design is added.
      const availH = el.clientHeight - 32 - (hasImage ? 0 : 56);
      if (availW <= 0 || availH <= 0) return;
      const w = Math.min(availW, availH * aspect);
      setSize({ w: Math.floor(w), h: Math.floor(w / aspect) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [aspect, hasImage]);

  const effective: RenderSettings = image
    ? settings
    : { ...settings, fit: 'fill', zoom: 1, offsetX: 0, offsetY: 0 };

  useEffect(() => {
    if (!frame || !size || !canvas.current) return;
    const el = canvas.current;
    const raf = requestAnimationFrame(() => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderMockup(
        el,
        {
          mockup,
          frame,
          image: image ? image.element : placeholder,
          settings: effective,
          letterbox: image ? image.letterbox : '#F7F7F8',
          overlay,
          backgroundImage: bgImage,
        },
        (size.w * dpr) / out.width,
      );
    });
    return () => cancelAnimationFrame(raf);
    // `effective` is derived from settings and image, which are listed directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mockup, frame, overlay, bgImage, size, image, placeholder, settings]);

  const move = (dxFrac: number, dyFrac: number) => {
    if (!image) return;
    const c = clampOffset(
      image.element.naturalWidth,
      image.element.naturalHeight,
      mockup.screen.width,
      mockup.screen.height,
      settings.fit,
      settings.zoom,
      settings.offsetX + dxFrac,
      settings.offsetY + dyFrac,
    );
    update(c);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || !size) return;
    const unitsPerPx = out.width / size.w;
    move(
      ((e.clientX - drag.current.x) * unitsPerPx) / mockup.screen.width,
      ((e.clientY - drag.current.y) * unitsPerPx) / mockup.screen.height,
    );
    drag.current = { x: e.clientX, y: e.clientY };
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!image) return;
    const step = 0.02;
    const keys: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (keys[e.key]) {
      e.preventDefault();
      move(...keys[e.key]);
    } else if (e.key === '+' || e.key === '=') update({ zoom: Math.min(4, settings.zoom + 0.1) });
    else if (e.key === '-') update({ zoom: Math.max(1, settings.zoom - 0.1) });
  };

  return (
    <div
      ref={box}
      className={`relative grid h-full min-h-[22rem] place-items-center overflow-hidden bg-surface/60 ${over ? 'ring-2 ring-inset ring-primary' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) void loadFile(f);
      }}
    >
      <div
        className={settings.background.type === 'transparent' ? 'checkerboard' : ''}
        style={size ? { width: size.w, height: size.h } : { visibility: 'hidden' }}
      >
        <canvas
          ref={canvas}
          style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: image ? 'grab' : 'default' }}
          tabIndex={image ? 0 : -1}
          role="img"
          aria-label={
            image
              ? `Preview of ${image.name} in ${mockup.name}. Use arrow keys to move the design and plus or minus to zoom.`
              : `${mockup.name} preview, waiting for your design`
          }
          onPointerDown={(e) => {
            if (!image) return;
            drag.current = { x: e.clientX, y: e.clientY };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={onPointerMove}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          onKeyDown={onKeyDown}
        />
      </div>
      {!frame && <p className="absolute text-sm text-muted">Loading mockup…</p>}
      {!image && frame && (
        <button type="button" className="btn-primary absolute bottom-3 left-1/2 -translate-x-1/2 shadow-lg" onClick={onPickFile}>
          Upload your design
        </button>
      )}
    </div>
  );
}
