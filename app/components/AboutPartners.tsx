import {useEffect, useRef} from 'react';
import {useT} from '~/lib/ui-strings';

interface PartnerImage {
  src: string;
  alt: string;
}

const DEFAULT_IMAGES: PartnerImage[] = [
  {src: 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?auto=format&fit=crop&w=800&q=80', alt: 'Ait Ben Haddou kasbah at sunrise'},
  {src: 'https://images.unsplash.com/photo-1542401886-65d6c61db217?auto=format&fit=crop&w=800&q=80', alt: 'Golden Sahara dunes at sunset'},
  {src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80', alt: 'Traveler walking along a dune ridge'},
  {src: 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?auto=format&fit=crop&w=800&q=80', alt: 'Luxury Berber desert camp'},
  {src: 'https://images.unsplash.com/photo-1580820267682-426da823b514?auto=format&fit=crop&w=800&q=80', alt: 'Camel caravan crossing the Sahara'},
  {src: 'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=800&q=80', alt: 'Desert road through the Atlas Mountains'},
];

export interface AboutPartnersProps {
  /** Small eyebrow label above the headline. */
  eyebrow?: string;
  /** Section headline (serif display). */
  title?: string;
  /** Row of partner images (rendered full-bleed, center-aligned). */
  images?: PartnerImage[];
  /** Left-column paragraphs. */
  leftParagraphs?: string[];
  /** Right-column paragraphs. */
  rightParagraphs?: string[];
  /** Closing statement lines (rendered centered, one per line). */
  statement?: string[];
}

const DEFAULT_LEFT = [
  'From the first night to the last, you stay with our local partners, small hotels along the route and Berber families running camps in the heart of the Sahara.',
  'These are people from the region, doing business in the place they know best. The hotel in Dades Valley. The camps in the middle of the Erg Chebbi dunes. We\u2019ve been working with the same partners for years, and we choose them for one simple reason: they do things right.',
];

const DEFAULT_RIGHT = [
  'What you get from these partnerships is the real thing. Nights in the middle of the desert, not on its edge. By day, dunes rolling out in every direction. At sunset, sand turning gold, then copper, then red. By night, a silence so complete you can hear the fire, and a sky no city can show you.',
  'Book with us, and you stay with them. That\u2019s the arrangement.',
];

const DEFAULT_STATEMENT = [
  'That\u2019s what \u201cauthentic\u201d actually means.',
  'Not a marketing word.',
  'A relationship.',
];

export function AboutPartners({
  eyebrow = 'Our Partners',
  title = 'Local partners, every step of the way.',
  images = DEFAULT_IMAGES,
  leftParagraphs = DEFAULT_LEFT,
  rightParagraphs = DEFAULT_RIGHT,
  statement = DEFAULT_STATEMENT,
}: AboutPartnersProps) {
  const t = useT();
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    // ── Infinite loop: clone the original set, then keep scroll wrapped ──
    const originals = Array.from(el.children);
    originals.forEach((node) => el.appendChild(node.cloneNode(true)));
    let setWidth = 0;
    const measure = () => {
      setWidth =
        originals.reduce((w, n) => w + (n as HTMLElement).getBoundingClientRect().width, 0) +
        parseFloat(getComputedStyle(el).columnGap || '0') * originals.length;
    };
    measure();
    window.addEventListener('resize', measure);

    // start on a centered half-card peek (matches the default composition)
    el.scrollLeft = (originals[0] as HTMLElement).getBoundingClientRect().width * 0.5;

    const wrap = () => {
      if (setWidth <= 0) return;
      if (el.scrollLeft >= setWidth) el.scrollLeft -= setWidth;
      else if (el.scrollLeft < 0) el.scrollLeft += setWidth;
    };
    el.addEventListener('scroll', wrap, {passive: true});

    // gentle auto-advance; pauses while the user interacts
    let paused = false;
    let down = false;
    const timer = window.setInterval(() => {
      if (!paused && setWidth > 0) el.scrollLeft += 0.5;
    }, 16);
    const onEnter = () => {
      paused = true;
    };
    const onLeave = () => {
      if (!down) paused = false;
    };
    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointerleave', onLeave);

    // ── Drag to scroll ──
    let startX = 0;
    let startScroll = 0;
    let moved = false;
    const onDown = (e: PointerEvent) => {
      down = true;
      moved = false;
      paused = true;
      startX = e.clientX;
      startScroll = el.scrollLeft;
      el.style.cursor = 'grabbing';
    };
    const end = () => {
      if (!down) return;
      down = false;
      paused = false;
      el.style.cursor = 'grab';
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      el.scrollLeft = startScroll - dx;
    };
    const onDragStart = (e: Event) => e.preventDefault();
    const onClick = (e: MouseEvent) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('dragstart', onDragStart);
    el.addEventListener('click', onClick, true);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('resize', measure);
      el.removeEventListener('scroll', wrap);
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('dragstart', onDragStart);
      el.removeEventListener('click', onClick, true);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section aria-label={t('aria.about.partners', 'Our partners')} className="relative overflow-hidden bg-linear-to-b from-white from-30% to-sand py-section font-body">
      {/* Heading */}
      <div className="container mx-auto mb-11 max-w-content px-8 text-center">
        <div className="mb-4 inline-flex flex-col items-center gap-1.5">
          <span className="text-label font-bold uppercase text-primary">
            {eyebrow}
          </span>
          <Squiggle />
        </div>
        <h2 className="mb-4 font-display text-[clamp(1.375rem,3.4vw,2.375rem)] text-dark">
          {title}
        </h2>
      </div>

      {/* Full-bleed partner carousel — trackpad/wheel/touch-swipe + click-drag */}
      <div
        ref={trackRef}
        className="flex cursor-grab gap-5 overflow-x-auto px-8 pb-4 scrollbar-none"
        style={{WebkitOverflowScrolling: 'touch'}}
      >
        {images.map((img, i) => (
          <figure
            key={i}
            className="aspect-5/4 w-102 shrink-0 overflow-hidden rounded-card shadow-card"
          >
            <img src={img.src} alt={img.alt} className="pointer-events-none h-full w-full object-cover" loading="lazy" />
          </figure>
        ))}
      </div>

      {/* Body + closing statement */}
      <div className="mx-auto mt-12 max-w-4xl px-8">
        <div className="grid grid-cols-1 gap-10 text-base text-dark md:grid-cols-2">
          <div className="flex flex-col gap-[1.1rem]">
            {leftParagraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <div className="flex flex-col gap-[1.1rem]">
            {rightParagraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>

        <div className="mt-12 text-center font-bold text-base text-dark">
          {statement.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
          <p aria-hidden="true" className="mt-3 text-2xl">
            {t('about.partners_emoji', '\u{1F602}\u{1F44C}')}
          </p>
        </div>
      </div>
    </section>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function Squiggle() {
  return (
    <svg width="52" height="8" viewBox="0 0 52 8" fill="none" aria-hidden="true" className="text-primary">
      <path
        d="M1 5.5C6 1.5 11 1.5 16 5.5C21 9.5 26 9.5 31 5.5C36 1.5 41 1.5 46 5.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default AboutPartners;