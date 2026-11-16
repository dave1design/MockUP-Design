import { Link } from 'react-router-dom';
import { assetUrl } from '../../data/useManifest';
import type { Mockup } from '../../types';
import { ArrowIcon, CheckIcon } from '../icons';
import { SocialLinks } from './Developer';

const Eyebrow = ({ children }: { children: string }) => <p className="eyebrow">{children}</p>;

/** Picks up to `n` mockups, preferring the owner's imported photo scenes for the showcase. */
function pick(mockups: Mockup[], n: number, photo: boolean) {
  const pool = mockups.filter((m) => (photo ? m.imported : !m.custom));
  return (pool.length >= n ? pool : mockups).slice(0, n);
}

export function Marquee() {
  const items = ['Figma exports', 'Sketch', 'Framer', 'Webflow', 'Photoshop', 'Adobe XD', 'Canva', 'Screenshots', 'Prototypes', 'Dashboards'];
  return (
    <div className="rule frame overflow-hidden border-b border-dashed border-border py-7" aria-label="Made for screens from">
      <div className="flex w-max animate-marquee gap-14 text-2xl font-semibold tracking-tight text-muted">
        {[...items, ...items].map((t, i) => (
          <span key={i} className="whitespace-nowrap" aria-hidden={i >= items.length}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Features({ mockups }: { mockups: Mockup[] }) {
  const stack = pick(mockups, 3, false);
  return (
    <section className="frame" id="features">
      <div className="grid gap-6 px-6 py-16 sm:px-10 md:grid-cols-2 md:items-end">
        <div>
          <Eyebrow>Features</Eyebrow>
          <h2 className="mt-3 text-4xl sm:text-5xl">Everything you need to present your design</h2>
        </div>
        <p className="max-w-md text-lg text-muted">Pick a device, drop in your screen and get a share-ready image. No editing skills, no extra apps.</p>
      </div>
      <div className="rule grid md:grid-cols-3">
        {/* Library */}
        <article className="cell border-b md:border-b-0 md:border-r">
          <div className="relative grid h-64 place-items-center overflow-hidden bg-[linear-gradient(160deg,rgb(var(--primary-soft)),rgb(var(--surface)))]">
            <div className="flex -space-x-8">
              {stack.map((m, i) => (
                <img
                  key={m.id}
                  src={assetUrl(m.thumbnail)}
                  alt=""
                  loading="lazy"
                  className="h-44 w-auto drop-shadow-xl"
                  style={{ transform: `rotate(${(i - 1) * 7}deg) translateY(${i === 1 ? -8 : 6}px)` }}
                />
              ))}
            </div>
          </div>
          <div className="p-6">
            <p className="font-mono text-[11px] uppercase tracking-wider text-primary-ink">Library</p>
            <h3 className="mt-2 text-xl">Phones, tablets, laptops, desktops</h3>
            <p className="mt-1 text-muted">Clean device frames in several colours, angles and landscape or portrait.</p>
          </div>
        </article>
        {/* Fit */}
        <article className="cell border-b md:border-b-0 md:border-r">
          <div className="relative grid h-64 place-items-center overflow-hidden bg-[linear-gradient(160deg,rgb(var(--primary-soft)),rgb(var(--surface)))]">
            <div className="w-56 rounded-2xl border border-border bg-surface p-3 shadow-lg">
              <div className="h-24 rounded-xl bg-[linear-gradient(135deg,#ff4d5a,#7a0f2a)]" />
              <div className="mt-3 flex items-center gap-2 text-sm font-medium"><span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-on-primary"><CheckIcon /></span>Auto-fitted to the screen</div>
              <div className="mt-2 h-2 w-3/4 rounded bg-border" />
            </div>
          </div>
          <div className="p-6">
            <p className="font-mono text-[11px] uppercase tracking-wider text-primary-ink">Instant fit</p>
            <h3 className="mt-2 text-xl">Your screen drops in perfectly</h3>
            <p className="mt-1 text-muted">Fill or fit, zoom and drag to reposition. Angled devices follow the perspective.</p>
          </div>
        </article>
        {/* Export */}
        <article className="cell">
          <div className="relative grid h-64 place-items-center overflow-hidden bg-[linear-gradient(160deg,rgb(var(--primary-soft)),rgb(var(--surface)))]">
            <div className="flex flex-col items-start gap-3">
              {['PNG · transparent', 'JPG · small file', '1x   2x   3x'].map((t, i) => (
                <span key={t} className="chip !px-5 !py-2.5 font-mono !text-xs" style={{ transform: `translateX(${(i - 1) * 18}px) rotate(${(i - 1) * -3}deg)` }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="p-6">
            <p className="font-mono text-[11px] uppercase tracking-wider text-primary-ink">Export</p>
            <h3 className="mt-2 text-xl">Download in high resolution</h3>
            <p className="mt-1 text-muted">PNG or JPG up to 3x, with soft shadows and vivid scene backgrounds.</p>
          </div>
        </article>
      </div>
    </section>
  );
}

export function Showcase({ mockups }: { mockups: Mockup[] }) {
  const shots = pick(mockups, 3, true);
  const tilt = ['-rotate-6', 'rotate-2', 'rotate-6'];
  return (
    <section className="frame rule p-3 sm:p-4">
      <div className="hero-card rounded-[28px] px-6 py-16 text-center sm:px-12">
        <span className="pin left-5 top-5" />
        <span className="pin right-5 top-5" />
        <p className="font-mono text-xs uppercase tracking-widest text-white/80">Showcase</p>
        <h2 className="mx-auto mt-3 max-w-2xl text-4xl !text-white sm:text-5xl">From plain screenshot to polished showcase</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {shots.map((m, i) => (
            <div key={m.id} className={`mx-auto w-full max-w-[340px] rounded-2xl bg-white p-2 shadow-[0_26px_40px_rgba(0,0,0,.35)] ${tilt[i]}`}>
              <div className="flex items-center gap-1.5 px-2 pb-2 pt-1">
                <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
                <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
                <span className="h-2 w-2 rounded-full bg-[#28c840]" />
              </div>
              <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-xl bg-[#f3f0ec]">
                <img src={assetUrl(m.thumbnail)} alt="" loading="lazy" className={m.layer === 'under' ? 'h-full w-full object-cover' : 'h-full w-full object-contain p-3'} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    ['01', 'Choose a mockup', 'Browse phones, tablets, laptops and desktops. Search by colour, angle or style.'],
    ['02', 'Upload your design', 'Drop in a PNG, JPG or WebP. It is read on your device and never uploaded.'],
    ['03', 'See it and download', 'Adjust the fit and background, preview instantly, then export in high resolution.'],
  ];
  return (
    <section className="frame rule" id="how">
      <div className="px-6 py-16 text-center sm:px-10">
        <Eyebrow>How it works</Eyebrow>
        <h2 className="mx-auto mt-3 max-w-xl text-4xl sm:text-5xl">Three steps. About thirty seconds.</h2>
      </div>
      <div className="rule grid md:grid-cols-3">
        {steps.map(([n, t, d], i) => (
          <article key={n} className={`cell p-8 ${i < 2 ? 'border-b md:border-b-0 md:border-r' : ''}`}>
            <p className="font-mono text-5xl font-medium text-primary-ink">{n}</p>
            <h3 className="mt-6 text-2xl">{t}</h3>
            <p className="mt-2 text-muted">{d}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function Stats({ count }: { count: number }) {
  const stats = [
    [`${count || 28}+`, 'Mockups ready to use'],
    ['4', 'Device types'],
    ['0 B', 'Uploaded to a server'],
    ['3x', 'Export resolution'],
  ];
  return (
    <section className="frame rule">
      <div className="grid grid-cols-2 md:grid-cols-4">
        {stats.map(([v, l], i) => (
          <div key={l} className={`cell p-6 ${i % 2 === 0 ? 'border-r' : ''} ${i < 2 ? 'border-b md:border-b-0' : ''} ${i < 3 ? 'md:border-r' : 'md:border-r-0'}`}>
            <p className="font-mono text-3xl font-medium text-ink">{v}</p>
            <p className="mt-1 text-sm text-muted">{l}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Faq() {
  const items = [
    ['Is my design uploaded anywhere?', 'No. Your image is read and drawn in your browser. There is no server, no account and no history, and refreshing the page clears everything.'],
    ['Which files can I use?', 'PNG, JPG and WebP up to 20 MB. For websites, upload a screenshot or a desktop-sized export from your design tool.'],
    ['Can I use the exported images commercially?', 'The built-in device frames are original illustrations, so your exports are yours to use. If you add mockups of your own, check that their licence allows your use.'],
    ['Can I add my own mockups?', 'Yes. Open “My mockups”, add a mockup image and mark its screen corners once. It stays on your computer.'],
    ['Why is there a tilted version of some devices?', 'Angled mockups give your work more depth. The screen is mapped with real perspective, so text and edges stay sharp.'],
  ];
  return (
    <section className="frame rule" id="faq">
      <div className="px-6 py-16 text-center sm:px-10">
        <Eyebrow>FAQ</Eyebrow>
        <h2 className="mt-3 text-4xl sm:text-5xl">Common questions answered</h2>
      </div>
      <div className="rule">
        {items.map(([q, a]) => (
          <details key={q} className="cell group border-b px-6 py-5 sm:px-10 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold text-ink">
              {q}
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border text-xl leading-none transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 max-w-3xl text-muted">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function CtaBand() {
  return (
    <section className="frame rule p-3 sm:p-4">
      <div className="hero-card rounded-[28px] px-8 py-14 sm:px-14">
        <span className="pin left-5 top-5" />
        <span className="pin right-5 top-5" />
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <h2 className="text-4xl !text-white sm:text-5xl">Make your next case study shine</h2>
            <p className="mt-3 max-w-lg text-lg text-white/85">Pick a mockup, drop in your design and download it. It is free, quick and private.</p>
          </div>
          <a href="#library" className="btn !bg-white !px-7 !py-3.5 text-base !text-[#1c1c1e] hover:!bg-white/90">
            Choose a mockup <ArrowIcon />
          </a>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="frame rule">
      <div className="flex flex-col gap-6 px-6 py-10 sm:px-10 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-muted">Your images are processed in your browser and never uploaded or saved.</p>
          <p className="mt-1 text-sm text-muted">Free and open source (MIT).</p>
        </div>
        <SocialLinks />
        <nav aria-label="Footer" className="flex gap-6 text-sm font-medium">
          <Link to="/" className="hover:text-primary-ink">Mockups</Link>
          <Link to="/my-mockups" className="hover:text-primary-ink">My mockups</Link>
          <a href="/#developer" className="hover:text-primary-ink">Send a mockup</a>
          <Link to="/license" className="hover:text-primary-ink">Licenses</Link>
        </nav>
      </div>
    </footer>
  );
}
