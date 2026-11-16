import { useRef } from 'react';
import { CATEGORIES } from '../../data/useManifest';
import { useSession } from '../../state/Session';
import type { Category } from '../../types';
import { ArrowIcon, LaptopIcon, MonitorIcon, PhoneIcon, PlusIcon, TabletIcon } from '../icons';

const ICONS: Record<Category, () => JSX.Element> = {
  phones: () => <PhoneIcon size={16} />,
  tablets: () => <TabletIcon size={16} />,
  laptops: () => <LaptopIcon size={16} />,
  desktops: () => <MonitorIcon size={16} />,
};

export default function Hero({ onPickCategory }: { onPickCategory: (c: Category) => void }) {
  const { image, error, loadFile, clearImage } = useSession();
  const input = useRef<HTMLInputElement>(null);
  const toLibrary = () => document.getElementById('library')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <section className="frame p-3 sm:p-4">
      <div className="hero-card rounded-[28px] px-5 pb-14 pt-16 text-center sm:px-10 sm:pb-20 sm:pt-24">
        <span className="pin left-5 top-5" />
        <span className="pin right-5 top-5" />

        {/* Floating stickers (decorative) */}
        <div aria-hidden="true" className="deco hidden md:block">
          <span className="sticker -left-4 top-[36%] h-16 w-16 animate-float bg-[radial-gradient(circle_at_35%_30%,#5b5b66,#18181c)]" style={{ ['--r' as string]: '0deg' }}>
            <PhoneIcon size={26} />
          </span>
          <span className="sticker -right-4 top-[22%] h-[68px] w-[68px] animate-float bg-[radial-gradient(circle_at_35%_30%,#ffe27a,#ff9f1c)] text-[#5a3a00]" style={{ ['--r' as string]: '0deg', animationDelay: '-2s' }}>
            <LaptopIcon size={28} />
          </span>
          <div className="absolute bottom-16 left-6 z-[3] w-[132px] -rotate-[8deg] bg-[#ffd84a] p-4 text-[#3b2a00] shadow-[0_18px_30px_rgba(0,0,0,.3)]">
            <p className="font-hand text-[22px] leading-5">Drop. Pick. Download. Done.</p>
          </div>
          <div className="absolute -right-6 top-[52%] z-[3] w-[250px] rotate-[6deg] rounded-2xl bg-white p-3 text-left text-[#1c1c1e] shadow-[0_18px_30px_rgba(0,0,0,.28)]">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#e11d2e] text-white"><ArrowIcon /></span>
              checkout-screen.png
            </p>
            <p className="mt-1 pl-9 text-xs text-[#6b6662]">Fitted to the phone, exported in 3 s</p>
          </div>
        </div>

        <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-3 py-1.5 text-sm font-medium backdrop-blur">
          Free and private
          <span className="rounded-full bg-[#ffd84a] px-2 py-0.5 text-xs font-bold text-[#3b2a00]">No sign-up</span>
        </p>
        <h1 className="mx-auto mt-6 max-w-3xl text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] !text-white sm:text-6xl">
          Turn any design into a mockup in seconds
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-white/85">
          Choose a device, drop in your screen and download the result. Your image never leaves your browser.
        </p>

        {/* Upload box */}
        <div className="mx-auto mt-10 max-w-[690px]">
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            aria-label="Upload your design"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void loadFile(f).then(toLibrary);
              e.target.value = '';
            }}
          />
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) void loadFile(f).then(toLibrary);
            }}
            className="flex min-h-[190px] flex-col justify-between rounded-3xl border border-white/45 bg-white/10 p-5 text-left backdrop-blur-sm"
          >
            {image ? (
              <div className="flex items-center gap-3">
                <img src={image.url} alt="" className="h-14 w-14 rounded-xl object-cover ring-2 ring-white/60" />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{image.name}</p>
                  <p className="text-sm text-white/80">Great. Now pick a mockup below.</p>
                </div>
                <button type="button" className="ml-auto text-sm font-semibold underline-offset-4 hover:underline" onClick={clearImage}>
                  Remove
                </button>
              </div>
            ) : (
              <p className="text-lg text-white/90">Drop your design here, or click the plus to browse…</p>
            )}
            {error && (
              <p role="alert" className="mt-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-[#b00020]">
                {error}
              </p>
            )}
            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                aria-label="Choose an image from your computer"
                onClick={() => input.current?.click()}
                className="grid h-11 w-11 place-items-center rounded-full border border-white/60 text-white transition hover:bg-white/20"
              >
                <PlusIcon />
              </button>
              <button
                type="button"
                aria-label="Go to the mockups"
                onClick={toLibrary}
                className="grid h-11 w-11 place-items-center rounded-full bg-white text-[#1c1c1e] shadow-md transition hover:scale-105"
              >
                <ArrowIcon />
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-2.5" role="group" aria-label="Jump to a device type">
            {CATEGORIES.map((c) => {
              const Icon = ICONS[c.id];
              return (
                <button
                  key={c.id}
                  type="button"
                  className="chip !border-transparent !bg-white !text-[#1c1c1e]"
                  onClick={() => {
                    onPickCategory(c.id);
                    toLibrary();
                  }}
                >
                  <Icon />
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
