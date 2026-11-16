import { assetUrl, useManifest } from '../data/useManifest';

export default function License() {
  const { mockups, loading } = useManifest();
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Mockup licenses</h1>
      <p className="mt-3 text-muted">
        Every mockup in the library is listed here with its source and licence. The device frames are original
        illustrations made for this project and are generic: they are not copies of any manufacturer’s products,
        and no brand names or logos are used. Your exported images are yours to use commercially.
      </p>
      {loading ? (
        <p className="mt-8 text-muted">Loading…</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-card border border-border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Licence information for each mockup</caption>
            <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-4 py-3">Mockup</th>
                <th scope="col" className="px-4 py-3">Licence</th>
                <th scope="col" className="px-4 py-3">Author</th>
                <th scope="col" className="px-4 py-3">Source</th>
              </tr>
            </thead>
            <tbody>
              {mockups.map((m) => (
                <tr key={m.id} className="border-t border-border">
                  <th scope="row" className="px-4 py-3 font-medium">{m.name}</th>
                  <td className="px-4 py-3 capitalize">{m.license.type}</td>
                  <td className="px-4 py-3">{m.license.author}</td>
                  <td className="px-4 py-3 text-muted">
                    {m.license.url ? (
                      <a className="text-primary-ink underline" href={m.license.url} rel="noreferrer">
                        {m.license.source}
                      </a>
                    ) : (
                      m.license.source
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-6 text-sm text-muted">
        Machine-readable list: <a className="text-primary-ink underline" href={assetUrl('mockups/manifest.json')}>manifest.json</a>
      </p>
    </div>
  );
}
