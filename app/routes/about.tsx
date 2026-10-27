import {useLoaderData} from 'react-router';
import type {LoaderFunctionArgs, MetaFunction} from 'react-router';
import {SiteNavbar} from '~/components/SiteNavbar';
import {AboutHero} from '~/components/AboutHero';
import {AboutStory} from '~/components/AboutStory';
import {AboutValues} from '~/components/AboutValues';
import {AboutPartners} from '~/components/AboutPartners';
import {SiteFooter} from '~/components/SiteFooter';
import {AboutBookingSupports} from '~/components/AboutBookingSupports';
import {Partners} from '~/components/Partners';
import {metaT, useT} from '~/lib/ui-strings';
import {
  SF_VALUE_PROPS_QUERY,
  SF_SITE_SETTINGS_QUERY,
  SF_PAGE_SECTIONS_QUERY,
  SF_PARTNERS_QUERY,
  mapValueProps,
  mapSiteSettings,
  mapPageSections,
  mapPartners,
} from '~/lib/admin-queries';

export const meta: MetaFunction = ({matches}) => {
  const t = metaT(matches);
  return [
    {title: t('meta.about.title', 'About Us — Chollodesierto')},
    {
      name: 'description',
      content: t(
        'meta.about.description',
        "Learn how Chollodesierto was born from a bad tour into one of Morocco's most trusted budget desert experiences.",
      ),
    },
  ];
};

// AboutValues renders inline SVGs keyed by these names, so an unrecognised
// icon coming from the metaobject has to be narrowed to a known one.
const ABOUT_ICONS = ['minibus', 'landscape', 'card', 'heart'] as const;
type AboutIcon = (typeof ABOUT_ICONS)[number];
const toAboutIcon = (s: string): AboutIcon =>
  (ABOUT_ICONS as readonly string[]).includes(s) ? (s as AboutIcon) : 'heart';

export async function loader({context}: LoaderFunctionArgs) {
  const {storefront} = context;

  const [valuePropsRes, settingsRes, sectionsRes, partnersRes] = await Promise.all([
    storefront.query(SF_VALUE_PROPS_QUERY).catch(() => null),
    storefront.query(SF_SITE_SETTINGS_QUERY).catch(() => null),
    storefront.query(SF_PAGE_SECTIONS_QUERY).catch(() => null),
    storefront.query(SF_PARTNERS_QUERY).catch(() => null),
  ]);

  const sections = mapPageSections(sectionsRes);

  const settings = mapSiteSettings(settingsRes);

  return {
    values: mapValueProps(valuePropsRes, 'about_values').map((v) => ({
      ...v,
      icon: toAboutIcon(v.icon),
    })),
    // The three statistic values; their captions are ui_strings, applied in the
    // component below, since the dictionary only reaches components.
    statValues: {
      travelers: settings?.travelersHosted ?? '',
      rating: settings?.ratingValue ?? '',
      founded: settings?.foundedLabel ?? '',
    },
    hero: sections['about.hero'] ?? null,
    story: sections['about.story'] ?? null,
    partnersCopy: sections['about.partners'] ?? null,
    supports: sections['about.supports'] ?? null,
    valuesCopy: sections['about.values'] ?? null,
    networkCopy: sections['about.network'] ?? null,
    partners: mapPartners(partnersRes),
    ratingLabel: settings?.ratingCountLabel ?? '',
    ratingValue: settings?.ratingValue ?? '',
  };
}

export default function AboutPage() {
  const {
    values,
    statValues,
    hero,
    story,
    partnersCopy,
    supports,
    valuesCopy,
    networkCopy,
    partners,
    ratingValue,
    ratingLabel,
  } = useLoaderData<typeof loader>();
  const t = useT();

  // AboutValues wants exactly three stats or none, so drop the lot if any
  // value is missing rather than rendering a lopsided row.
  const stats = [
    {value: statValues.travelers, label: t('about.stat_travelers', 'Travelers hosted')},
    {
      value: statValues.rating,
      label: ratingLabel || t('about.stat_rating', 'Trusted by 3k people'),
      heart: true,
    },
    {value: statValues.founded, label: t('about.stat_agency', 'Local agency')},
  ];

  // Every prop is `|| undefined` so an empty metaobject field falls back to the
  // component's own default rather than rendering a blank heading.
  return (
    <>
      <SiteNavbar />
      <main>
        <AboutHero
          heroImage={hero?.image?.url || undefined}
          heroImageAlt={hero?.image?.alt || undefined}
          titleLines={
            hero && hero.heading.includes('\n')
              ? (hero.heading.split('\n').slice(0, 2) as [string, string])
              : undefined
          }
          body={hero?.body[0] || undefined}
          ctaLabel={hero?.labelPrimary || undefined}
          stat={ratingValue ? {rating: ratingValue, label: ratingLabel} : undefined}
        />
        <AboutStory
          eyebrow={story?.eyebrow || undefined}
          title={story?.heading || undefined}
          paragraphs={story?.body.length ? story.body : undefined}
          quote={story?.quote || undefined}
          author={story?.author || undefined}
          role={story?.labelPrimary || undefined}
          kasbah={story?.images[0] ? {src: story.images[0].url, alt: story.images[0].alt} : undefined}
          camel={story?.images[1] ? {src: story.images[1].url, alt: story.images[1].alt} : undefined}
          campfire={story?.images[2] ? {src: story.images[2].url, alt: story.images[2].alt} : undefined}
        />
        <AboutPartners
          eyebrow={partnersCopy?.eyebrow || undefined}
          title={partnersCopy?.heading || undefined}
          leftParagraphs={partnersCopy?.body.length ? partnersCopy.body : undefined}
          rightParagraphs={
            partnersCopy?.bodySecondary.length ? partnersCopy.bodySecondary : undefined
          }
          statement={partnersCopy?.statement.length ? partnersCopy.statement : undefined}
          images={
            partnersCopy?.images.length
              ? partnersCopy.images.map((i) => ({src: i.url, alt: i.alt}))
              : undefined
          }
        />
        {/* The named partner list, driven by the `partner` metaobjects. */}
        <Partners
          eyebrow={networkCopy?.eyebrow || undefined}
          headline={networkCopy?.heading || undefined}
          subtext={networkCopy?.subheading[0] || undefined}
          partners={partners.length ? partners : undefined}
        />
        <AboutValues
          eyebrow={valuesCopy?.eyebrow || undefined}
          title={valuesCopy?.heading || undefined}
          values={values.length ? values : undefined}
          stats={stats.every((s) => s.value) ? stats : undefined}
        />
        <AboutBookingSupports
          eyebrow={supports?.eyebrow || undefined}
          title={supports?.heading || undefined}
          paragraphs={supports?.body.length ? supports.body : undefined}
          statement={supports?.statement.length ? supports.statement : undefined}
          image={supports?.image ? {src: supports.image.url, alt: supports.image.alt} : undefined}
        />
      </main>
      <SiteFooter />
    </>
  );
}
