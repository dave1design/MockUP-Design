const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

export const PhoneIcon = (p: { size?: number }) => (
  <svg {...base} width={p.size ?? 20} height={p.size ?? 20}><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></svg>
);
export const LaptopIcon = (p: { size?: number }) => (
  <svg {...base} width={p.size ?? 20} height={p.size ?? 20}><rect x="4.5" y="5" width="15" height="10.5" rx="1.5" /><path d="M2.5 19h19" /></svg>
);
export const TabletIcon = (p: { size?: number }) => (
  <svg {...base} width={p.size ?? 20} height={p.size ?? 20}><rect x="4.5" y="2.5" width="15" height="19" rx="2.5" /><path d="M11 18.5h2" /></svg>
);
export const MonitorIcon = (p: { size?: number }) => (
  <svg {...base} width={p.size ?? 20} height={p.size ?? 20}><rect x="2.5" y="4" width="19" height="12.5" rx="1.5" /><path d="M9 20.5h6M12 16.5v4" /></svg>
);
export const ArrowIcon = ({ dir = 'right' }: { dir?: 'right' | 'down' }) => (
  <svg {...base} width={18} height={18} style={dir === 'down' ? { transform: 'rotate(90deg)' } : undefined}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const PlusIcon = () => (
  <svg {...base} width={16} height={16}><path d="M12 5v14M5 12h14" /></svg>
);
export const CheckIcon = () => (
  <svg {...base} width={16} height={16}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
);
export const SparkIcon = () => (
  <svg {...base} width={16} height={16}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>
);
