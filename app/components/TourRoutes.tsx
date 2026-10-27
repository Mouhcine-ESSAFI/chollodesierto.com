import {Fragment} from 'react';
import {SafeImage} from './SafeImage';
import {useT} from '~/lib/ui-strings';

interface RouteStop {
  label: string;
}

interface Route {
  id: string;
  label: string;          // small heading above the image (side cards) — empty for the featured card
  featured?: boolean;
  badge?: string;         // dark ribbon text on the featured card ("Most Popular")
  image: string;
  imageAlt: string;
  /** Trip length in days. The word "Days" is a ui_string, added on render. */
  days: number;
  title: string;
  stops: [RouteStop, RouteStop, RouteStop];  // start · mid · end
  description: string[];  // each entry is its own line
  price: string;          // e.g. "€155"
  href: string;
}

const ROUTES: Route[] = [
  {
    id: 'reverse',
    label: 'Coming From the North?',
    image: 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=800&q=80',
    imageAlt: 'Ornate gates of the medina in Fez',
    days: 3,
    title: 'The Reverse Crossing',
    stops: [{label: 'Fez'}, {label: 'Merzouga'}, {label: 'Marrakech'}],
    description: ['Start in the imperial city,', 'end in the red one.'],
    price: '€155',
    href: '/booking?route=reverse-crossing',
  },
  {
    id: 'classic',
    label: '',
    featured: true,
    badge: 'Most Popular',
    image: 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=800&q=80',
    imageAlt: 'Marrakech Jemaa el-Fna square at dusk',
    days: 3,
    title: 'The Classic Loop',
    stops: [{label: 'Marrakech'}, {label: 'Merzouga'}, {label: 'Marrakech'}],
    description: ['The complete circle.', 'Perfect if Marrakech is your home base.'],
    price: '€85',
    href: '/booking?route=classic-loop',
  },
  {
    id: 'grand',
    label: 'Best for Travelers Heading North',
    image: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80',
    imageAlt: 'Camel caravan crossing the Sahara dunes at sunrise',
    days: 3,
    title: 'The Grand Crossing',
    stops: [{label: 'Marrakech'}, {label: 'Merzouga'}, {label: 'Fez'}],
    description: ['One way.', 'Two imperial cities.', 'An endless desert in between.'],
    price: '€115',
    href: '/booking?route=grand-crossing',
  },
];

export interface TourRoutesProps {
  eyebrow?: string;
  heading?: string;
  subheading?: string[];
  routes?: Route[];
}

export function TourRoutes({
  eyebrow = 'Choose your route',
  heading = 'Pick your path through Morocco',
  subheading = ['Three routes, one unforgettable desert.', 'Choose the one that fits your trip.'],
  routes = ROUTES,
}: TourRoutesProps) {
  const t = useT();
  return (
    <section id="routes" aria-label={t('aria.routes.section', 'Choose your route')} className="bg-linear-to-b from-white to-sand py-section">
      {/* ── Heading block ── */}
      <div className="container max-w-content text-center">
        <p className="text-label font-bold uppercase text-primary">{eyebrow}</p>
        <div className="mt-2 flex justify-center" aria-hidden="true">
          <svg width="64" height="16" viewBox="0 0 64 16" fill="none">
            <svg width="50" height="18" viewBox="0 0 50 18" fill="none" aria-hidden="true">
              <path d="M3 10 L25 6 L20 10 L40 9" stroke="#C15A2B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </svg>
        </div>
        <h2 className="py-3 text-h2 font-display text-dark">
          {heading}
        </h2>
        <p className="pb-16 text-dark text-base">
          {subheading.map((line, i) => (
            <Fragment key={i}>
              {line}
              {i < subheading.length - 1 && <br />}
            </Fragment>
          ))}
        </p>
      </div>

      {/* ── Cards (each side card carries its own sand panel; section bg fades white→sand so the panels blend into the lower region) ── */}
      <div className="container mt-route-cards max-w-content pb-route-bottom">
        <ul
          role="list"
          className="mx-auto grid max-w-110 grid-cols-1 items-start gap-15
                     lg:max-w-none lg:grid-cols-3 lg:gap-6
                     [&>li.is-featured]:lg:-translate-y-14"
        >
          {routes.map((route) => (
            <RouteCard key={route.id} route={route} />
          ))}
        </ul>
      </div>
    </section>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function RouteCard({route}: {route: Route}) {
  return (
    <li className={`relative flex flex-col items-center ${route.featured ? 'is-featured' : ''}`}>
      {route.featured ? (
        <div className="rounded-route-sm bg-dark shadow-card">
          <p className="py-1.5 text-center text-label font-display text-white">{route.badge}</p>
          <CardImage route={route} featured />
          <div className="relative -mt-4 min-h-62 rounded-route-sm bg-white px-6 pb-20 pt-7">
            <CardBody route={route} />
          </div>
        </div>
      ) : (
        <div className="rounded-route-sm bg-sand shadow-card">
          <p className="py-1.5 text-center text-label font-display text-dark">{route.label}</p>
          <CardImage route={route} />
          <div className="relative -mt-4 min-h-62 rounded-route-sm bg-white px-6 pb-16 pt-7">
            <CardBody route={route} />
          </div>
        </div>
      )}
      <PriceBar route={route} />
    </li>
  );
}

function CardImage({route, featured}: {route: Route; featured?: boolean}) {
  const t = useT();
  return (
    <div className="relative h-65 overflow-hidden rounded-t-route-sm">
      <SafeImage src={route.image} alt={route.imageAlt} className="h-full w-full object-cover" loading="lazy" />
      {featured && (
        <span role="img" aria-label={t('aria.routes.medal', 'Medal')} className="absolute top-0 left-1/2 -translate-x-1/2 text-4xl">
          🏅
        </span>
      )}
      <span aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-transparent from-[80%] to-black"
      />
      <div className="route-text-shadow absolute inset-x-4 bottom-6 flex gap-4 text-xs font-display text-white justify-center">
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <ClockIcon /> {route.days} {t('routes.days_unit', 'Days')}
        </span>
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <CheckIcon /> {t('routes.free_cancellation', 'Free Cancellation')}
        </span>
      </div>
    </div>
  );
}

function CardBody({route}: {route: Route}) {
  return (
    <>
      <h3 className="mb-6 text-center text-h3 font-bold text-dark">{route.title}</h3>
      <RouteMap stops={route.stops} />
      <p className="text-center text-base text-dark">
        {route.description.map((line, i) => (
          <Fragment key={i}>
            {line}
            {i < route.description.length - 1 && <br />}
          </Fragment>
        ))}
      </p>
    </>
  );
}

function RouteMap({stops}: {stops: Route['stops']}) {
  return (
    <div className="relative mb-6">
      <div className="absolute left-1/6 right-1/6 top-1/8 border-t-2 border-dashed border-primary" />
      <div className="relative flex justify-between">
        {stops.map((stop, i) => (
          <div key={i} className="flex w-1/3 flex-col items-center gap-2.75">
            <span
              className={`h-3 w-3 rounded-full ${
                i === 1 ? 'border-2 border-primary bg-white' : 'bg-primary'
              }`}
            />
            <span className="text-xs font-medium text-primary">{stop.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PriceBar({route}: {route: Route}) {
  const t = useT();
  return (
    <div className="absolute -bottom-7.5 flex h-18 items-center rounded-full bg-white pr-2 shadow-card-m w-76 justify-end">
      <div className="flex flex-col text-center pr-4">
        <span className="text-label-2xs font-bold uppercase text-forest -mb-1">{t('routes.per_person', 'Per person')}</span>
        <span className="text-price font-display text-forest">{route.price}</span>
      </div>
      <a
        href={route.href}
        className="ml-aut flex h-15 items-center gap-2 whitespace-nowrap rounded-full bg-primary px-6 text-btn font-display text-white"
      >
        {t('routes.cta', 'Choose this route')} <span aria-hidden="true">→</span>
      </a>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default TourRoutes;
