import { NavLink, Outlet } from 'react-router-dom';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import { ArrowIcon } from './icons';
import { Footer } from './home/Sections';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'}`;

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-on-primary"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur-md">
        <div className="frame flex h-16 items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            <NavLink to="/" end className={navClass}>
              Mockups
            </NavLink>
            <NavLink to="/my-mockups" className={navClass}>
              My mockups
            </NavLink>
            <NavLink to="/license" className={navClass}>
              Licenses
            </NavLink>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <a href="/#library" className="btn-dark !px-4 !py-2">
              Start now <ArrowIcon />
            </a>
          </div>
        </div>
        <nav className="flex justify-center gap-1 border-t border-border py-1.5 md:hidden" aria-label="Main (mobile)">
          <NavLink to="/" end className={navClass}>
            Mockups
          </NavLink>
          <NavLink to="/my-mockups" className={navClass}>
            My mockups
          </NavLink>
          <NavLink to="/license" className={navClass}>
            Licenses
          </NavLink>
        </nav>
      </header>
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
