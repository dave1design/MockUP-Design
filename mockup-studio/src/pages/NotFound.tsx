import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="mt-3 text-muted">That page doesn’t exist, but the mockups are one click away.</p>
      <Link to="/" className="btn-primary mt-6">
        Browse mockups
      </Link>
    </div>
  );
}
