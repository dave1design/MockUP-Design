import { useId } from 'react';

interface Props<T extends string> {
  legend: string;
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
}

export default function Segmented<T extends string>({ legend, value, options, onChange }: Props<T>) {
  const name = useId();
  return (
    <fieldset>
      <legend className="label">{legend}</legend>
      <div className="flex gap-1 rounded-control bg-surface p-1">
        {options.map((o) => (
          <label key={o.value} className="relative flex-1">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="peer sr-only"
            />
            <span className="block cursor-pointer rounded-md px-3 py-1.5 text-center text-sm font-medium text-muted transition-colors hover:text-text peer-checked:bg-bg peer-checked:text-primary-ink peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-primary">
              {o.label}
              {o.hint && <span className="block text-[11px] font-normal opacity-70">{o.hint}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
