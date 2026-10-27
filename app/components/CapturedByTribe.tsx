import {useCallback, useEffect, useRef, useState} from 'react';
import {useT} from '~/lib/ui-strings';
import {SafeImage} from './SafeImage';

interface TribePhoto {
  kind: 'photo';
  src: string;
  alt: string;
  height: string;
}

interface TribeVideo {
  kind: 'video';
  poster: string;
  videoSrc?: string;
  alt: string;
  height: string;
}

type TribeItem = TribePhoto | TribeVideo;

const MEDIA: TribeItem[] = [
  {kind: 'photo',  src: 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?auto=format&fit=crop&w=600&q=80', alt: 'Kasbah village by the river', height: 'h-100'},
  {kind: 'photo',  src: 'https://images.unsplash.com/photo-1542401886-65d6c61db217?auto=format&fit=crop&w=600&q=80', alt: 'Traveler on a quad bike in the dunes', height: 'h-125'},
  {kind: 'video',  poster: 'https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?auto=format&fit=crop&w=600&q=80', alt: 'Campfire glowing in the desert night', height: 'h-100'},
  {kind: 'photo',  src: 'https://images.unsplash.com/photo-1489493887464-892be6d1daae?auto=format&fit=crop&w=600&q=80', alt: 'Berber guide in a blue robe', height: 'h-125'},
  {kind: 'photo',  src: 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?auto=format&fit=crop&w=600&q=80', alt: 'Rider on a camel crossing the Sahara', height: 'h-100'},
  {kind: 'video',  poster: 'https://images.unsplash.com/photo-1517824806704-9040b037703b?auto=format&fit=crop&w=600&q=80', alt: 'Tour group posing in the desert', height: 'h-125'},
];

export interface CapturedByTribeProps {
  heading?: string;
  subheading?: string;
  /** Instagram handle shown in the footer (without the @). */
  handle?: string;
  media?: TribeItem[];
}

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export function CapturedByTribe({
  heading = 'Captured by the tribe',
  subheading = 'Real travelers. Real moments.',
  handle = 'BudgetDesertTour',
  media = MEDIA,
}: CapturedByTribeProps) {
  const t = useT();
  const trackRef = useRef<HTMLUListElement>(null);
  const offsetRef = useRef(0);
  const rafRef = useRef<number>(0);

  // width (px) of ONE full pass through `media` — measured from real layout,
  // not scrollWidth/2 (which is off by a gap and causes the loop-seam glitch)
  const loopWidthRef = useRef(0);

  // pause sources, tracked independently so they never clobber each other
  const hoverRef = useRef(false);
  const draggingRef = useRef(false);
  const videoOpenRef = useRef(false);

  // drag state
  const dragStartXRef = useRef(0);
  const dragStartOffsetRef = useRef(0);
  const hasDraggedRef = useRef(false);

  // click-triggered smooth animation
  const animRef = useRef<{start: number; from: number; to: number; duration: number} | null>(null);

  const [activeVideo, setActiveVideo] = useState<TribeVideo | null>(null);

  // How many times the media list is repeated across the track.
  //
  // Two was not enough: at the moment the loop resets, the track has shifted
  // by one full pass (W), so the viewport shows content from W to W + V. With
  // only two copies the content stops at 2W, leaving V - W of empty track on
  // the right of any viewport wider than one pass — about 2100px here. The
  // count is derived from the measured widths instead.
  const [copies, setCopies] = useState(2);

  const applyTransform = useCallback(() => {
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(${offsetRef.current}px)`;
    }
  }, []);

  const normalizeOffset = useCallback(() => {
    const loopWidth = loopWidthRef.current;
    if (loopWidth <= 0) return;
    while (offsetRef.current <= -loopWidth) offsetRef.current += loopWidth;
    while (offsetRef.current > 0) offsetRef.current -= loopWidth;
  }, []);

  const measureLoopWidth = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    // offsetLeft of the first item of the *second* copy is the exact distance
    // to shift by for the copies to line up — this accounts for real gaps and
    // widths instead of guessing via scrollWidth. Indexed by media.length
    // rather than half the children, which only held while there were two.
    const marker = el.children[media.length] as HTMLElement | undefined;
    if (!marker) return;
    const loopWidth = marker.offsetLeft;
    if (loopWidth <= 0) return;
    loopWidthRef.current = loopWidth;

    // Fill the viewport even when the track has shifted a whole pass, plus one
    // spare pass so the seam is never the last thing on screen.
    const viewport = el.parentElement?.clientWidth ?? 0;
    const needed = Math.max(2, Math.ceil(viewport / loopWidth) + 1);
    setCopies((c) => (c === needed ? c : needed));
  }, [media.length]);

  const openVideo = useCallback((item: TribeVideo) => {
    videoOpenRef.current = true;
    setActiveVideo(item);
  }, []);

  const closeVideo = useCallback(() => {
    videoOpenRef.current = false;
    setActiveVideo(null);
  }, []);

  // Measure loop width on mount + whenever layout could change
  useEffect(() => {
    measureLoopWidth();
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => measureLoopWidth());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureLoopWidth, media, copies]);

  // Single rAF loop drives autoplay AND click-triggered animations,
  // so they never fight over the transform.
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const SPEED = 0.6;

    const tick = () => {
      if (animRef.current) {
        const anim = animRef.current;
        const elapsed = performance.now() - anim.start;
        const t = Math.min(elapsed / anim.duration, 1);
        offsetRef.current = anim.from + (anim.to - anim.from) * easeInOutCubic(t);
        applyTransform();
        if (t >= 1) {
          animRef.current = null;
          normalizeOffset();
          applyTransform();
        }
      } else if (
        !reduceMotion &&
        !hoverRef.current &&
        !draggingRef.current &&
        !videoOpenRef.current
      ) {
        const loopWidth = loopWidthRef.current;
        if (loopWidth > 0) {
          offsetRef.current -= SPEED;
          if (offsetRef.current <= -loopWidth) offsetRef.current += loopWidth;
          applyTransform();
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [applyTransform, normalizeOffset]);

  // Smooth, eased scroll for the prev/next buttons
  const scrollByCards = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;

    // Wrap the current position back into range FIRST. Since the two
    // rendered copies are pixel-identical, this never causes a visual
    // jump — but it stops rapid repeated clicks from pushing the offset
    // past the last rendered <li>, which is what caused the "blank"
    // flash: the track was being scrolled off the end of the duplicated
    // content, not failing to load images.
    normalizeOffset();
    applyTransform();

    const card = el.querySelector<HTMLElement>('[data-tribe-card]');
    const gap = 32; // matches gap-8
    const cardWidth = card ? card.getBoundingClientRect().width : 300;
    const step = (cardWidth + gap) * 2;

    animRef.current = {
      start: performance.now(),
      from: offsetRef.current,
      to: offsetRef.current - dir * step,
      duration: 500,
    };
  };

  // ── Drag handlers (mouse + touch via Pointer Events) ──────────
  const handlePointerDown = (e: React.PointerEvent<HTMLUListElement>) => {
    draggingRef.current = true;
    hasDraggedRef.current = false;
    animRef.current = null;
    dragStartXRef.current = e.clientX;
    dragStartOffsetRef.current = offsetRef.current;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLUListElement>) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - dragStartXRef.current;
    if (Math.abs(dx) > 4) hasDraggedRef.current = true;
    offsetRef.current = dragStartOffsetRef.current + dx;
    applyTransform();
  };

  const endDrag = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    normalizeOffset();
    applyTransform();
  };

  // Clicks that happen right after a drag shouldn't open the video modal
  const handleCardClick = (e: React.MouseEvent, item: TribeVideo) => {
    if (hasDraggedRef.current) {
      e.preventDefault();
      return;
    }
    openVideo(item);
  };

  // Repeat the media list enough times to cover the widest viewport.
  const allItems = Array.from({length: copies}, () => media).flat();

  return (
    <section
      aria-label={t('aria.gallery.section', 'Captured by the tribe')}
      className="overflow-hidden bg-gradient-to-b from-white via-white to-sand py-section"
    >
      {/* Header */}
      <div className="container max-w-content text-center">
        <h2 className="text-h3 md:text-h2 font-display text-dark">{heading}</h2>
        <p className="mt-2 text-base text-dark">{subheading}</p>
      </div>

      {/* Nav */}
      <div className="mt-[clamp(36px,4vw,52px)] flex justify-center gap-4">
        <NavButton
          label={t('aria.gallery.prev', 'Previous photos')}
          onClick={() => scrollByCards(-1)}
          dir="prev"
        />
        <NavButton
          label={t('aria.gallery.next', 'Next photos')}
          onClick={() => scrollByCards(1)}
          dir="next"
        />
      </div>

      {/* Carousel — overflow-hidden clips the moving track */}
      <div
        className="mt-6 overflow-hidden"
        onMouseEnter={() => { hoverRef.current = true; }}
        onMouseLeave={() => { hoverRef.current = false; endDrag(); }}
      >
        <ul
          ref={trackRef}
          role="list"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onDragStart={(e) => e.preventDefault()}
          style={{touchAction: 'pan-y'}}
          className="flex items-center gap-8 py-7 will-change-transform select-none cursor-grab active:cursor-grabbing"
        >
          {allItems.map((item, i) =>
            item.kind === 'video' ? (
              <li
                key={i}
                data-tribe-card
                className={`${item.height} relative w-[clamp(260px,18vw,320px)] shrink-0 overflow-hidden rounded-route-sm bg-dark shadow-card`}
              >
                <SafeImage
                  src={item.poster}
                  alt={item.alt}
                  loading="eager"
                  decoding="async"
                  fetchPriority={i < media.length ? 'high' : 'auto'}
                  draggable={false}
                  className="block h-full w-full object-cover"
                />
                {/* Cinematic vignette */}
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/40"
                />
                {/* Play button — same style as TrustBar */}
                <button
                  type="button"
                  aria-label={t('aria.gallery.play_video', 'Play video: {name}', {name: item.alt})}
                  onClick={(e) => handleCardClick(e, item)}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                    <span className="play-btn-shadow flex h-10 w-10 items-center justify-center rounded-full bg-primary z-10">
                      <svg width="14" height="16" viewBox="0 0 22 24" fill="none" aria-hidden="true">
                        <path
                          d="M3 2.6c0-1.2 1.3-1.95 2.34-1.34l13.2 8.9c.97.65.97 2.07 0 2.72l-13.2 8.9C4.3 23.4 3 22.6 3 21.4V2.6Z"
                          fill="#fff"
                        />
                      </svg>
                    </span>
                    <span aria-hidden="true" className="day-ping" />
                  </span>
                </button>
              </li>
            ) : (
              <li
                key={i}
                data-tribe-card
                className={`${item.height} w-[clamp(260px,18vw,320px)] shrink-0 overflow-hidden rounded-route-sm bg-sand shadow-card`}
              >
                <SafeImage
                  src={item.src}
                  alt={item.alt}
                  loading="eager"
                  decoding="async"
                  fetchPriority={i < media.length ? 'high' : 'auto'}
                  draggable={false}
                  className="block h-full w-full object-cover"
                />
              </li>
            )
          )}
        </ul>
      </div>

      {/* Footer */}
      <p className="px-6 pt-[clamp(36px,4vw,56px)] text-center text-base text-dark">
        {t('gallery.tag_prefix', 'Tag')} <span className="font-semibold text-primary">@{handle}</span> {t('gallery.tag_suffix', 'to be featured.')}
      </p>

      {/* Video modal */}
      {activeVideo && <VideoModal item={activeVideo} onClose={closeVideo} />}
    </section>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function VideoModal({item, onClose}: {item: TribeVideo; onClose: () => void}) {
  const t = useT();
  // ref callback keeps play() tied to the user gesture (Safari/iOS autoplay policy)
  const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
    el?.play().catch(() => {});
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.alt}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/85 p-6 sm:p-10"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative aspect-video w-full max-w-content overflow-hidden rounded-card bg-dark"
      >
        {item.videoSrc ? (
          <video
            ref={setVideoRef}
            src={item.videoSrc}
            poster={item.poster}
            controls
            playsInline
            className="h-full w-full"
          />
        ) : (
          <>
            <SafeImage src={item.poster} alt={item.alt} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-dark/40">
              <p className="font-body text-label uppercase tracking-widest text-sand/60">{t('media.video_coming_soon', 'Video coming soon')}</p>
            </div>
          </>
        )}
        <button
          type="button"
          aria-label={t('aria.gallery.close_video', 'Close video')}
          onClick={onClose}
          className="absolute right-3.5 top-3.5 flex h-10 w-10 items-center justify-center rounded-full bg-sand/15 text-xl text-sand transition-colors hover:bg-sand/25"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function NavButton({
  label,
  onClick,
  dir,
}: {
  label: string;
  onClick: () => void;
  dir: 'prev' | 'next';
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="tribe-nav-btn flex h-9 w-9 items-center justify-center rounded-full bg-dark text-white
                 transition-all duration-200
                 hover:scale-110 hover:bg-primary hover:shadow-[0_0.25rem_1.25rem_rgba(196,90,44,0.5)]
                 active:scale-90"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={`tribe-arrow ${dir === 'next' ? 'tribe-arrow-next' : 'tribe-arrow-prev'}`}
      >
        <path d={dir === 'prev' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
      </svg>
    </button>
  );
}

export default CapturedByTribe;