import {useLoaderData} from 'react-router';
import type {LoaderFunctionArgs, MetaFunction} from 'react-router';
import {SiteNavbar} from '~/components/SiteNavbar';
import {SiteFooter} from '~/components/SiteFooter';
import {BlogIndex} from '~/components/BlogIndex';
import type {BlogPost} from '~/components/BlogIndex';
import {
  BLOG_ARTICLES_QUERY,
  BLOGS_QUERY,
  mapBlogArticles,
  resolveBlogHandle,
} from '~/lib/queries';
import {
  SF_SITE_SETTINGS_QUERY,
  SF_PAGE_SECTIONS_QUERY,
  mapSiteSettings,
  mapPageSections,
} from '~/lib/admin-queries';
import {metaT, useArticleDateShort, useT} from '~/lib/ui-strings';

export const meta: MetaFunction<typeof loader> = ({data, matches}) => {
  const t = metaT(matches);
  const brand = data?.brandName || 'Chollodesierto';
  return [
    {title: `${t('meta.blog.title', 'Journal')} — ${brand}`},
    {
      name: 'description',
      content: t(
        'meta.blog.description',
        'Stories, route notes and practical advice from our guides in the Moroccan Sahara.',
      ),
    },
  ];
};

export async function loader({context}: LoaderFunctionArgs) {
  const {storefront} = context;

  // The blog handle isn't known up front — it comes from site_settings, so the
  // settings and the blog list have to be read before the articles.
  const [settingsRes, sectionsRes, blogsRes] = await Promise.all([
    storefront.query(SF_SITE_SETTINGS_QUERY).catch(() => null),
    storefront.query(SF_PAGE_SECTIONS_QUERY).catch(() => null),
    storefront.query(BLOGS_QUERY).catch(() => null),
  ]);

  const settings = mapSiteSettings(settingsRes);
  const blogHandle = resolveBlogHandle(blogsRes, settings?.blogHandle);

  const blogRes = await storefront
    .query(BLOG_ARTICLES_QUERY, {variables: {blogHandle, first: 24}})
    .catch(() => null);

  const articles = mapBlogArticles(blogRes);

  // The filter offers each tag actually in use, in first-seen order — newest
  // post first, since the query is sorted by published date.
  const categories: string[] = [];
  for (const a of articles) {
    for (const tag of a.tags) {
      if (!categories.includes(tag)) categories.push(tag);
    }
  }

  return {
    articles,
    categories,
    brandName: settings?.brandName ?? '',
    section: mapPageSections(sectionsRes)['blog.index'] ?? null,
  };
}

export default function BlogIndexRoute() {
  const {articles, categories, section} = useLoaderData<typeof loader>();
  const t = useT();
  const shortDate = useArticleDateShort();

  const toPost = (a: (typeof articles)[number]): BlogPost => ({
    href: `/blog/${a.handle}`,
    image: {src: a.image, alt: a.imageAlt || a.title},
    // The first tag is the card's category label; the rest still drive filtering.
    category: a.tags[0] ?? '',
    title: a.title,
    excerpt: a.excerpt || undefined,
    date: shortDate(a.dateParts),
    readTime: t('blog.read_time', '{minutes} min read', {minutes: a.minutes}),
  });

  // Newest post leads as the featured card; the rest fill the grid.
  const [newest, ...rest] = articles;

  return (
    <>
      <SiteNavbar />
      <BlogIndex
        heroImage={
          section?.image ? {src: section.image.url, alt: section.image.alt} : undefined
        }
        title={section?.heading || undefined}
        subtitle={section?.subheading[0] || undefined}
        featured={newest ? toPost(newest) : null}
        categories={categories}
        posts={rest.map(toPost)}
        emptyBody={section?.body[0] || undefined}
        emptyCtaLabel={section?.labelPrimary || undefined}
      />
      <SiteFooter />
    </>
  );
}
