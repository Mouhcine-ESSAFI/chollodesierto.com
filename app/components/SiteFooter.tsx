import {useRouteLoaderData} from 'react-router';
import {useT} from '~/lib/ui-strings';
import type {RootLoader} from '~/root';
import camelsSvg from '~/assets/camels.svg?url';
import dunesSvg from '~/assets/dunes.svg?url';
import logoFallback from '~/assets/chollodesierto.svg?url';
import sunSvg from '~/assets/sun.svg?url';
import sunlightSvg from '~/assets/sunlight.svg?url';

interface NavLink {
  label: string;
  href: string;
}

interface SocialLink {
  label: string;
  href: string;
  icon: 'instagram' | 'tiktok';
}

const CHECKS: string[] = ['Secure payment', 'Free cancellation', 'Verified local agency'];

/**
 * Fallback for when the Shopify `footer` menu is empty or unreachable.
 * Note the anchors here are historical dead links (#reviews / #faq / #about
 * are not anchors that exist); the Shopify menu supplies real paths.
 */
const FALLBACK_NAV_LINKS: NavLink[] = [
  {label: 'Book', href: '/booking'},
  {label: 'Routes', href: '/#routes'},
  {label: 'Reviews', href: '/reviews'},
  {label: 'FAQ', href: '/faq'},
  {label: 'About', href: '/about'},
  {label: 'Contact', href: '/contact'},
];

const LEGAL_LINKS: NavLink[] = [
  {label: 'Terms', href: '#terms'},
  {label: 'Privacy', href: '#privacy'},
  {label: 'Refund Policy', href: '#refund'},
];

const SOCIAL_LINKS: SocialLink[] = [
  {label: 'Instagram', href: '#', icon: 'instagram'},
  {label: 'TikTok', href: '#', icon: 'tiktok'},
];

export interface SiteFooterProps {
  /** Main headline. */
  headline?: string;
  /** Destination for the primary CTA button. */
  ctaHref?: string;
  /** Destination for the WhatsApp prompt link. */
  whatsappHref?: string;
  /** Toggle the decorative camel caravan silhouette. */
  showCamels?: boolean;
}

export function SiteFooter({
  headline,
  ctaHref = '/booking',
  whatsappHref = '#whatsapp',
  showCamels = true,
}: SiteFooterProps) {
  // site_settings comes from the root loader (rendered on every page).
  const root = useRouteLoaderData<RootLoader>('root');
  const brandName = root?.siteSettings?.brandName || 'Budget Desert Tour';
  // Uploaded in Admin > Content > Metaobjects > Site Settings. The bundled
  // SVG is only a fallback, so a store that has not set one still renders.
  const logoUrl = root?.siteSettings?.logoUrl || logoFallback;
  const tagline =
    root?.siteSettings?.tagline || "Real Sahara.\nFair price.\nStories you'll tell forever.";

  // Shopify `footer` menu, falling back to the hardcoded list.
  const navLinks = root?.footerMenu?.length ? root.footerMenu : FALLBACK_NAV_LINKS;
  const t = useT();
  const checks = [
    t('footer.check_1', 'Secure payment'),
    t('footer.check_2', 'Free cancellation'),
    t('footer.check_3', 'Verified local agency'),
  ];
  const legalLinks = [
    {label: t('footer.legal_terms', 'Terms'), href: '#terms'},
    {label: t('footer.legal_privacy', 'Privacy'), href: '#privacy'},
    {label: t('footer.legal_refund', 'Refund Policy'), href: '#refund'},
  ];

  // Contact links come from site_settings. Anything still blank in Admin is
  // omitted rather than rendered as a dead "#" link.
  const whatsapp = root?.siteSettings?.whatsappUrl || whatsappHref;
  const socials = SOCIAL_LINKS.map((s) => ({
    ...s,
    href:
      (s.icon === 'instagram'
        ? root?.siteSettings?.instagramUrl
        : root?.siteSettings?.tiktokUrl) || '',
  })).filter((s) => s.href);

  return (
    <section
      aria-label="Book your desert adventure"
      className="hero-bg relative overflow-hidden font-body"
    >
      {/* ── Sunset scene (mirrors Hero layer stack) ── */}
      <div className="relative flex min-h-180 items-start justify-center px-5 text-center py-32">
        {/* Layer 4 — Sunlight */}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 z-4 pointer-events-none h-full flex items-end">
          <img src={sunlightSvg} alt="" className="w-full h-full max-h-180 lg:min-h-212 object-cover" />
        </div>
        {/* Layer 3 — Warm bottom gradient */}
        <div aria-hidden="true" className="hero-gradient absolute inset-x-0 bottom-0 z-6 pointer-events-none h-full" />
        {/* Layer 2 — Sun */}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 z-8 pointer-events-none h-full flex items-end">
          <img src={sunSvg} alt="" className="w-full h-full max-h-180 lg:min-h-212 object-cover" />
        </div>
        {/* Camel caravan (above dunes) */}
        {showCamels && <CamelCaravan />}
        {/* Layer 1 — Dunes (frontmost) */}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 z-10 pointer-events-none">
          <img src={dunesSvg} alt="" className="w-full h-72.5 lg:h-72.5 object-cover object-bottom" />
        </div>

        {/* Content — above all layers */}
        <div className="relative z-20 mx-auto max-w-170 w-full">
          <h2 className="sf-headline font-display text-sand text-h3 md:text-h2">
            {headline || t('footer.headline', 'Your story starts at sunset.')}
          </h2>

          <p className="mt-4 md:mt-5 text-sand text-base">
            {t('footer.deposit_line', 'Book your spot with 20%.')}
            <br />
            {t('footer.deposit_line_2', 'Pay the rest on the day of the excursion.')}
          </p>

          <ul
            role="list"
            className="sf-checks mt-7 md:mt-18 flex flex-wrap items-center justify-center gap-y-3.5"
          >
            {checks.map((label) => (
              <li
                key={label}
                className="flex items-center gap-2.5 whitespace-nowrap text-sand font-medium text-label md:text-base"
              >
                <CheckIcon />
                <span>{label}</span>
              </li>
            ))}
          </ul>

          <a
            href={ctaHref}
            className="mt-8 md:mt-10 inline-flex items-center gap-3 rounded-full font-display
                       text-white text-btn px-7 md:px-10 py-3.5 md:py-4
                       bg-gradient-to-b from-[#cc6533] to-primary
                       shadow-card-m
                       transition-transform duration-200 hover:-translate-y-0.5"
          >
            {t('footer.cta', 'Book Your Adventure Today')}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="m13 5 7 7-7 7" />
            </svg>
          </a>

          <p className="mt-6 md:mt-20 flex items-center justify-center gap-1.5 text-sand text-label">
            {t('footer.whatsapp_prompt', 'Or WhatsApp us if you’d rather talk first')}
            <a href={whatsapp} aria-label="Chat with us on WhatsApp" className="text-[1.05em]">
              <span role="img" aria-hidden="true">&#128522;</span>
            </a>
          </p>
        </div>
      </div>

      {/* ── Footer bar ── */}
      <footer className="sf-footer-bar relative z-3 bg-[#1A161D] px-5 text-center py-20">
        <nav
          aria-label="Footer"
          className="mb-10 md:mb-16 flex flex-wrap items-center justify-center gap-x-3.5 gap-y-2"
        >
          {navLinks.map((link, i) => (
            <span key={link.label} className="flex items-center gap-x-3.5">
              <a
                href={link.href}
                className="text-sand text-label font-medium transition-colors hover:text-[#f4b06a]"
              >
                {link.label}
              </a>
              {i < navLinks.length - 1 && (
                <span aria-hidden="true" className="select-none text-sand text-[0.4rem]">
                  &bull;
                </span>
              )}
            </span>
          ))}
        </nav>

        <div className="mb-6 md:mb-8 flex items-center justify-center gap-2">
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              aria-label={s.label}
              className="flex h-10 w-10 items-center justify-center
                         text-sand transition-colors hover:text-[#f4b06a]"
            >
              <SocialIcon icon={s.icon} />
            </a>
          ))}
        </div>

        <nav aria-label={t('aria.footer.legal', 'Legal')} className="mb-10 md:mb-16 flex flex-wrap items-center justify-center gap-3">
          {legalLinks.map((link, i) => (
            <span key={link.label} className="flex items-center gap-3">
              <a href={link.href} className="text-sand text-[0.85rem] transition-colors hover:text-[#e5d6c2]">
                {link.label}
              </a>
              {i < legalLinks.length - 1 && (
                <span aria-hidden="true" className="text-sand text-[0.7rem]">
                  &bull;
                </span>
              )}
            </span>
          ))}
        </nav>

        <div className="mb-7 md:mb-8 inline-flex flex-col items-center gap-3 text-center sm:flex-row sm:gap-[18px] sm:text-left">
          <img src={logoUrl} alt={brandName} className="h-10 w-auto shrink-0" />
          <span aria-hidden="true" className="hidden w-px self-stretch bg-[#e5d6c2]/25 sm:block" />
          <span className="text-sand text-[0.76rem] whitespace-pre-line">
            {tagline}
          </span>
        </div>

        <p className="text-sand text-[0.8rem]">
          {t('footer.copyright', '\u00A9 {year} {brand} \u2122. All rights reserved.', {
            year: new Date().getFullYear(),
            brand: brandName,
          })}
        </p>
      </footer>
    </section>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function CamelCaravan() {
  return (
    <img
      src={camelsSvg}
      alt=""
      aria-hidden="true"
      className="sf-camel absolute z-[12] left-1/2 h-auto -translate-x-1/2"
    />
  );
}

function CheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#eddcc2"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function SocialIcon({icon}: {icon: SocialLink['icon']}) {
  if (icon === 'instagram') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.5 3c.3 2.1 1.5 3.6 3.5 3.9v2.5c-1.3.1-2.5-.2-3.6-.9v5.9c0 3.4-2.5 5.6-5.5 5.6-2.9 0-5.1-2.1-5.1-4.9 0-3 2.4-5 5.4-4.7v2.6c-.4-.1-.9-.2-1.3-.1-1.2.1-2 1-1.9 2.2.1 1.2 1 2 2.2 1.9 1.3-.1 2-1 2-2.4V3h3.9z" />
    </svg>
  );
}

export default SiteFooter;
