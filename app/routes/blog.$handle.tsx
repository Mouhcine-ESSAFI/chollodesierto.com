import {Link, useLoaderData} from 'react-router';
import type {LoaderFunctionArgs, MetaFunction} from 'react-router';
import {SiteNavbar} from '~/components/SiteNavbar';
import {SiteFooter} from '~/components/SiteFooter';
import {BlogArticle} from '~/components/BlogArticle';
import {RecentStories} from '~/components/RecentStories';
import type {Story} from '~/components/RecentStories';
import {
  BLOG_ARTICLE_QUERY,
  BLOG_ARTICLES_QUERY,
  BLOGS_QUERY,
  articleDateParts,
  mapBlogArticles,
  readingMinutesFromHtml,
  resolveBlogHandle,
} from '~/lib/queries';
import {
  SF_SITE_SETTINGS_QUERY,
  SF_PAGE_SECTIONS_QUERY,
  mapSiteSettings,
  mapPageSections,
} from '~/lib/admin-queries';
import {metaT, useArticleDateShort, useT} from '~/lib/ui-strings';

/** How many other posts the "From the Sahara" block shows. */
const RECENT_COUNT = 3;

export const meta: MetaFunction<typeof loader> = ({data, matches}) => {
  const t = metaT(matches);
  if (!data?.article) return [{title: t('meta.post.not_found', 'Post not found')}];
  const brand = data.brandName || 'Chollodesierto';
  const {article} = data;
  return [
    {title: `${article.seoTitle || article.title} — ${brand}`},
    {
      name: 'description',
      content: article.seoDescription || article.excerpt || '',
    },
  ];
};

export async function loader({context, params}: LoaderFunctionArgs) {
  const {storefront} = context;
  const articleHandle = params.handle;

  if (!articleHandle) {
    throw new Response('Not found', {status: 404});
  }

  // Which blog the post lives in comes from site_settings, so that has to be
  // read before the article itself.
  const [settingsRes, sectionsRes, blogsRes] = await Promise.all([
    storefront.query(SF_SITE_SETTINGS_QUERY).catch(() => null),
    storefront.query(SF_PAGE_SECTIONS_QUERY).catch(() => null),
    storefront.query(BLOGS_QUERY).catch(() => null),
  ]);

  const settings = mapSiteSettings(settingsRes);
  const blogHandle = resolveBlogHandle(blogsRes, settings?.blogHandle);

  // The article, plus a short list for the "From the Sahara" block. One extra
  // is fetched so removing the current post still leaves a full row.
  const [articleRes, recentRes] = await Promise.all([
    storefront
      .query(BLOG_ARTICLE_QUERY, {variables: {blogHandle, articleHandle}})
      .catch(() => null),
    storefront
      .query(BLOG_ARTICLES_QUERY, {variables: {blogHandle, first: RECENT_COUNT + 1}})
      .catch(() => null),
  ]);

  const a: any = (articleRes as any)?.blog?.articleByHandle;
  if (!a) {
    // A missing post is a real 404, not an empty page — otherwise bad URLs
    // would render a blank article shell and get indexed.
    throw new Response('Not found', {status: 404});
  }

  const recent = mapBlogArticles(recentRes)
    .filter((r) => r.handle !== articleHandle)
    .slice(0, RECENT_COUNT);

  return {
    article: {
      title: a.title as string,
      contentHtml: (a.contentHtml as string) ?? '',
      excerpt: (a.excerpt as string) ?? '',
      dateParts: articleDateParts(a.publishedAt),
      minutes: readingMinutesFromHtml(a.contentHtml as string),
      author: (a.authorV2?.name as string) ?? '',
      image: (a.image?.url as string) ?? '',
      imageAlt: (a.image?.altText as string) ?? '',
      seoTitle: (a.seo?.title as string) ?? '',
      seoDescription: (a.seo?.description as string) ?? '',
    },
    recent,
    brandName: settings?.brandName ?? '',
    section: mapPageSections(sectionsRes)['blog.post'] ?? null,
  };
}

export default function BlogPost() {
  const {article, recent, section} = useLoaderData<typeof loader>();
  const t = useT();
  const shortDate = useArticleDateShort();

  const readTime = t('blog.read_time', '{minutes} min read', {minutes: article.minutes});

  const stories: Story[] = recent.map((r) => ({
    href: `/blog/${r.handle}`,
    image: {src: r.image, alt: r.imageAlt || r.title},
    category: r.tags[0] ?? '',
    title: r.title,
    date: shortDate(r.dateParts),
    readTime: t('blog.read_time', '{minutes} min read', {minutes: r.minutes}),
  }));

  return (
    <>
      <SiteNavbar />
      <main id="main-content">
        <BlogArticle
          heroImage={
            section?.image ? {src: section.image.url, alt: section.image.alt} : undefined
          }
          title={article.title}
          date={shortDate(article.dateParts)}
          readTime={readTime}
          featuredImage={
            article.image
              ? {src: article.image, alt: article.imageAlt || article.title}
              : null
          }
          breadcrumb={
            <Link
              to="/blog"
              className="text-label font-bold uppercase tracking-[0.16em] text-white [text-shadow:0_1px_10px_rgba(60,25,8,0.4)]"
            >
              <span aria-hidden="true">&larr;</span>{' '}
              {section?.labelSecondary || t('post.back_to_journal', 'Journal')}
            </Link>
          }
        >
          {/* Authored in Shopify Admin, so the HTML is first-party. */}
          <div dangerouslySetInnerHTML={{__html: article.contentHtml}} />
        </BlogArticle>

        <RecentStories
          eyebrow={section?.eyebrow || undefined}
          title={section?.heading || undefined}
          subtitle={section?.subheading[0] || undefined}
          stories={stories}
          ctaLabel={section?.labelPrimary || undefined}
        />
      </main>
      <SiteFooter />
    </>
  );
}
