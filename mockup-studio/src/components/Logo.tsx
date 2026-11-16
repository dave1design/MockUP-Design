import { Link } from 'react-router-dom';

export default function Logo() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-full font-semibold tracking-tight text-ink">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-on-primary" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
          <rect x="6" y="2" width="12" height="20" rx="3" />
        </svg>
      </span>
      <span>Mockup Studio</span>
    </Link>
  );
}
