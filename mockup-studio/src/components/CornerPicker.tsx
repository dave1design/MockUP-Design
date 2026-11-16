import { useRef } from 'react';
import type { Point, Quad } from '../types';

interface Props {
  url: string;
  width: number;
  height: number;
  quad: Quad;
  onChange: (q: Quad) => void;
}

const LABELS = ['Top left', 'Top right', 'Bottom right', 'Bottom left'];

/** Shows the image with four draggable corner handles marking where the screen is. */
export default function CornerPicker({ url, width, height, quad, onChange }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<number | null>(null);
  const r = Math.max(width, height) * 0.012;

  const toImage = (clientX: number, clientY: number): Point => {
    const box = svg.current!.getBoundingClientRect();
    return [
      Math.max(0, Math.min(width, ((clientX - box.left) / box.width) * width)),
      Math.max(0, Math.min(height, ((clientY - box.top) / box.height) * height)),
    ];
  };

  const move = (i: number, p: Point) => onChange(quad.map((q, j) => (j === i ? p : q)) as Quad);

  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${width} ${height}`}
      className="block max-h-[70vh] w-full touch-none select-none rounded-card bg-surface"
      onPointerMove={(e) => drag.current !== null && move(drag.current, toImage(e.clientX, e.clientY))}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
    >
      <image href={url} width={width} height={height} />
      <polygon
        points={quad.map((p) => p.join(',')).join(' ')}
        fill="rgb(225 29 46 / 0.18)"
        stroke="rgb(225 29 46)"
        strokeWidth={r * 0.35}
      />
      {quad.map((p, i) => (
        <g key={i}>
          <circle
            cx={p[0]}
            cy={p[1]}
            r={r}
            fill="#fff"
            stroke="rgb(225 29 46)"
            strokeWidth={r * 0.3}
            tabIndex={0}
            role="slider"
            aria-label={`${LABELS[i]} corner. Use arrow keys to move.`}
            aria-valuetext={`${Math.round(p[0])}, ${Math.round(p[1])}`}
            className="cursor-grab"
            onPointerDown={(e) => {
              drag.current = i;
              (e.target as Element).setPointerCapture(e.pointerId);
            }}
            onKeyDown={(e) => {
              const step = e.shiftKey ? 10 : 1;
              const d: Record<string, Point> = {
                ArrowLeft: [-step, 0],
                ArrowRight: [step, 0],
                ArrowUp: [0, -step],
                ArrowDown: [0, step],
              };
              if (d[e.key]) {
                e.preventDefault();
                move(i, [p[0] + d[e.key][0], p[1] + d[e.key][1]]);
              }
            }}
          />
          <text x={p[0]} y={p[1] + r * 0.38} textAnchor="middle" fontSize={r * 1.1} fontWeight={700} fill="rgb(225 29 46)" pointerEvents="none">
            {i + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}
