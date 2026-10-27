import { useState } from 'react';
import { Link, useRouteLoaderData } from 'react-router';
import { useT } from '~/lib/ui-strings';
import logoFallback from '~/assets/chollodesierto.svg?url';
import type { RootLoader } from '~/root';

/** Fallback used when the Shopify main-menu is empty or unreachable. */
const FALLBACK_NAV_LINKS: ReadonlyArray<{ label: string; href: string }> = [
  { label: 'Routes',  href: '/#routes' },
  { label: 'Reviews', href: '/reviews' },
  { label: 'FAQ',     href: '/faq'     },
  { label: 'Contact', href: '/contact' },
];

/** The CTA button already links here, so the menu item is dropped from the pill. */
const CTA_HREF = '/booking';

export function SiteNavbar() {
  const t = useT();
  const [open, setOpen] = useState(false);
  // site_settings comes from the root loader (rendered on every page).
  const root = useRouteLoaderData<RootLoader>('root');
  const brandName = root?.siteSettings?.brandName || 'Budget Desert Tour';
  // Uploaded in Admin > Content > Metaobjects > Site Settings. The bundled
  // SVG is only a fallback, so a store that has not set one still renders.
  const logoUrl = root?.siteSettings?.logoUrl || logoFallback;
  const tagline =
    root?.siteSettings?.tagline || "Real Sahara.\nFair price.\nStories you'll tell forever.";

  // Shopify main-menu, minus the Book CTA which is rendered as its own button.
  const menu = (root?.mainMenu ?? []).filter((l) => l.href !== CTA_HREF);
  const navLinks = menu.length ? menu : FALLBACK_NAV_LINKS;

  return (
    <header>
      <nav className="absolute top-0 left-0 right-0 z-50">

        {/* ── Top bar ── */}
        <div className="mx-auto w-full">
        <div className="container flex items-center justify-between h-20 md:h-24 max-w-content">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 md:gap-4">
            {/* The wordmark carries the brand name as artwork; alt keeps it readable
                to screen readers and still sourced from Shopify. */}
            <img src={logoUrl} alt={brandName} className="h-9 w-auto shrink-0 md:h-10" />
            <div className="hidden md:block w-px h-11 bg-sand/25" />
            <p className="hidden md:block font-body text-author text-sand/60 whitespace-pre-line">
              {tagline}
            </p>
          </Link>

          {/* Desktop nav pill */}
          <div className="hidden lg:flex items-center gap-8 bg-white/15 rounded-full pl-7 pr-1 py-1 backdrop-blur-md">
            <ul className="flex items-center gap-8">
              {navLinks.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    to={href}
                    className="font-body font-bold text-base text-sand/80 hover:text-sand transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            <BookButton />
          </div>

          {/* Tablet: CTA + hamburger */}
          <div className="hidden md:flex lg:hidden items-center gap-4">
            <BookButton />
            <HamburgerButton open={open} onClick={() => setOpen(v => !v)} />
          </div>

          {/* Mobile: hamburger only */}
          <div className="flex md:hidden">
            <HamburgerButton open={open} onClick={() => setOpen(v => !v)} />
          </div>
        </div>
        </div>

        {/* ── Mobile / tablet dropdown ── */}
        {open && (
          <div className="mx-auto w-full">
            <div className="container pb-4">
              <div className="p-6 rounded-[1.5rem] bg-dark/90 border border-sand/10 backdrop-blur-md flex flex-col gap-1">
                <ul className="flex flex-col gap-1 mb-4">
                  {navLinks.map(({ label, href }) => (
                    <li key={href}>
                      <Link
                        to={href}
                        onClick={() => setOpen(false)}
                        className="block font-body font-bold text-base text-sand/80 hover:text-sand hover:bg-white/5 px-4 py-3 rounded-xl transition-colors"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
                <BookButton fullWidth />
              </div>
            </div>
          </div>
        )}

      </nav>
    </header>
  );
}

// ── Sub-components ────────────────────────────────────────────

function BookButton({ fullWidth = false }: { fullWidth?: boolean }) {
  const t = useT();
  return (
    <Link
      to="/booking"
      className={`font-display text-btn text-sand text-center bg-primary rounded-full px-7 py-2 hover:opacity-90 transition-opacity whitespace-nowrap ${fullWidth ? 'w-full' : ''}`}
    >
      {t('nav.book_now', 'Book Now')}
    </Link>
  );
}

function HamburgerButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  const t = useT();
  return (
    <button
      onClick={onClick}
      type="button"
      aria-label={
        open ? t('aria.nav.close_menu', 'Close menu') : t('aria.nav.open_menu', 'Open menu')
      }
      aria-expanded={open}
      className="flex flex-col justify-center items-center gap-1.5 w-10 h-10 rounded-full border border-sand/20 bg-white/10 backdrop-blur-md"
    >
      <span className={`block w-5 h-px bg-sand/80 transition-transform duration-200 ${open ? 'translate-y-2 rotate-45' : ''}`} />
      <span className={`block w-5 h-px bg-sand/80 transition-opacity duration-200 ${open ? 'opacity-0' : ''}`} />
      <span className={`block w-3 h-px bg-sand/80 transition-transform duration-200 ${open ? '-translate-y-2 -rotate-45 w-5' : ''}`} />
    </button>
  );
}
