import {useMemo, useState} from 'react';
import {useT} from '~/lib/ui-strings';
import {useFetcher} from 'react-router';

// ── Types (exported — loader maps Shopify metaobjects to these shapes) ──────

export interface RouteOption {
  id: string;
  stops: [string, string, string];
  price: number;
}

export interface CampOption {
  id: string;
  name: string;
  priceLabel: string;
  priceValue: string;
  delta: number;
  image: string;
  imageAlt: string;
}

export interface ExtraOption {
  id: string;
  label: string;
  /** The product variant's own name, when the label is built from it. */
  variantTitle?: string;
  eyebrow: string;
  price: number;
  priceDisplay: string;
  image: string;
  imageAlt: string;
  variantId: string;
  max?: number;
  defaultQty?: number;
}

export interface TransferConfig {
  onewayPrice: number;
  returnPrice: number;
  onewayVariantId: string;
  returnVariantId: string;
  image: string;
  imageAlt: string;
}

// ── Defaults (static fallback until Shopify metaobjects are wired) ──────────

export const DEFAULT_ROUTES: RouteOption[] = [
  {id: 'classic-loop', stops: ['Marrakech', 'Merzouga', 'Marrakech'], price: 85},
  {id: 'grand-crossing', stops: ['Marrakech', 'Merzouga', 'Fez'], price: 115},
  {id: 'reverse-crossing', stops: ['Fez', 'Merzouga', 'Marrakech'], price: 155},
];

export const DEFAULT_CAMPS: CampOption[] = [
  {
    id: 'shared',
    name: 'Shared Camp',
    priceLabel: 'In price',
    priceValue: 'Included',
    delta: 0,
    image:
      'https://images.unsplash.com/photo-1542401886-65d6c61db217?auto=format&fit=crop&w=500&q=80',
    imageAlt: 'Shared Berber tent camp',
  },
  {
    id: 'comfort',
    name: 'Comfort Camp',
    priceLabel: 'Per person',
    priceValue: '+€15',
    delta: 15,
    image:
      'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?auto=format&fit=crop&w=500&q=80',
    imageAlt: 'Comfort private tent camp',
  },
  {
    id: 'superior',
    name: 'Superior Camp',
    priceLabel: 'Per person',
    priceValue: '+€45',
    delta: 45,
    image:
      'https://images.unsplash.com/photo-1597212618440-806262de4f6b?auto=format&fit=crop&w=500&q=80',
    imageAlt: 'Superior luxury suite tent',
  },
];

// Tour variants are keyed by `${routeId}-${campId}` — one ProductVariant per
// route × camp tier combination on the "3-Day Sahara Tour" product. The ids are
// the Shopify metaobject handles, so the fallback data above and live
// `tour_route` / `camp_tier` entries resolve through the same keys.
export const DEFAULT_TOUR_VARIANT_IDS: Record<string, string> = {
  'classic-loop-shared': 'gid://shopify/ProductVariant/43295619022946',
  'classic-loop-comfort': 'gid://shopify/ProductVariant/43295619055714',
  'classic-loop-superior': 'gid://shopify/ProductVariant/43295619088482',
  'grand-crossing-shared': 'gid://shopify/ProductVariant/43295619121250',
  'grand-crossing-comfort': 'gid://shopify/ProductVariant/43295619154018',
  'grand-crossing-superior': 'gid://shopify/ProductVariant/43295619186786',
  'reverse-crossing-shared': 'gid://shopify/ProductVariant/43295619219554',
  'reverse-crossing-comfort': 'gid://shopify/ProductVariant/43295619252322',
  'reverse-crossing-superior': 'gid://shopify/ProductVariant/43295619285090',
};

export const DEFAULT_EXTRAS: ExtraOption[] = [
  {
    id: 'quad-individual',
    label: 'Individual Quad',
    eyebrow: 'Per quad',
    price: 45,
    priceDisplay: '+€45',
    image:
      'https://images.unsplash.com/photo-1542401886-65d6c61db217?auto=format&fit=crop&w=300&q=80',
    imageAlt: 'Individual quad bike in the dunes',
    variantId: 'gid://shopify/ProductVariant/43295619317858',
    max: 10,
    defaultQty: 0,
  },
  {
    id: 'quad-double',
    label: 'Double Quad',
    eyebrow: 'Per quad',
    price: 65,
    priceDisplay: '+€65',
    image:
      'https://images.unsplash.com/photo-1517824806704-9040b037703b?auto=format&fit=crop&w=300&q=80',
    imageAlt: 'Two travelers on a double quad bike',
    variantId: 'gid://shopify/ProductVariant/43295619350626',
    max: 10,
    defaultQty: 0,
  },
];

export const DEFAULT_TRANSFER: TransferConfig = {
  onewayPrice: 25,
  returnPrice: 45,
  onewayVariantId: 'gid://shopify/ProductVariant/43295619383394',
  returnVariantId: 'gid://shopify/ProductVariant/43295619416162',
  image:
    'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=300&q=80',
  imageAlt: 'Private airport transfer vehicle',
};

export interface PriceIncludeItem {
  icon: string;
  title: string;
  subtitle: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export const DEFAULT_PRICE_INCLUDES: PriceIncludeItem[] = [
  {icon: '🚐', title: 'Transport', subtitle: 'AC minibus'},
  {icon: '🐪', title: 'Camel trek', subtitle: 'into Erg Chebbi'},
  {icon: '🏰', title: 'Accommodation', subtitle: '2 nights'},
  {icon: '🍽️', title: '2 Meals', subtitle: '2 breakfasts, 2 dinners'},
  {icon: '🎶', title: 'Berber music', subtitle: 'at night around the fire'},
  {icon: '🌅', title: 'Sunrise climb', subtitle: 'Dune climbing experience'},
  {icon: '🛑', title: 'Stops', subtitle: 'at Ait Ben Haddou…'},
  {icon: '🏂', title: 'Sandboarding', subtitle: 'Dune sandboarding'},
  {icon: '🚐', title: 'Pickup', subtitle: 'from your Riad/Hotel'},
];

export const DEFAULT_FAQS: FaqItem[] = [
  {
    question: 'What if I need to cancel?',
    answer:
      "Free cancellation up to 7 days before departure. After that, 50% refund. Within 48h, non-refundable. We get it though — email or WhatsApp us, we're human.",
  },
  {
    question: 'When am I charged?',
    answer:
      'You pay 20% now to book your spot. The rest is due 48 hours before departure — by card, bank transfer or cash on arrival.',
  },
  {
    question: 'What about pickup?',
    answer:
      'We pick you up directly from your Riad or Hotel in Marrakech (or Fez, depending on your route) at the time confirmed the day before departure.',
  },
  {
    question: 'Can I change my date after booking?',
    answer:
      'Yes — free of charge up to 7 days before departure, subject to availability. Just message us on WhatsApp.',
  },
  {
    question: 'What if my group changes?',
    answer:
      "No problem. Let us know the new number of travelers as early as possible and we'll adjust your quote and camp arrangements.",
  },
];

// ── Internal helpers ────────────────────────────────────────────────────────

// The calendar's day and month names are ui_strings, not Intl output: the
// storefront has no locale of its own, and Intl on the client would disagree
// with the server render. Keys are stable; only the Text changes per store.
const WEEKDAY_KEYS = [
  ['cal.mon', 'Mo'],
  ['cal.tue', 'Tu'],
  ['cal.wed', 'We'],
  ['cal.thu', 'Th'],
  ['cal.fri', 'Fr'],
  ['cal.sat', 'Sa'],
  ['cal.sun', 'Su'],
] as const;

const MONTH_KEYS = [
  ['cal.january', 'January'],
  ['cal.february', 'February'],
  ['cal.march', 'March'],
  ['cal.april', 'April'],
  ['cal.may', 'May'],
  ['cal.june', 'June'],
  ['cal.july', 'July'],
  ['cal.august', 'August'],
  ['cal.september', 'September'],
  ['cal.october', 'October'],
  ['cal.november', 'November'],
  ['cal.december', 'December'],
] as const;

/** Short day names as rendered in the summary line ("Mon, Sep 21"). */
const SHORT_DAY_KEYS = [
  ['cal.short_sun', 'Sun'],
  ['cal.short_mon', 'Mon'],
  ['cal.short_tue', 'Tue'],
  ['cal.short_wed', 'Wed'],
  ['cal.short_thu', 'Thu'],
  ['cal.short_fri', 'Fri'],
  ['cal.short_sat', 'Sat'],
] as const;

const SHORT_MONTH_KEYS = [
  ['cal.short_jan', 'Jan'],
  ['cal.short_feb', 'Feb'],
  ['cal.short_mar', 'Mar'],
  ['cal.short_apr', 'Apr'],
  ['cal.short_may', 'May'],
  ['cal.short_jun', 'Jun'],
  ['cal.short_jul', 'Jul'],
  ['cal.short_aug', 'Aug'],
  ['cal.short_sep', 'Sep'],
  ['cal.short_oct', 'Oct'],
  ['cal.short_nov', 'Nov'],
  ['cal.short_dec', 'Dec'],
] as const;

/** Month names used by buildMonthCells, which runs outside the component. */
const MONTH_NAMES = MONTH_KEYS.map(([, en]) => en);

type TransferType = 'oneway' | 'return';

interface DayCell {
  day: number | '';
  blank: boolean;
  date: Date | null;
  isStart: boolean;
  isEnd: boolean;
  inRange: boolean;
}

function sameDay(a: Date | null, b: Date | null) {
  return (
    !!a &&
    !!b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * `YYYY-MM-DD` from the date's own calendar day.
 *
 * Not `toISOString()`: that converts to UTC first, so a date picked in the
 * evening west of Greenwich — or any evening in a positive-offset zone — can
 * come out as the day before. The booking backend takes this literally.
 */
function toIsoDate(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

function addDays(d: Date, n: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function buildMonthCells(
  year: number,
  monthIndex: number,
  departDate: Date,
  returnDate: Date,
): DayCell[] {
  const first = new Date(year, monthIndex, 1);
  const startWeekday = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: DayCell[] = [];
  for (let i = 0; i < startWeekday; i++) {
    cells.push({
      day: '',
      blank: true,
      date: null,
      isStart: false,
      isEnd: false,
      inRange: false,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, monthIndex, d);
    cells.push({
      day: d,
      blank: false,
      date,
      isStart: sameDay(date, departDate),
      isEnd: sameDay(date, returnDate),
      inRange: date > departDate && date < returnDate,
    });
  }
  return cells;
}

// ── Component ───────────────────────────────────────────────────────────────

export interface BookingBodyProps {
  /**
   * Sent with every cart line as the `_tour_type` property. The booking
   * backend maps it to Private / Shared.
   */
  tourType?: string;
  routes?: RouteOption[];
  camps?: CampOption[];
  extras?: ExtraOption[];
  transfer?: TransferConfig;
  priceIncludes?: PriceIncludeItem[];
  faqs?: FaqItem[];
  whatsappHref?: string;
  /** Route handle from ?route= on /booking, used to preselect the route. */
  initialRouteId?: string;
}

export function BookingBody({
  routes = DEFAULT_ROUTES,
  camps = DEFAULT_CAMPS,
  extras: extrasProp = DEFAULT_EXTRAS,
  transfer = DEFAULT_TRANSFER,
  priceIncludes = DEFAULT_PRICE_INCLUDES,
  faqs = DEFAULT_FAQS,
  whatsappHref = '#whatsapp',
  initialRouteId,
  tourType = 'Shared',
}: BookingBodyProps) {
  const t = useT();
  // Day and month names, translated once per render.
  const weekdays = WEEKDAY_KEYS.map(([k, en]) => t(k, en));
  const monthNames = MONTH_KEYS.map(([k, en]) => t(k, en));
  const shortDays = SHORT_DAY_KEYS.map(([k, en]) => t(k, en));
  const shortMonths = SHORT_MONTH_KEYS.map(([k, en]) => t(k, en));

  // An extra sourced from the quad product carries only the variant's own name
  // ("Double"); the noun is a ui_string, applied once here so every place that
  // shows the label — cards, headings, the summary — stays in step.
  const extras = useMemo(
    () =>
      extrasProp.map((e) =>
        e.variantTitle
          ? {...e, label: t('booking.quad_label', '{variant} Quad', {variant: e.variantTitle})}
          : e,
      ),
    [extrasProp, t],
  );
  // `initialRouteId` comes from ?route= on /booking, resolved server-side so the
  // right route is selected in the first render rather than flashing.
  const [routeId, setRouteId] = useState(
    initialRouteId && routes.some((r) => r.id === initialRouteId)
      ? initialRouteId
      : routes[0].id,
  );
  // The first card is the tier included in the trip price, so the form opens on
  // the cheapest honest total and any upgrade is the traveler's own choice.
  const [campId, setCampId] = useState(camps[0].id);
  const [monthOffset, setMonthOffset] = useState(0);
  const [openFaq, setOpenFaq] = useState(-1);
  const DEFAULT_TRIP_DAYS = 2;
  const [departDate, setDepartDate] = useState(() => new Date());
  const [returnDate, setReturnDate] = useState(() => addDays(new Date(), DEFAULT_TRIP_DAYS),);
  // Which month the left-hand pane starts on, fixed at mount. Deriving it from
  // departDate meant that picking a day in the right-hand pane pushed the base
  // forward a month, so both panes jumped and the day you clicked slid out of
  // view. Only the arrows move the view now.
  const [monthAnchor] = useState(() => {
    const d = new Date();
    return {year: d.getFullYear(), month: d.getMonth()};
  });
  // Defaults to a single traveler; the shopper adjusts from there.
  const [travelers, setTravelers] = useState(1);
  const [extraQtys, setExtraQtys] = useState<Record<string, number>>(() =>
    Object.fromEntries(extras.map((e) => [e.id, e.defaultQty ?? 0])),
  );
  const [transferEnabled, setTransferEnabled] = useState(false);
  const [transferType, setTransferType] = useState<TransferType>('oneway');
  const [validationError, setValidationError] = useState<string | null>(null);

  const fetcher = useFetcher<{error?: string}>();
  const isReserving = fetcher.state !== 'idle';

  const monthBaseYear = monthAnchor.year;
  const monthBaseIndex = monthAnchor.month;

  const selectedRoute = routes.find((r) => r.id === routeId) ?? routes[0];
  const selectedCamp = camps.find((c) => c.id === campId) ?? camps[0];

  const months = useMemo(() => {
    return [0, 1].map((offsetFromBase) => {
      const total = monthBaseIndex + monthOffset + offsetFromBase;
      const year = monthBaseYear + Math.floor(total / 12);
      const monthIndex = ((total % 12) + 12) % 12;
      return {
        label: `${monthNames[monthIndex]} ${year}`,
        cells: buildMonthCells(year, monthIndex, departDate, returnDate),
      };
    });
  }, [monthOffset, departDate, returnDate, monthNames]);

  const transferPrice =
    transferType === 'oneway' ? transfer.onewayPrice : transfer.returnPrice;
  const transferTypeLabel = transferType === 'oneway' ? 'One way' : 'Return';

  const total =
    selectedRoute.price * travelers +
    selectedCamp.delta * travelers +
    extras.reduce((sum, e) => sum + (extraQtys[e.id] ?? 0) * e.price, 0) +
    (transferEnabled ? transferPrice : 0);

  const dow = shortDays[
    departDate.getDay()
  ];
  const mon = shortMonths[departDate.getMonth()];
  const whenLeaveText = t('booking.when_leave', '{day}, {month} {date}', {
    day: dow,
    month: mon,
    date: departDate.getDate(),
  });

  // The long localized date the shopper sees on their confirmation email.
  const departDateDisplay = t('booking.attr_date_value', '{day} {month} {year}', {
    day: departDate.getDate(),
    month: monthNames[departDate.getMonth()],
    year: departDate.getFullYear(),
  });

  const pickDate = (date: Date) => {
    const end = addDays(date, DEFAULT_TRIP_DAYS);
    setDepartDate(date);
    setReturnDate(end);

    // A trip started near the end of the right-hand month finishes in a month
    // the calendar is not showing, so the highlighted range just runs off the
    // edge. Nudge the view forward by the smallest number of months that
    // brings the final day into sight — and only when it is actually hidden,
    // so every pick that already fits leaves the calendar where it is.
    setMonthOffset((offset) => {
      const rightPane = monthAnchor.year * 12 + monthAnchor.month + offset + 1;
      const endMonth = end.getFullYear() * 12 + end.getMonth();
      const hiddenBy = endMonth - rightPane;
      return hiddenBy > 0 ? offset + hiddenBy : offset;
    });
  };

  const changeExtraQty = (id: string, delta: number, max: number) => {
    setExtraQtys((q) => ({
      ...q,
      [id]: Math.min(max, Math.max(0, (q[id] ?? 0) + delta)),
    }));
  };

  const handleReserve = () => {
    const tourVariantId = DEFAULT_TOUR_VARIANT_IDS[`${routeId}-${campId}`];
    if (!tourVariantId) {
      setValidationError(
        'This route and camp combination is not bookable right now. Please try a different one or WhatsApp us.',
      );
      return;
    }

    if (travelers < 1) {
      setValidationError(
        t('booking.travelers_required', 'Please choose how many travelers are coming.'),
      );
      return;
    }

    /**
     * Booking details, attached to every line.
     *
     * Two entries per field: a localized one the shopper sees in their
     * confirmation email, and a canonical `_`-prefixed one the booking backend
     * parses. Shopify hides `_` properties from the cart, checkout and email
     * while still sending them in the order payload.
     *
     * Only the fields the form already collects are here — see the note below.
     *
     * The canonical names deliberately bypass t() — a translated name would
     * change per locale and break the backend.
     */
    const attributes: Array<{key: string; value: string}> = [
      {key: t('booking.attr_arrival_date', 'Arrival date'), value: departDateDisplay},
      {key: '_arrival_date', value: toIsoDate(departDate)},
      {key: t('booking.attr_tour_type', 'Tour type'), value: tourType},
      {key: '_tour_type', value: tourType},
    ];
    // NOTE: the contract also requires `_pickup_address` and optionally
    // `_arrival_time`. Neither is sent, because the booking form has no field
    // that collects them and adding one changes the customer-facing layout —
    // that is the store owner's decision, not this code's. See the handover
    // note; once a field exists, mirror it here the same way.

    // Every line carries them: the backend turns each line item into its own
    // internal order and parses the booking details from that line alone.
    const lines: Array<{
      merchandiseId: string;
      quantity: number;
      attributes: Array<{key: string; value: string}>;
    }> = [{merchandiseId: tourVariantId, quantity: travelers, attributes}];

    for (const extra of extras) {
      const qty = extraQtys[extra.id] ?? 0;
      if (qty > 0) {
        lines.push({merchandiseId: extra.variantId, quantity: qty, attributes});
      }
    }

    if (transferEnabled) {
      const transferVariantId =
        transferType === 'oneway'
          ? transfer.onewayVariantId
          : transfer.returnVariantId;
      lines.push({merchandiseId: transferVariantId, quantity: 1, attributes});
    }

    setValidationError(null);
    fetcher.submit(
      {intent: 'create-cart', lines: JSON.stringify(lines)},
      {method: 'post'},
    );
  };

  const reserveError = validationError ?? fetcher.data?.error ?? null;

  return (
    <section aria-label={t('booking.aria_form', 'Booking form')} className="bg-sand pt-5 pb-section">
      <div className="container max-w-content">
        <div className="grid grid-cols-12 items-start gap-x-4 gap-y-12 lg:gap-x-6">
          {/* ── Steps column ── */}
          <div className="relative col-span-12 lg:col-span-7 lg:row-start-1">
            {/* Step 1 — Route */}
            <Step
              number={1}
              first
              title={t('booking.step1_title', 'Choose your route.')}
              description={t(
                'booking.step1_desc',
                'Where do you start, where do you end?',
              )}
            >
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                {routes.map((r) => {
                  const selected = r.id === routeId;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRouteId(r.id)}
                      aria-pressed={selected}
                      className={`flex min-h-28 items-center justify-between gap-4 rounded-card border-2 p-5 text-left transition-colors shadow-card ${
                        selected
                          ? 'border-transparent bg-primary'
                          : 'border-transparent bg-white hover:border-primary'
                      }`}
                    >
                      <div className="flex flex-col justify-center items-center">
                        <p
                          className={`text-label-2xs uppercase -mb-1.5 font-bold ${selected ? 'text-white' : 'text-forest'}`}
                        >
                          {t('booking.per_person', 'Per Person')}
                        </p>
                        <p
                          className={`font-display text-price ${selected ? 'text-white' : 'text-forest'}`}
                        >
                          €{r.price}
                        </p>
                      </div>
                      <div className="flex flex-col">
                        {r.stops.map((name, i) => (
                          <div key={name + i} className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-block h-3 w-3 shrink-0 rounded-full ${
                                  i === 1
                                    ? `border-2 ${selected ? 'border-white bg-primary' : 'border-primary bg-white'}`
                                    : selected
                                      ? 'bg-white'
                                      : 'bg-primary'
                                }`}
                              />
                              <span
                                className={`text-xs font-medium ${selected ? 'text-white' : 'text-primary'}`}
                              >
                                {name}
                              </span>
                            </div>

                            {i < r.stops.length - 1 && (
                              <span
                                aria-hidden="true"
                                className="ml-1.25 my-0.5 block h-3 w-0.5"
                                style={{
                                  backgroundImage: `repeating-linear-gradient(to bottom, ${
                                    selected ? '#fff' : 'var(--color-primary)'
                                  } 0 4px, transparent 4px 7px)`,
                                }}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Step>

            {/* Step 2 — Camp */}
            <Step
              number={2}
              title={t('booking.step2_title', 'Choose your camp.')}
              description={t(
                'booking.step2_desc',
                'Same stars. Same fire. Different pillow.',
              )}
            >
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                {camps.map((c) => {
                  const selected = c.id === campId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCampId(c.id)}
                      aria-pressed={selected}
                      className={`flex min-h-28 items-center justify-between gap-3.5 rounded-card border-2 p-5 text-left transition-colors shadow-card ${
                        selected
                          ? 'border-transparent bg-primary'
                          : 'border-transparent bg-white hover:border-primary'
                      }`}
                    >
                      <div className="flex flex-col justify-center items-center">
                        <p
                          className={`text-label-2xs uppercase -mb-1.5 font-bold ${selected ? 'text-white' : 'text-forest'}`}
                        >
                          {c.priceLabel}
                        </p>
                        <p
                          className={`font-display ${/\d/.test(c.priceValue) ? 'text-price' : 'text-base'} ${selected ? 'text-white' : 'text-forest'}`}
                        >
                          {c.priceValue}
                        </p>
                      </div>
                      <div
                        className={`self-stretch border-l-2 border-dashed ${selected ? 'border-white' : 'border-primary'}`}
                      />
                      <p
                        className={`flex-1 text-left text-label ${selected ? 'text-white' : 'text-dark'}`}
                      >
                        {c.name}
                      </p>
                    </button>
                  );
                })}
              </div>
            </Step>

            {/* Step 3 — Date */}
            <Step
              number={3}
              title={t('booking.step3_title', 'Pick your date.')}
              description={t('booking.step3_desc', 'When do you want to leave?')}
            >
              <div className="rounded-card bg-white p-4.5 sm:p-7 shadow-card">
                <div className="grid grid-cols-1 gap-7 sm:grid-cols-2">
                  {months.map((m) => (
                    <div key={m.label}>
                      <div className="mb-3.5 flex items-center justify-between">
                        <button
                          type="button"
                          aria-label={t('booking.aria_prev_month', 'Previous month')}
                          onClick={() => setMonthOffset((o) => o - 1)}
                          className="flex size-8 items-center justify-center rounded-full border border-dark/15 bg-dark text-white"
                        >
                          &lsaquo;
                        </button>
                        <p className="text-base font-bold text-dark">
                          {m.label}
                        </p>
                        <button
                          type="button"
                          aria-label={t('booking.aria_next_month', 'Next month')}
                          onClick={() => setMonthOffset((o) => o + 1)}
                          className="flex size-8 items-center justify-center rounded-full border border-dark/15 bg-dark text-white"
                        >
                          &rsaquo;
                        </button>
                      </div>
                      <div className="mb-1.5 grid grid-cols-7 gap-0.5 border-b-2 border-dark/5">
                        {weekdays.map((wd) => (
                          <span
                            key={wd}
                            className="py-1 text-center text-xs font-semibold text-dark/40"
                          >
                            {wd}
                          </span>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-0.5">
                        {m.cells.map((cell, ci) => (
                          <button
                            key={ci}
                            type="button"
                            disabled={cell.blank}
                            onClick={() => cell.date && pickDate(cell.date)}
                            className={`aspect-square rounded-full text-label font-bold ${
                              cell.blank
                                ? 'invisible'
                                : cell.isStart || cell.isEnd
                                  ? 'bg-primary font-bold text-white'
                                  : cell.inRange
                                    ? 'bg-primary/18 font-semibold text-primary'
                                    : 'bg-transparent text-dark/80'
                            }`}
                          >
                            {cell.day}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </Step>

            {/* Step 4 — Travelers */}
            <Step
              number={4}
              title={t('booking.step4_title', 'How many travelers?')}
              description={t(
                'booking.step4_desc',
                'Solo? Couple? Whole crew? Up to 17.',
              )}
            >
              <div className="flex items-center gap-5">
                <button
                  type="button"
                  aria-label={t('booking.aria_decrease_travelers', 'Decrease travelers')}
                  onClick={() => setTravelers((t) => Math.max(0, t - 1))}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-white hover:bg-primary text-4xl text-primary hover:text-white shadow-card"
                >
                  &minus;
                </button>
                <span className="min-w-8 text-center font-display text-4xl font-bold text-dark">
                  {travelers}
                </span>
                <button
                  type="button"
                  aria-label={t('booking.aria_increase_travelers', 'Increase travelers')}
                  onClick={() => setTravelers((t) => Math.min(17, t + 1))}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-white hover:bg-primary text-4xl text-primary hover:text-white shadow-card"
                >
                  +
                </button>
              </div>
            </Step>

            {/* Step 5 — Extras */}
            <Step
              number={5}
              title={t('booking.step5_title', 'Make your adventure more fun.')}
              description={t(
                'booking.step5_desc',
                'Optional activities to make your journey more enjoyable.',
              )}
              last
            >
              {extras.map((extra, idx) => (
                <div key={extra.id}>
                  <p className="mb-4 text-h3 font-bold text-dark">
                    {t('booking.extra_qty_prefix', 'How many')}{' '}
                    {extra.label.toLowerCase()}{' '}
                    {t('booking.extra_qty_suffix', 'do you need?')}
                  </p>
                  <div
                    className={`flex flex-wrap items-center justify-between gap-5 ${idx < extras.length - 1 ? 'mb-6' : 'mb-12'}`}
                  >
                    <TicketCard
                      eyebrow={t('booking.per_quad', extra.eyebrow)}
                      price={extra.priceDisplay}
                      label={extra.label}
                      image={extra.image}
                      imageAlt={extra.imageAlt}
                    />
                    <Stepper
                      value={extraQtys[extra.id] ?? 0}
                      onDec={() =>
                        changeExtraQty(extra.id, -1, extra.max ?? 10)
                      }
                      onInc={() =>
                        changeExtraQty(extra.id, +1, extra.max ?? 10)
                      }
                      decLabel={`${t('booking.aria_decrease', 'Decrease')} ${extra.label.toLowerCase()}`}
                      incLabel={`${t('booking.aria_increase', 'Increase')} ${extra.label.toLowerCase()}`}
                    />
                  </div>
                </div>
              ))}

              <h3 className="mb-8 font-display text-h2 text-dark">
                {t('booking.comfort_heading', 'We care about your comfort!')}
              </h3>

              <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
                <p className="text-h3 font-bold text-dark">
                  {t('booking.transfer_question', 'Would you like airport transfer?')}
                </p>
                <SegmentedControl
                  options={[
                    {value: 'no', label: t('booking.no', 'No')},
                    {value: 'yes', label: t('booking.yes', 'Yes')},
                  ]}
                  value={transferEnabled ? 'yes' : 'no'}
                  onChange={(v) => setTransferEnabled(v === 'yes')}
                />
              </div>

              {transferEnabled && (
                <div className="flex flex-wrap items-center gap-5 justify-between">
                  <div className="flex min-h-28 lg:min-w-90 max-w-xs items-stretch overflow-hidden rounded-card bg-white shadow-card-m">
                    <div className="flex flex-1 justify-center text-center py-5 rounded-card bg-white -mr-5 z-10">
                      <div className="flex flex-1 flex-col justify-center px-4">
                        <p className="text-label-2xs uppercase text-forest font-bold -mb-1">
                          {t('booking.total_transfer', 'Total transfer')}
                        </p>
                        <p className="font-display text-price text-forest">
                          +€{transferPrice}
                        </p>
                      </div>
                      <div className="shrink-0 self-stretch border-l-1 border-dashed border-primary" />
                      <div className="flex shrink-0 flex-col justify-center gap-px px-4 font-bold text-left">
                        <span className="text-xs text-dark">
                          {travelers} {t('booking.travelers_word', 'Travelers')}
                        </span>
                        <span className="text-xs text-dark">
                          {t('booking.vehicle_one', '1 Vehicle')}
                        </span>
                        <span className="text-xs text-dark">
                          {transferTypeLabel}
                        </span>
                      </div>
                    </div>
                    <img
                      src={transfer.image}
                      alt={transfer.imageAlt}
                      loading="lazy"
                      className="w-40 lg:w-45 shrink-0 object-cover"
                    />
                  </div>
                  <SegmentedControl
                    options={[
                      {
                        value: 'oneway',
                        label: t('booking.transfer_oneway', 'One way'),
                      },
                      {
                        value: 'return',
                        label: t('booking.transfer_return', 'Return'),
                      },
                    ]}
                    value={transferType}
                    onChange={(v) => setTransferType(v as TransferType)}
                  />
                </div>
              )}
            </Step>
          </div>

          {/* ── Trip Summary ── */}
          <aside
            aria-label={t('booking.aria_summary', 'Your trip summary')}
            className="bg-forest rounded-card col-span-12 lg:col-span-4 lg:col-start-9 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-6 lg:-mt-15"
          >
            <div className="rounded-card bg-white px-4 py-6 lg:py-8 lg:px-5 shadow-card">
              <h2 className="mb-5.5 font-display text-h2 text-dark">
                {t('booking.summary_title', 'Your Trip Summary')}
              </h2>

              {/* Route */}
              <div className="mb-4 flex items-baseline justify-between">
                <p className="text-h3 font-bold text-dark">
                  {t('booking.summary_route', 'The Route')}
                </p>
                <p className="text-price font-display text-forest">
                  {travelers} x €{selectedRoute.price}
                </p>
              </div>
              <div className="relative mb-6">
                <div className="absolute left-1/6 right-1/6 top-1/8 border-t-2 border-dashed border-primary" />
                <div className="relative flex justify-between">
                  {selectedRoute.stops.map((name, i) => (
                    <div
                      key={name + i}
                      className="flex w-1/3 flex-col items-center gap-2.75"
                    >
                      <span
                        className={`inline-block h-3 w-3 rounded-full ${
                          i === 1
                            ? 'border-2 border-primary bg-white'
                            : 'bg-primary'
                        }`}
                      />
                      <span className="text-xs text-primary">{name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Camp */}
              <div className="mb-4 flex items-baseline justify-between">
                <p className="text-h3 font-bold text-dark">
                  {t('booking.summary_camp', 'Where You\u2019ll Sleep')}
                </p>
                <p className="text-price font-display text-forest">
                  {selectedCamp.delta === 0
                    ? t('booking.included', 'Included')
                    : `${travelers} x €${selectedCamp.delta}`}
                </p>
              </div>
              <SummaryTicket
                image={selectedCamp.image}
                imageAlt={selectedCamp.imageAlt}
                eyebrow={
                  selectedCamp.delta === 0
                    ? t('booking.in_price', 'In price')
                    : t('booking.per_person_short', 'Per person')
                }
                price={selectedCamp.priceValue}
                label={selectedCamp.name}
              />

              {/* Extras */}
              {extras.map((extra) => {
                const qty = extraQtys[extra.id] ?? 0;
                if (qty === 0) return null;
                return (
                  <div key={extra.id}>
                    <div className="mb-4 flex items-baseline justify-between">
                      <p className="text-h3 font-bold text-dark">
                        {extra.label}
                      </p>
                      <p className="text-price font-display text-forest">
                        {qty} x €{extra.price}
                      </p>
                    </div>
                    <SummaryTicket
                      image={extra.image}
                      imageAlt={extra.imageAlt}
                      eyebrow={t('booking.per_quad', extra.eyebrow)}
                      price={extra.priceDisplay}
                      label={extra.label}
                    />
                  </div>
                );
              })}

              {/* Transfer */}
              {transferEnabled && (
                <>
                  <div className="mb-4 flex items-baseline justify-between">
                    <p className="text-h3 font-bold text-dark">
                      {t('booking.summary_transfer', 'Airport transfer')}
                    </p>
                    <p className="text-price font-display text-forest">
                      1 x €{transferPrice}
                    </p>
                  </div>
                  <div className="flex h-22 items-stretch overflow-hidden rounded-card bg-white border border-sand mb-6">
                    <div className="flex flex-1 justify-center text-center py-5 rounded-card bg-white -mr-5 z-10">
                      <div className="flex flex-1 flex-col justify-center">
                        <p className="text-label-2xs uppercase text-forest font-bold -mb-1">
                          {t('booking.total_transfer', 'Total transfer')}
                        </p>
                        <p className="font-display text-price text-forest">
                          +€{transferPrice}
                        </p>
                      </div>
                      <div className="shrink-0 self-stretch border-l-1 border-dashed border-primary" />
                      <div className="flex shrink-0 flex-col justify-center gap-px px-4 font-bold text-left">
                        <span className="text-xs text-dark">
                          {travelers} {t('booking.travelers_word', 'Travelers')}
                        </span>
                        <span className="text-xs text-dark">
                          {t('booking.vehicle_one', '1 Vehicle')}
                        </span>
                        <span className="text-xs text-dark">
                          {transferTypeLabel}
                        </span>
                      </div>
                    </div>
                    <img
                      src={transfer.image}
                      alt={transfer.imageAlt}
                      loading="lazy"
                      className="lg:w-40 shrink-0 object-cover"
                    />
                  </div>
                </>
              )}

              {/* When / travelers */}
              <div className="flex items-center justify-between py-2">
                <p className="text-h3 font-bold text-dark">
                  {t('booking.summary_when', 'When You\u2019ll Leave')}
                </p>
                <p className="flex items-center gap-1.5 text-base text-dark">
                  {whenLeaveText}{' '}
                  <span role="img" aria-label={t('booking.aria_calendar', 'Calendar')}>
                    &#128197;
                  </span>
                </p>
              </div>
              <div className="mb-5 flex items-center justify-between py-2">
                <p className="text-h3 font-bold text-dark">
                  {t('booking.summary_travelers', 'Nbr of Travelers')}
                </p>
                <p className="flex items-center gap-1.5 text-base text-dark">
                  {travelers}{' '}
                  {travelers === 1
                    ? t('booking.traveler_one', 'traveler')
                    : t('booking.traveler_many', 'travelers')}{' '}
                  <span role="img" aria-label={t('booking.aria_travelers_emoji', 'Travelers')}>
                    &#128694;
                  </span>
                </p>
              </div>

              {/* Reserve */}
              <button
                type="button"
                onClick={handleReserve}
                disabled={isReserving}
                className="group flex w-full cursor-pointer items-center rounded-full bg-white p-1 text-btn text-forest shadow-card-m disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span className="py-3 px-6 rounded-full text-white font-display bg-[#eab308] group-hover:bg-[#ca8a04] group-disabled:bg-[#eab308] transition-colors duration-200 ease-out motion-reduce:transition-none">
                  {isReserving ? (
                    t('booking.reserving', 'Reserving\u2026')
                  ) : (
                    <>
                      {t('booking.reserve_cta', 'Reserve your spot')}{' '}
                      <span aria-hidden="true">&rarr;</span>
                    </>
                  )}
                </span>
                <span className="flex flex-col justify-center text-center pl-7">
                  <span className="text-label-2xs uppercase text-forest font-bold -mb-1">
                    {t('booking.total_price', 'Total price')}
                  </span>
                  <span className="text-price font-display">€{total}</span>
                </span>
              </button>
              {reserveError && (
                <p role="alert" className="mt-3 text-center text-sm text-red-600">
                  {reserveError}
                </p>
              )}

              <ul role="list" className="mt-8 flex flex-col gap-2.5">
                <li className="flex items-center gap-2.5 text-label text-dark">
                  <CheckIcon className="text-primary" />{' '}
                  {t('booking.trust_1', 'Free cancellation up to 48h before')}
                </li>
                <li className="flex items-center gap-2.5 text-label text-dark">
                  <StarIcon className="text-primary" />{' '}
                  {t('booking.trust_2', 'Book your spot with 20%')}
                </li>
                <li className="flex items-center gap-2.5 text-label text-dark">
                  <HeartIcon className="text-primary" />{' '}
                  {t('booking.trust_3', 'Clear pricing, no surprise surcharges')}
                </li>
              </ul>
            </div>

            {/* WhatsApp */}
            <div className="rounded-card px-6 py-6.5 text-center">
              <p className="mb-3.5 text-base font-display text-white">
                <span role="img" aria-label={t('booking.aria_thinking', 'Thinking')}>
                  &#129300;
                </span>{' '}
                {t('booking.whatsapp_question', 'Questions before you book?')}
              </p>
              <a
                href={whatsappHref}
                aria-label={t('booking.aria_whatsapp', 'Chat with us on WhatsApp')}
                className="flex items-center justify-center gap-2.5 rounded-full bg-green-600 px-5 py-3.25 text-btn font-display text-white"
              >
                <WhatsAppIcon />
                {t('booking.whatsapp_cta', 'Chat on WhatsApp')}
              </a>
              <p className="mt-3 text-xs text-white/75">
                {t('booking.whatsapp_note_1', 'WhatsApp us')}
                <br />
                {t(
                  'booking.whatsapp_note_2',
                  'We usually answer within an hour.',
                )}
              </p>
            </div>
          </aside>

          {/* ── What's in the price + FAQ — left column row 2, after aside on mobile ── */}
          <div className="col-span-12 lg:col-span-7 lg:col-start-1 lg:row-start-2 pt-8">
            {/* What's in the price */}
            <div className="rounded-card bg-white px-16 py-6 lg:py-12 shadow-card">
              <h2 className="mb-2 font-display text-h2 text-dark">
                {t('booking.price_heading', 'What\u2019s in the price')}
              </h2>
              <p className="mb-6 text-base text-dark">
                {t('booking.price_sub', 'Everything you need for an unforgettable adventure:')}
              </p>
              <div className="grid grid-cols-1 gap-x-3 gap-y-6 sm:grid-cols-3">
                {priceIncludes.map((item, i) => (
                  <div key={item.title + i} className="flex items-start gap-2">
                    <span
                      className="text-lg leading-snug"
                      role="img"
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>
                    <div>
                      <p className="text-base font-bold text-dark">
                        {item.title}
                      </p>
                      <p className="text-label text-dark">{item.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Questions about booking */}
            <div className="pt-12 lg:pt-16">
              <h2 className="mb-6 font-display text-h2 text-dark">
                {t('booking.faq_heading', 'Questions about booking?')}
              </h2>
              <ul role="list" className="flex flex-col gap-3.5">
                {faqs.map((faq, i) => {
                  const open = openFaq === i;
                  return (
                    <li key={faq.question} className="list-none">
                      <button
                        type="button"
                        onClick={() => setOpenFaq(open ? -1 : i)}
                        aria-expanded={open}
                        className="relative w-full cursor-pointer rounded-full bg-white py-5 pl-6 pr-14 text-left shadow-card-m"
                      >
                        <span className="text-h3 font-bold text-dark">
                          {faq.question}
                        </span>
                        <span
                          className="faq-chevron absolute right-5.5 top-1/2 flex -translate-y-1/2 text-primary"
                          data-open={open}
                          aria-hidden="true"
                        >
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                          >
                            <path d="M5 12h14" />
                            <path d="M12 5v14" />
                          </svg>
                        </span>
                      </button>
                      <div className="faq-body" data-open={open}>
                        <p className="m-0 px-6 pb-1 pt-4.5 text-base text-dark">
                          {faq.answer}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Step({
  number,
  title,
  description,
  first,
  last,
  children,
}: {
  number: number;
  title: string;
  description: string;
  first?: boolean;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`relative grid grid-cols-[3.5rem_1fr] gap-x-5 ${last ? '' : 'pb-12'}`}
    >
      {!first && (
        <div
          aria-hidden="true"
          className="absolute left-7 top-0 h-7 border-l-2 border-dashed border-primary/40"
        />
      )}
      {!last && (
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-7 top-7 border-l-2 border-dashed border-primary/40"
        />
      )}
      <div
        className="day-circle relative z-10 flex h-14 w-14 flex-col items-center justify-center rounded-full bg-primary text-white"
        data-step={number}
      >
        <span aria-hidden="true" className="day-ping" />
        <span className="relative text-xl font-bold leading-none">
          {number}
        </span>
      </div>
      <div>
        <h2 className="mb-1.5 font-display text-h2 text-dark">{title}</h2>
        <p className="mb-8 text-base text-dark">{description}</p>
        {children}
      </div>
    </div>
  );
}

function TicketCard({
  eyebrow,
  price,
  label,
  image,
  imageAlt,
}: {
  eyebrow: string;
  price: string;
  label: string;
  image: string;
  imageAlt: string;
}) {
  return (
    <div className="flex h-28 w-full lg:min-w-90 max-w-xs items-stretch overflow-hidden rounded-card shadow-card-m">
      <div className="flex flex-1 items-stretch py-5 rounded-card bg-white -mr-5 z-10">
        <div className="flex w-28 shrink-0 flex-col justify-center text-center">
          <p className="text-label-2xs uppercase text-forest font-bold -mb-1">{eyebrow}</p>
          <p className="font-display text-price text-forest">{price}</p>
        </div>
        <div className="self-stretch border-l-1 border-dashed border-primary" />
        <p className="flex flex-1 items-center px-4 text-xs text-dark font-bold">
          {label}
        </p>
      </div>
      <img
        src={image}
        alt={imageAlt}
        loading="lazy"
        className="w-45 shrink-0 object-cover"
      />
    </div>
  );
}

function SummaryTicket({
  image,
  imageAlt,
  eyebrow,
  price,
  label,
}: {
  image: string;
  imageAlt: string;
  eyebrow: string;
  price: string;
  label: string;
}) {
  return (
    <div className="flex h-22 w-full min-w-content items-stretch overflow-hidden rounded-card border border-sand mb-6">
      <div className="flex flex-1 items-stretch py-5 rounded-card bg-white -mr-5 z-10">
        <div className="flex w-28 shrink-0 flex-col justify-center text-center">
          <p className="text-label-2xs uppercase text-forest font-bold -mb-1">{eyebrow}</p>
          <p className="font-display text-price text-forest">{price}</p>
        </div>
        <div className="self-stretch border-l-1 border-dashed border-primary" />
        <p className="flex flex-1 items-center px-4 text-xs text-dark font-bold">
          {label}
        </p>
      </div>
      <img
        src={image}
        alt={imageAlt}
        loading="lazy"
        className="w-40 shrink-0 object-cover"
      />
    </div>
  );
}

function Stepper({
  value,
  onDec,
  onInc,
  decLabel,
  incLabel,
}: {
  value: number;
  onDec: () => void;
  onInc: () => void;
  decLabel: string;
  incLabel: string;
}) {
  return (
    <div className="flex items-center gap-5">
      <button
        type="button"
        aria-label={decLabel}
        onClick={onDec}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-white hover:bg-primary text-4xl hover:text-white text-primary shadow-card"
      >
        &minus;
      </button>
      <span className="min-w-5 text-center font-display text-4xl text-dark">
        {value}
      </span>
      <button
        type="button"
        aria-label={incLabel}
        onClick={onInc}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-white hover:bg-primary text-4xl hover:text-white text-primary shadow-card"
      >
        +
      </button>
    </div>
  );
}

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: {value: string; label: string}[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex rounded-full bg-white min-w-48 shadow-card">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-full px- py-3 text-btn font-display w-full ${
            opt.value === value ? 'bg-primary text-white' : 'text-dark'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function CheckIcon({className = ''}: {className?: string}) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function StarIcon({className = ''}: {className?: string}) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1"
      aria-hidden="true"
      className={className}
    >
      <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
    </svg>
  );
}

function HeartIcon({className = ''}: {className?: string}) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1"
      aria-hidden="true"
      className={className}
    >
      <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.004c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.004a8.23 8.23 0 0 1-4.19-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.69 8.24-8.23 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42-.14 0-.31-.02-.47-.02s-.43.06-.66.31c-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29z" />
    </svg>
  );
}

export default BookingBody;
