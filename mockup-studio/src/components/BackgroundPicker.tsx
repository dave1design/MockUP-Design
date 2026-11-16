import { useEffect, useRef } from 'react';
import { paintScene, SCENES, type SceneId } from '../render/scenes';
import type { Background } from '../types';

const COLOURS: { label: string; bg: Background }[] = [
  { label: 'Transparent', bg: { type: 'transparent' } },
  { label: 'White', bg: { type: 'solid', color: '#FFFFFF' } },
  { label: 'Warm grey', bg: { type: 'solid', color: '#F1EEEA' } },
  { label: 'Black', bg: { type: 'solid', color: '#111114' } },
  { label: 'Red', bg: { type: 'solid', color: '#E11D2E' } },
  { label: 'Soft red', bg: { type: 'solid', color: '#FCE8E9' } },
  { label: 'Sky', bg: { type: 'solid', color: '#DCE8FF' } },
  { label: 'Mint', bg: { type: 'solid', color: '#D7F2E3' } },
  { label: 'Sand', bg: { type: 'solid', color: '#F3E9DA' } },
];

const same = (a: Background, b: Background) => JSON.stringify(a) === JSON.stringify(b);

const swatchStyle = (bg: Background): React.CSSProperties =>
  bg.type === 'solid' ? { background: bg.color } : bg.type === 'gradient' ? { background: `linear-gradient(${bg.angle}deg, ${bg.from}, ${bg.to})` } : {};

function SceneThumb({ id }: { id: SceneId }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.width = 112;
    c.height = 84;
    paintScene(c.getContext('2d')!, 112, 84, id);
  }, [id]);
  return <canvas ref={ref} aria-hidden="true" className="block h-full w-full" />;
}

export default function BackgroundPicker({ value, onChange }: { value: Background; onChange: (b: Background) => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const previous = useRef<string | null>(null);
  const pickImage = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (previous.current) URL.revokeObjectURL(previous.current);
    const src = URL.createObjectURL(file);
    previous.current = src;
    onChange({ type: 'image', src });
  };
  const custom = value.type === 'solid' ? value.color : '#F1EEEA';
  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="label">Scenes</legend>
        <div className="grid grid-cols-5 gap-2">
          {SCENES.map((s) => {
            const active = value.type === 'scene' && value.id === s.id;
            return (
              <button
                key={s.id}
                type="button"
                title={s.label}
                aria-label={`${s.label} scene`}
                aria-pressed={active}
                onClick={() => onChange({ type: 'scene', id: s.id })}
                className={`aspect-[4/3] overflow-hidden rounded-lg border ${
                  active ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-bg' : 'border-border hover:border-muted'
                }`}
              >
                <SceneThumb id={s.id} />
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">Your own picture</legend>
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          aria-label="Choose a background picture"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pickImage(f);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          aria-pressed={value.type === 'image'}
          className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm ${
            value.type === 'image' ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-bg' : 'border-dashed border-border hover:border-muted'
          }`}
        >
          <span
            aria-hidden="true"
            className="grid h-9 w-12 shrink-0 place-items-center overflow-hidden rounded-md bg-surface bg-cover bg-center text-lg text-muted"
            style={value.type === 'image' ? { backgroundImage: `url(${value.src})` } : undefined}
          >
            {value.type === 'image' ? '' : '+'}
          </span>
          <span className="font-medium text-ink">{value.type === 'image' ? 'Replace picture' : 'Use a photo as background'}</span>
        </button>
      </fieldset>

      <fieldset>
        <legend className="label">Solid colours</legend>
        <div className="flex flex-wrap gap-2">
          {COLOURS.map((p) => {
            const active = same(p.bg, value);
            return (
              <button
                key={p.label}
                type="button"
                title={p.label}
                aria-label={p.label}
                aria-pressed={active}
                onClick={() => onChange(p.bg)}
                style={swatchStyle(p.bg)}
                className={`h-8 w-8 rounded-full border ${p.bg.type === 'transparent' ? 'checkerboard' : ''} ${
                  active ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-bg' : 'border-border'
                }`}
              />
            );
          })}
          <label className="relative h-8 w-8 cursor-pointer overflow-hidden rounded-full border border-dashed border-muted" title="Custom colour">
            <span className="sr-only">Custom background colour</span>
            <input
              type="color"
              value={custom}
              onChange={(e) => onChange({ type: 'solid', color: e.target.value })}
              className="absolute -inset-2 h-12 w-12 cursor-pointer opacity-0"
            />
            <span aria-hidden="true" className="grid h-full w-full place-items-center text-lg leading-none text-muted">
              +
            </span>
          </label>
        </div>
      </fieldset>
    </div>
  );
}
