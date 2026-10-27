import {useT} from '~/lib/ui-strings';

type ValueIcon = 'minibus' | 'landscape' | 'card' | 'heart';

interface ValueItem {
  icon: ValueIcon;
  title: string;
  body: string;
}

interface Stat {
  value: string;
  label: string;
  heart?: boolean;
}

export interface AboutValuesProps {
  eyebrow?: string;
  title?: string;
  values?: ValueItem[];
  stats?: Stat[];
}

const DEFAULT_VALUES: ValueItem[] = [
  {
    icon: 'minibus',
    title: 'Small over big',
    body: '16 travelers in a minibus, not 50 in a coach. Smaller groups mean real conversations, real flexibility, and a real connection to the land — not a parade.',
  },
  {
    icon: 'landscape',
    title: 'Real over polished',
    body: 'Real Berber camp. Real Berber cooking. Real stories from real people who live here. We won’t apologize if dinner isn’t fancy — we’ll be proud that it’s authentic.',
  },
  {
    icon: 'card',
    title: 'Fair over cheap',
    body: 'Our price is honest, not stripped-down. We pay our team properly. We pay the camp family properly. We just cut the middlemen — that’s where the savings come from, not from cutting corners.',
  },
  {
    icon: 'heart',
    title: 'Local over corporate',
    body: 'Every person you meet on this trip is Moroccan. Every dirham you spend stays in Morocco. We’re not a French tour operator with a Marrakech booking office. We’re from here.',
  },
];

const DEFAULT_STATS: Stat[] = [
  {value: '9,000+', label: 'Travelers hosted'},
  {value: '4.9', label: 'Trusted by 3k people', heart: true},
  {value: 'Since 2015', label: 'Local agency'},
];

export function AboutValues({
  eyebrow,
  title,
  values = DEFAULT_VALUES,
  stats = DEFAULT_STATS,
}: AboutValuesProps) {
  const t = useT();
  return (
    <section aria-label={t('aria.about.values', 'Our values')} className="relative overflow-hidden bg-linear-to-b from-white to-sand py-section font-body">
      <div className="container mx-auto max-w-content px-8 pb-section">

        {/* Heading */}
        <div className="mb-13 text-center">
          <div className="mb-4 inline-flex flex-col items-center gap-1.5">
            <span className="text-label font-bold uppercase tracking-[0.22em] text-primary">
              {eyebrow || t('about.values_eyebrow', 'Our Values')}
            </span>
            <Squiggle />
          </div>
          <h2 className="font-display text-[clamp(1.375rem,3.4vw,2.375rem)] text-dark">
            {title || t('about.values_heading', 'Four things we believe in.')}
          </h2>
        </div>

        {/* Value cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {values.map((v, i) => (
            <article
              key={i}
              className="flex gap-[1.1rem] rounded-card bg-white p-7 shadow-card"
            >
              <span
                className={`flex h-18 w-18 shrink-0 items-center justify-center rounded-full bg-[#F1E4D0] text-primary`}
              >
                <ValueGlyph icon={v.icon} />
              </span>
              <div>
                <h3 className="mb-2 font-display text-btn text-dark">{v.title}</h3>
                <p className="text-base leading-relaxed text-dark/80">{v.body}</p>
              </div>
            </article>
          ))}
        </div>

        {/* Stats band */}
        <div className="mt-18 flex flex-wrap items-start justify-center gap-14">
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              <div className="font-display text-3xl leading-none text-primary">
                {s.value}
                {s.heart && <span className="text-[#C1272D]"> &hearts;</span>}
              </div>
              <div className="mt-1.5 text-label text-dark/80">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function Squiggle() {
  return (
    <svg width="52" height="8" viewBox="0 0 52 8" fill="none" aria-hidden="true" className="text-primary">
      <path
        d="M1 5.5C6 1.5 11 1.5 16 5.5C21 9.5 26 9.5 31 5.5C36 1.5 41 1.5 46 5.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ValueGlyph({icon}: {icon: ValueIcon}) {
  switch (icon) {
    case 'minibus':
      return (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 13h14M3 13V8.5A1.5 1.5 0 0 1 4.5 7H14l4 3.5V13M3 13v3h1.2M17 13v3h1.3M17 10.5h-3.5V7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="6.5" cy="16" r="1.6" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="15.5" cy="16" r="1.6" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
    case 'landscape':
      return (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
          <path d="M3 16l4.5-4.5 3 3L15 9l6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="8" cy="9" r="1.4" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
    case 'card':
      return (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="2.5" y="6" width="19" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
          <path d="M2.5 10h19" stroke="currentColor" strokeWidth="1.6" />
          <path d="M6 14.5h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'heart':
      return (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 20.5l-1.4-1.28C5.4 14.5 2 11.42 2 7.65 2 4.57 4.42 2.15 7.5 2.15c1.74 0 3.41.81 4.5 2.09 1.09-1.28 2.76-2.09 4.5-2.09C19.58 2.15 22 4.57 22 7.65c0 3.77-3.4 6.85-8.6 11.57L12 20.5z" />
        </svg>
      );
  }
}

export default AboutValues;
