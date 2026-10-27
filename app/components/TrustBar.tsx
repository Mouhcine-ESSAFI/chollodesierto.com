import {useState, useCallback, useRef} from 'react';
import {useT} from '~/lib/ui-strings';

type IconName = 'check' | 'star' | 'heart';

interface Feature {
  icon: IconName;
  title: string;
  body: string;
}

const FEATURES: Feature[] = [
  {icon: 'check', title: 'Free Cancellation',    body: 'Enjoy 48h advance cancellation flexibility'},
  {icon: 'star',  title: 'Book your spot with 20%', body: 'Pay the rest on the day of the excursion'},
  {icon: 'heart', title: 'No hidden fees',         body: 'Clear pricing, no surprise surcharges'},
];

export interface TrustBarProps {
  /** Poster image shown on the video card and as the modal backdrop. */
  poster?: string;
  /** If set, the modal plays the video inline; otherwise shows the poster. */
  videoUrl?: string;
  /** Alt text for the poster image. */
  posterAlt?: string;
  /** Override the default trust features. */
  features?: Feature[];
}

export function TrustBar({
  poster = 'https://images.unsplash.com/photo-1542401886-65d6c61db217?w=1600&q=80',
  videoUrl,
  posterAlt = 'Excursion preview',
  features = FEATURES,
}: TrustBarProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [playingInline, setPlayingInline] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlayClick = useCallback(() => {
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    if (isMobile) {
      setOpen(true);
      return;
    }
    // Calling play() synchronously inside the click handler (rather than
    // relying on a declarative `autoPlay` after the element mounts) keeps
    // playback tied to the user gesture so Safari/iOS won't block it.
    setPlayingInline(true);
    videoRef.current?.play().catch(() => {});
  }, []);

  return (
    <section
      aria-label={t('aria.trust.section', 'Book your desert adventure')}
      id="book"
      className="relative overflow-hidden bg-white"
    >
      {/* Dark band — seam sits at the card's vertical midpoint */}
      <div aria-hidden="true" className="booking-cta-band absolute inset-x-0 top-0 bg-[#1A161D]" />

      <div className="container max-w-content relative z-10 pb-14">

        {/* ── Video card ── */}
        <div className="relative w-full aspect-video overflow-hidden rounded-card bg-black">
          <video
            ref={videoRef}
            src={videoUrl}
            poster={poster}
            controls={playingInline}
            playsInline
            className={`absolute inset-0 h-full w-full object-cover ${playingInline ? '' : 'invisible'}`}
          />
          {!playingInline && (
            <button
              type="button"
              aria-label={t('aria.trust.play', 'Play excursion video')}
              onClick={handlePlayClick}
              className="group absolute inset-0 block h-full w-full cursor-pointer"
            >
              <img
                src={poster}
                alt={posterAlt}
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />
              {/* subtle vignette */}
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/15"
              />
              {/* play button */}
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                <span aria-hidden="true" className="day-ping"></span>
                <span className="play-btn-shadow flex h-12 w-12 items-center justify-center rounded-full bg-primary z-1">
                  <svg width="22" height="24" viewBox="0 0 22 24" fill="none" aria-hidden="true">
                    <path
                      d="M3 2.6c0-1.2 1.3-1.95 2.34-1.34l13.2 8.9c.97.65.97 2.07 0 2.72l-13.2 8.9C4.3 23.4 3 22.6 3 21.4V2.6Z"
                      fill="#fff"
                    />
                  </svg>
                </span>
              </span>
            </button>
          )}
        </div>

        {/* ── Trust features ── */}
        <ul
          role="list"
          className="mt-14 grid grid-cols-1 gap-10 text-center sm:grid-cols-3"
        >
          {features.map((f) => (
            <li key={f.title} className="flex flex-col items-center px-3">
              <span className="mb-3 flex text-primary">
                <FeatureIcon name={f.icon} />
              </span>
              <h3 className="font-body font-bold text-h3 text-dark">
                {f.title}
              </h3>
              <p className="font-body text-base text-dark max-w-76">
                {f.body}
              </p>
            </li>
          ))}
        </ul>

      </div>

      {open && <VideoModal poster={poster} videoUrl={videoUrl} onClose={close} />}
    </section>
  );
}

// ── Sub-components ──────────────────────────────────────────────

interface VideoModalProps {
  poster: string;
  videoUrl?: string;
  onClose: () => void;
}

function VideoModal({poster, videoUrl, onClose}: VideoModalProps) {
  const t = useT();
  // A ref callback fires during the commit right after the click that set
  // `open`, so calling play() here (rather than a declarative `autoPlay`)
  // keeps it tied to the user gesture for browsers that block autoplay otherwise.
  const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
    el?.play().catch(() => {});
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('aria.trust.video', 'Excursion video')}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/85 p-8"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative aspect-video w-full max-w-content overflow-hidden rounded-card bg-dark"
      >
        {videoUrl ? (
          <video ref={setVideoRef} src={videoUrl} poster={poster} controls playsInline className="h-full w-full" />
        ) : (
          <>
            <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-dark/35">
              <p className="font-body text-label text-sand/60 uppercase tracking-widest">{t('media.video_preview', 'Video preview')}</p>
            </div>
          </>
        )}
        <button
          type="button"
          aria-label={t('aria.trust.close_video', 'Close video')}
          onClick={onClose}
          className="absolute right-3.5 top-3.5 flex h-10 w-10 items-center justify-center
                     rounded-full bg-sand/15 text-sand text-xl hover:bg-sand/25 transition-colors">
          ×
        </button>
      </div>
    </div>
  );
}

function FeatureIcon({name}: {name: IconName}) {
  const attrs = {width: 32, height: 32, viewBox: '0 0 24 24', 'aria-hidden': true} as const;
  if (name === 'check') {
    return (
      <svg {...attrs} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  }
  if (name === 'star') {
    return (
      <svg {...attrs} fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
      </svg>
    );
  }
  return (
    <svg {...attrs} fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
    </svg>
  );
}

export default TrustBar;
