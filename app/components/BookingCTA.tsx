import {useT} from '~/lib/ui-strings';

interface ComparisonRow {
  /** The commodity/tourist-trap version (muted column). */
  usual: string;
  /** What the traveler gets with us (checked column). */
  ours: string;
}

const ROWS: ComparisonRow[] = [
  {usual: '40–50 people in a tourist coach', ours: 'Max 16 in a minibus'},
  {usual: 'Fixed tourist-menu meals', ours: 'Real Berber-cooked dinners'},
  {usual: 'Scripted commentary on loop', ours: 'Stories from people born here'},
  {usual: 'Big resort-style "luxury" camp', ours: 'A real Berber-owned desert camp'},
  {usual: 'Hidden fees, paid "extras"', ours: 'One transparent price'},
  {usual: '€120–€150 starting price', ours: 'From €85 — same Sahara'},
];

export interface BookingCTAProps {
  eyebrow?: string;
  heading?: string;
  subheading?: string;
  usualLabel?: string;
  oursLabel?: string;
  rows?: ComparisonRow[];
}

export function BookingCTA({
  eyebrow = 'Honest comparison',
  heading = 'We’re not the cheapest because we cut corners',
  subheading = 'We’re affordable because we don’t have a Paris office.',
  usualLabel = 'What you usually get',
  oursLabel = 'What you get with us',
  rows = ROWS,
}: BookingCTAProps) {
  const t = useT();
  return (
    <section aria-label={t('aria.comparison.section', 'Honest comparison')} className="bg-forest py-section">
      <div className="container max-w-content">

        {/* Header */}
        <div className="mx-auto mb-[clamp(44px,5vw,72px)] max-w-200 text-center">
          <p className="text-label font-semibol uppercase text-primary">
            {eyebrow}
          </p>
          <div className="mt-3 flex justify-center">
            <LightningDivider />
          </div>
          <h2 className="mt-5 font-display text-sand text-h2">
            {heading}
          </h2>
          <p className="mt-4.5 text-base leading-relaxed text-sand/80">{subheading}</p>
        </div>

        {/* Comparison */}
        <div className="mx-auto max-w-170">

          {/* Column headers — hidden on mobile (rows carry their own marks) */}
          <div className="flex-col grid-cols-2 items-center gap-5 md:px-5.5 md:grid">
            <div className="flex items-center pb-6 gap-2.5">
              <span role="img" aria-label={t('aria.comparison.emoji_them', 'Unamused face')} className="text-[22px] leading-none">😒</span>
              <span className="text-h3 font-medium text-sand/55">{usualLabel}</span>
            </div>
            <div className="flex items-center pb-8 md:pb-6 gap-2.5">
              <span role="img" aria-label={t('aria.comparison.emoji_us', 'Smiling face with heart-eyes')} className="text-[22px] leading-none">🤩</span>
              <span className="text-h3 font-bold text-sand">{oursLabel}</span>
            </div>
          </div>

          {/* Rows — stacked on mobile, two columns from md */}
          <ul role="list" className="flex flex-col gap-1.5">
            {rows.map((row, i) => (
              <li
                key={i}
                className="grid grid-cols-1 items-stretch overflow-hidden rounded-3xl rounded-tl-none bg-white/9 md:grid-cols-2 md:rounded-full md:rounded-tl-none"
              >
                <div className="flex items-center gap-2.75 pl-4 md:pl-14 py-4.5 text-label text-sand/50">
                  <CrossIcon className="shrink-0 text-sand/40 md:hidden" />
                  {row.usual}
                </div>
                <div className="flex items-center gap-2.75 border-t border-white/8 pl-4 py-4.5 text-label text-sand md:border-t-0">
                  <CheckIcon className="shrink-0 text-primary" />
                  {row.ours}
                </div>
              </li>
            ))}
          </ul>

        </div>
      </div>
    </section>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function LightningDivider() {
  return (
    <svg width="50" height="14" viewBox="0 0 50 14" fill="none" aria-hidden="true" className="text-primary">
      <path
        d="M3 9 L20 5 L30 8 L47 4"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon({className = ''}: {className?: string}) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function CrossIcon({className = ''}: {className?: string}) {
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
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export default BookingCTA;
