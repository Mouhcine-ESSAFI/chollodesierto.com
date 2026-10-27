import {metaT, useT} from '~/lib/ui-strings';
import {useLoaderData} from 'react-router';
import type {LoaderFunctionArgs, MetaFunction} from 'react-router';
import {SiteNavbar} from '~/components/SiteNavbar';
import {PageHero} from '~/components/PageHero';
import {Faq} from '~/components/Faq';
import {SiteFooter} from '~/components/SiteFooter';
import {
  SF_FAQS_QUERY,
  SF_SITE_SETTINGS_QUERY,
  SF_PAGE_SECTIONS_QUERY,
  mapFaqs,
  mapSiteSettings,
  mapPageSections,
} from '~/lib/admin-queries';

export const meta: MetaFunction<typeof loader> = ({data, matches}) => {
  const t = metaT(matches);
  const brand = data?.brandName || 'Budget Desert Tour';
  return [
    {title: `${t('meta.faq.title', 'FAQ')} — ${brand}`},
    {
      name: 'description',
      content: t(
        'meta.faq.description',
        'Answers to the most common questions about our 3-day Sahara desert tour from Marrakech.',
      ),
    },
  ];
};

export async function loader({context}: LoaderFunctionArgs) {
  const {storefront} = context;

  const [faqsRes, settingsRes, sectionsRes] = await Promise.all([
    storefront.query(SF_FAQS_QUERY).catch(() => null),
    storefront.query(SF_SITE_SETTINGS_QUERY).catch(() => null),
    storefront.query(SF_PAGE_SECTIONS_QUERY).catch(() => null),
  ]);

  const sections = mapPageSections(sectionsRes);

  return {
    faqs: mapFaqs(faqsRes, 'general'),
    brandName: mapSiteSettings(settingsRes)?.brandName ?? '',
    hero: sections['faq.hero'] ?? null,
    // Each page hero falls back to the booking hero's photo until its own
    // `page_section` image is set in Admin.
    heroFallback: sections['booking.hero']?.image ?? null,
  };
}

export default function FaqPage() {
  const {faqs, hero, heroFallback} = useLoaderData<typeof loader>();
  const t = useT();

  return (
    <>
      <SiteNavbar />
      <main id="main-content">
        <PageHero
          ariaLabel={t('aria.faq.hero', 'Frequently asked questions')}
          heading={hero?.heading || t('faq.hero_heading', 'Everything you asked.')}
          subtext={
            hero?.subheading[0] ||
            t(
              'faq.hero_subtext',
              'The questions travelers send us most, answered in plain words.',
            )
          }
          image={hero?.image?.url || heroFallback?.url || undefined}
          imageAlt={hero?.image?.alt || heroFallback?.alt || ''}
          loading="eager"
        />
        <Faq faqs={faqs.length ? faqs : undefined} flush />
      </main>
      <SiteFooter />
    </>
  );
}
