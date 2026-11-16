import { FaBehance, FaDribbble, FaGithub, FaInstagram, FaLinkedinIn, FaTelegram, FaXTwitter, FaYoutube } from 'react-icons/fa6';
import type { IconType } from 'react-icons';
import { developer, type SocialKey } from '../../config/developer';
import { ArrowIcon } from '../icons';

const PLATFORMS: { key: SocialKey; label: string; Icon: IconType }[] = [
  { key: 'github', label: 'GitHub', Icon: FaGithub },
  { key: 'x', label: 'X', Icon: FaXTwitter },
  { key: 'linkedin', label: 'LinkedIn', Icon: FaLinkedinIn },
  { key: 'instagram', label: 'Instagram', Icon: FaInstagram },
  { key: 'telegram', label: 'Telegram', Icon: FaTelegram },
  { key: 'behance', label: 'Behance', Icon: FaBehance },
  { key: 'dribbble', label: 'Dribbble', Icon: FaDribbble },
  { key: 'youtube', label: 'YouTube', Icon: FaYoutube },
];

const DEV = import.meta.env.DEV;

/** Social icons. Empty links are hidden in production and shown as dashed placeholders in development. */
export function SocialLinks({ className = '' }: { className?: string }) {
  const items = PLATFORMS.filter((p) => developer.socials[p.key] || DEV);
  if (!items.length) return null;
  return (
    <ul className={`flex flex-wrap gap-2.5 ${className}`} aria-label="Developer on social media">
      {items.map(({ key, label, Icon }) => {
        const href = developer.socials[key];
        const base = 'grid h-11 w-11 place-items-center rounded-full border text-lg transition';
        return (
          <li key={key}>
            {href ? (
              <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className={`${base} border-border bg-surface text-ink hover:-translate-y-0.5 hover:border-primary hover:text-primary-ink`}>
                <Icon aria-hidden="true" />
              </a>
            ) : (
              <span title={`${label}: add your link in src/config/developer.ts`} className={`${base} border-dashed border-border text-muted`}>
                <Icon aria-hidden="true" />
                <span className="sr-only">{label} (link not set)</span>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

const mailto = () => {
  const subject = encodeURIComponent('A mockup for Mockup Studio');
  const body = encodeURIComponent(
    'Hi!\n\nI would like to share a mockup.\n\nName of the mockup:\nDevice type (phone / tablet / laptop / desktop):\nLink or attachment:\nWho made it, and the licence (so it can be shared):\n',
  );
  return `mailto:${developer.email}?subject=${subject}&body=${body}`;
};

/** "Send a mockup": email first, then the repository's issues page. */
function sendHref() {
  if (developer.email) return mailto();
  if (developer.repo) return `${developer.repo.replace(/\/$/, '')}/issues/new`;
  return '';
}

export default function Developer() {
  const send = sendHref();
  const initials = developer.name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <section className="frame rule" id="developer">
      <div className="grid md:grid-cols-2">
        <div className="cell border-b p-8 sm:p-10 md:border-b-0 md:border-r">
          <p className="eyebrow">Open source</p>
          <h2 className="mt-3 text-4xl sm:text-5xl">Built in the open, for designers</h2>
          <p className="mt-4 max-w-md text-lg text-muted">
            Mockup Studio is free and open source. Do you have a device mockup that other designers could use? Send it over and I will add it to
            the library, with credit to you.
          </p>
          <ul className="mt-5 space-y-2 text-muted">
            {['Phones, tablets, laptops and desktops are all welcome', 'PSD, or a PNG with a transparent screen', 'You made it, or its licence lets it be shared'].map((t) => (
              <li key={t} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
          <div className="mt-7 flex flex-wrap gap-3">
            {send ? (
              <a href={send} className="btn-primary !px-6 !py-3">
                Send a mockup <ArrowIcon />
              </a>
            ) : (
              DEV && <span className="btn-secondary !border-dashed" title="Set email or repo in src/config/developer.ts">Send a mockup (set email in config)</span>
            )}
            {developer.repo && (
              <a href={developer.repo} target="_blank" rel="noopener noreferrer" className="btn-secondary !px-6 !py-3">
                <FaGithub aria-hidden="true" /> View on GitHub
              </a>
            )}
          </div>
        </div>

        <div className="cell p-8 sm:p-10">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted">The developer</p>
          <div className="mt-5 flex items-center gap-4">
            <span
              aria-hidden="true"
              className="grid h-16 w-16 shrink-0 place-items-center rounded-full text-xl font-semibold text-white shadow-lg"
              style={{ background: 'linear-gradient(135deg,#ff6b6b,#a80620)' }}
            >
              {initials}
            </span>
            <div>
              <h3 className="text-2xl">{developer.name}</h3>
              <p className="text-muted">{developer.role}</p>
            </div>
          </div>
          <p className="mt-5 max-w-md text-muted">{developer.bio}</p>
          <SocialLinks className="mt-6" />
          <p className="mt-6 text-sm text-muted">
            The code is released under the MIT licence. Mockups you send stay under their own licence, which I will list on the Licences page.
          </p>
        </div>
      </div>
    </section>
  );
}
