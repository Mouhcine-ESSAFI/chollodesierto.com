import type {ReactNode} from 'react';
import {SafeImage} from './SafeImage';

interface ArticleImage {
  src: string;
  alt: string;
}

export interface BlogArticleProps {
  /** Full-bleed hero background. Editable via page_section `blog.post`. */
  heroImage?: ArticleImage;
  /** Article headline. Wraps on its own — no manual line breaks needed. */
  title: string;
  /** Publication date, already formatted for the store's language. */
  date?: string;
  /** Estimated read time, e.g. "8 min read". */
  readTime?: string;
  /** The post's own featured image, overlapping the hero. */
  featuredImage?: ArticleImage | null;
  /** Rendered above the headline — the back link to the journal. */
  breadcrumb?: ReactNode;
  /** Article body. */
  children?: ReactNode;
}

export function BlogArticle({
  heroImage,
  title,
  date,
  readTime,
  featuredImage,
  breadcrumb,
  children,
}: BlogArticleProps) {
  const meta = [date, readTime].filter(Boolean).join(' · ');

  return (
    <article className="bg-white font-body">
      {/* ── Hero ── */}
      <header className="relative flex h-[502px] flex-col overflow-hidden bg-sand">
        {heroImage?.src && (
          <SafeImage
            src={heroImage.src}
            alt={heroImage.alt}
            className="absolute inset-0 h-full w-full object-cover"
            loading="eager"
          />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(120,58,20,0.30) 0%, rgba(120,58,20,0.12) 45%, rgba(247,241,230,0.85) 92%, #F7F1E6 100%)',
          }}
        />

        {/* SiteNavbar is positioned by the page, so the copy clears it here. */}
        <div className="relative z-10 flex flex-col items-center px-6 pt-27.5 text-center">
          {breadcrumb && <div className="mb-5">{breadcrumb}</div>}
          <h1 className="m-0 mb-7.5 max-w-200 font-display text-[clamp(1.75rem,4vw,42px)] font-bold leading-tight text-white text-balance [text-shadow:0_2px_20px_rgba(60,25,8,0.4)] md:leading-[54px]">
            {title}
          </h1>
          {meta && (
            <p className="m-0 text-xs font-medium text-white [text-shadow:0_1px_10px_rgba(60,25,8,0.35)]">
              {meta}
            </p>
          )}
        </div>
      </header>

      {/* ── Featured image, overlapping the hero ── */}
      {featuredImage?.src && (
        <figure className="relative z-20 mx-auto -mt-11.25 w-162.5 max-w-[calc(100%-48px)]">
          <div className="aspect-[650/390] overflow-hidden rounded-2xl shadow-card-m">
            <SafeImage
              src={featuredImage.src}
              alt={featuredImage.alt}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </figure>
      )}

      {/* ── Body ── */}
      <div className="mx-auto max-w-316 px-6 pb-25 pt-20">
        <div className="grid grid-cols-12 gap-6">
          <div className="article-body col-span-12 text-base leading-[22px] text-dark/80 md:col-span-8 md:col-start-3">
            {children}
          </div>
        </div>
      </div>
    </article>
  );
}

export default BlogArticle;
