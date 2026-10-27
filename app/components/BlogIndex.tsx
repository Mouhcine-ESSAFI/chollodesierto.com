import {useMemo, useState} from 'react';
import {Link} from 'react-router';
import {SafeImage} from './SafeImage';
import {PageHero} from './PageHero';
import {useT} from '~/lib/ui-strings';

export interface BlogPost {
  href: string;
  image: {src: string; alt: string};
  category: string;
  title: string;
  excerpt?: string;
  date: string;
  readTime: string;
}

export interface BlogIndexProps {
  heroImage?: {src: string; alt: string};
  title?: string;
  subtitle?: string;
  /** Shown above the grid. Omitted when there are no posts. */
  featured?: BlogPost | null;
  /** Tag names, without the leading "All" — that is added and translated here. */
  categories?: string[];
  posts?: BlogPost[];
  /** Posts revealed per "Load more" click. */
  pageSize?: number;
  /** Rendered instead of the grid when the blog has no posts yet. */
  emptyTitle?: string;
  emptyBody?: string;
  emptyCtaLabel?: string;
}

/**
 * Row pattern: wide + small, then small + wide, repeating. On a 12-column grid
 * a wide card spans 8 and a small one 4, so each pair fills a row exactly.
 */
const isWide = (i: number) => i % 4 === 0 || i % 4 === 3;

export function BlogIndex({
  heroImage,
  title,
  subtitle,
  featured = null,
  categories = [],
  posts = [],
  pageSize = 6,
  emptyTitle,
  emptyBody,
  emptyCtaLabel,
}: BlogIndexProps) {
  const t = useT();

  // "All" is a label, not a tag, so it is translated rather than coming from
  // Shopify. It leads the list and is the initial selection.
  const allLabel = t('blog.category_all', 'All');
  const tabs = useMemo(() => [allLabel, ...categories], [allLabel, categories]);

  const [active, setActive] = useState(allLabel);
  const [shown, setShown] = useState(pageSize);

  const filtered = posts.filter((p) => active === allLabel || p.category === active);
  const visible = filtered.slice(0, shown);

  return (
    <main id="main-content" className="min-h-screen bg-sand font-body">
      {/* ── Hero — shared with /booking, /contact, /faq and /reviews ── */}
      <PageHero
        ariaLabel={t('aria.blog.hero', 'Journal')}
        heading={title || t('blog.heading', 'Notes from the desert.')}
        subtext={
          subtitle ||
          t('blog.hero_subtext', 'Field notes, routes and small lessons from the Sahara.')
        }
        image={heroImage?.src}
        imageAlt={heroImage?.alt || ''}
        loading="eager"
      />

      <div className="mx-auto max-w-316 px-6 pb-24 pt-6">
        {featured && <FeaturedCard post={featured} />}

        {/* ── Category filter — only worth showing when posts carry tags ── */}
        {categories.length > 0 && (
          <div
            role="tablist"
            aria-label={t('aria.blog.filter', 'Filter stories')}
            className="mb-10 mt-15 flex flex-wrap justify-center gap-5"
          >
            {tabs.map((c) => {
              const on = c === active;
              return (
                <button
                  key={c}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => {
                    setActive(c);
                    setShown(pageSize);
                  }}
                  className={`h-12 rounded-full px-8 font-display text-[18px] font-bold shadow-card-m transition-colors ${
                    on ? 'bg-primary text-white' : 'bg-white text-dark hover:text-primary'
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Post grid ── */}
        {visible.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 [grid-auto-flow:dense] md:auto-rows-[420px] md:grid-cols-12">
            {visible.map((p, i) =>
              isWide(i) ? (
                <WideCard key={p.href} post={p} />
              ) : (
                <SmallCard key={p.href} post={p} />
              ),
            )}
          </div>
        ) : (
          !featured && (
            <div className="mx-auto max-w-140 rounded-card bg-white p-10 text-center shadow-card">
              <p className="font-display text-price text-dark">
                {emptyTitle || t('blog.empty_title', 'Nothing published yet.')}
              </p>
              <p className="mt-3 text-base leading-relaxed text-dark/80">
                {emptyBody ||
                  t(
                    'blog.empty_body',
                    'We’re writing up route notes and traveler stories. Check back soon, or get in touch if there’s something you’d like us to cover.',
                  )}
              </p>
              <Link to="/contact" className="mt-4 inline-block text-primary underline">
                {emptyCtaLabel || t('blog.empty_cta', 'Get in touch')}
              </Link>
            </div>
          )
        )}

        {filtered.length > shown && (
          <div className="mt-14 flex justify-center">
            <button
              type="button"
              onClick={() => setShown((s) => s + pageSize)}
              className="h-13 rounded-full bg-white px-9 font-display text-[18px] font-bold text-primary shadow-card-m transition-colors hover:bg-primary hover:text-white"
            >
              {t('blog.load_more', 'Load more')} <span aria-hidden="true">&darr;</span>
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function FeaturedCard({post}: {post: BlogPost}) {
  const t = useT();
  return (
    <Link
      to={post.href}
      className="grid grid-cols-[40px_minmax(0,1fr)] overflow-hidden rounded-[20px] bg-[#1F1E24] shadow-card-m md:h-105 md:grid-cols-[40px_minmax(0,1fr)_minmax(0,1fr)]"
    >
      <span className="flex rotate-180 items-center justify-center font-display text-[14px] font-bold text-white [writing-mode:vertical-rl]">
        {t('blog.featured', 'Featured')}
      </span>
      <SafeImage
        src={post.image.src}
        alt={post.image.alt}
        className="h-full min-h-64 w-full object-cover"
      />
      <div className="relative col-span-2 flex flex-col items-center justify-center bg-white px-12 py-8 text-center md:col-span-1 md:-ml-5 md:rounded-l-[20px]">
        {post.category && <CategoryTag label={post.category} icon="tag" className="mb-12 text-dark" />}
        <h2 className="mb-5 max-w-90 text-[20px] font-medium leading-6 text-dark">{post.title}</h2>
        {post.excerpt && (
          <p className="mb-3 max-w-67.5 text-base leading-[22px] text-dark/80">{post.excerpt}</p>
        )}
        <Meta post={post} className="mb-12" />
        <span className="font-display text-base font-bold text-primary">
          {t('blog.read_story', 'Read the story')} <span aria-hidden="true">&rarr;</span>
        </span>
      </div>
    </Link>
  );
}

function WideCard({post}: {post: BlogPost}) {
  return (
    <Link
      to={post.href}
      className="grid min-h-105 grid-cols-2 overflow-hidden rounded-2xl bg-white shadow-card-m transition-transform duration-200 hover:-translate-y-1 md:col-span-8 md:min-h-0"
    >
      <SafeImage
        src={post.image.src}
        alt={post.image.alt}
        loading="lazy"
        className="h-full w-full object-cover"
      />
      <div className="relative -ml-4 flex flex-col items-center justify-center rounded-l-2xl bg-white p-8 text-center">
        {post.category && <CategoryTag label={post.category} className="mb-14 text-dark" />}
        <h3 className="mb-5 max-w-65 text-[20px] font-medium leading-6 text-dark">{post.title}</h3>
        <Meta post={post} />
      </div>
    </Link>
  );
}

function SmallCard({post}: {post: BlogPost}) {
  return (
    <Link
      to={post.href}
      className="flex min-h-105 flex-col overflow-hidden rounded-2xl bg-white shadow-card-m transition-transform duration-200 hover:-translate-y-1 md:col-span-4 md:min-h-0"
    >
      <div className="relative h-72.5 flex-none">
        <SafeImage
          src={post.image.src}
          alt={post.image.alt}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        {post.category && (
          <CategoryTag
            label={post.category}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.5)]"
          />
        )}
      </div>
      <div className="relative -mt-4 flex flex-1 flex-col items-center justify-center rounded-t-2xl bg-white px-6 py-4 text-center">
        <h3 className="mx-auto mb-5 max-w-65 text-[20px] font-medium leading-6 text-dark">
          {post.title}
        </h3>
        <Meta post={post} />
      </div>
    </Link>
  );
}

/** "Jan 12, 2026 · 6 min read" — either half is dropped when absent. */
function Meta({post, className = ''}: {post: BlogPost; className?: string}) {
  const parts = [post.date, post.readTime].filter(Boolean);
  if (!parts.length) return null;
  return <p className={`text-xs text-dark/70 ${className}`}>{parts.join(' · ')}</p>;
}

function CategoryTag({
  label,
  icon = 'clock',
  className = '',
}: {
  label: string;
  icon?: 'clock' | 'tag';
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-display text-xs font-bold ${className}`}>
      {icon === 'tag' ? (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9z"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <circle cx="8" cy="8" r="1.5" fill="currentColor" />
        </svg>
      ) : (
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.4" />
          <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      )}
      {label}
    </span>
  );
}

export default BlogIndex;
