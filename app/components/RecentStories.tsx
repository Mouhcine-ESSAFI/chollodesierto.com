import {Link} from 'react-router';
import {SafeImage} from './SafeImage';
import {useT} from '~/lib/ui-strings';

export interface Story {
  href: string;
  image: {src: string; alt: string};
  category: string;
  title: string;
  date: string;
  readTime: string;
}

export interface RecentStoriesProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  stories?: Story[];
  ctaLabel?: string;
  ctaHref?: string;
}

/**
 * The "From the Sahara" block at the foot of a post. Renders nothing when there
 * are no other posts to show, rather than an empty heading over blank space.
 */
export function RecentStories({
  eyebrow,
  title,
  subtitle,
  stories = [],
  ctaLabel,
  ctaHref = '/blog',
}: RecentStoriesProps) {
  const t = useT();
  if (!stories.length) return null;

  return (
    <section
      aria-label={t('aria.post.recent', 'Recent stories')}
      className="bg-linear-to-b from-white to-sand pb-27.5 pt-30 font-body"
    >
      <div className="mx-auto max-w-316 px-6">
        <div className="mb-18 text-center">
          <div className="mb-10 inline-flex flex-col items-center gap-1.5">
            <span className="text-[14px] font-semibold uppercase tracking-[0.08em] text-primary">
              {eyebrow || t('post.recent_eyebrow', 'Recent Stories')}
            </span>
            <Squiggle />
          </div>
          <h2 className="mb-3 font-display text-[clamp(1.75rem,3.4vw,38px)] font-bold leading-tight text-dark md:leading-[46px]">
            {title || t('post.recent_heading', 'From the Sahara')}
          </h2>
          <p className="mx-auto max-w-75 text-base leading-[22px] text-dark/80">
            {subtitle ||
              t(
                'post.recent_subtitle',
                'Guides, tips, and tales from the Sahara written by people who actually live here.',
              )}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          {stories.map((s) => (
            <StoryCard key={s.href} story={s} />
          ))}
        </div>

        <div className="mt-16 flex justify-center">
          <Link
            to={ctaHref}
            className="inline-flex h-13 items-center gap-1.5 rounded-full bg-white px-9 font-display text-[18px] font-bold text-primary shadow-card-m transition-colors hover:bg-primary hover:text-white"
          >
            {ctaLabel || t('post.see_all', 'See All Stories')}{' '}
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function StoryCard({story}: {story: Story}) {
  const meta = [story.date, story.readTime].filter(Boolean).join(' · ');
  return (
    <Link
      to={story.href}
      className="group flex h-105 flex-col overflow-hidden rounded-2xl bg-white shadow-card-m transition-transform duration-200 hover:-translate-y-1 md:col-span-4"
    >
      <div className="relative h-72.5 flex-none">
        {/* Scrim so the category label stays readable over a bright photo. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 z-1 h-21 bg-linear-to-b from-transparent to-black/35"
        />
        <SafeImage
          src={story.image.src}
          alt={story.image.alt}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        {story.category && (
          <span className="absolute bottom-8 left-1/2 z-2 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap font-display text-xs font-bold text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.5)]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
              <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {story.category}
          </span>
        )}
      </div>
      <div className="relative -mt-4 flex flex-1 flex-col items-center justify-center rounded-t-2xl bg-white px-6 py-4 text-center">
        <h3 className="mb-5 max-w-65 text-[20px] font-semibold leading-6 text-dark">
          {story.title}
        </h3>
        {meta && <p className="text-xs font-medium text-dark/70">{meta}</p>}
      </div>
    </Link>
  );
}

function Squiggle() {
  return (
    <svg
      width="52"
      height="8"
      viewBox="0 0 52 8"
      fill="none"
      aria-hidden="true"
      className="text-primary"
    >
      <path
        d="M1 5.5C6 1.5 11 1.5 16 5.5C21 9.5 26 9.5 31 5.5C36 1.5 41 1.5 46 5.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default RecentStories;
