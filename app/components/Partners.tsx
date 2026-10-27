import {useT} from '~/lib/ui-strings';
const DEFAULT_PARTNERS = [
  {
    name: 'Erg Chebbi Camps',
    description: 'Family-run Berber camps at the foot of the highest dunes in Morocco.',
    badge: 'Accommodation',
  },
  {
    name: 'Atlas Discovery',
    description: 'Expert mountain and desert guides certified by the Moroccan Ministry of Tourism.',
    badge: 'Guiding',
  },
  {
    name: 'Riad Kenza',
    description: 'Our Marrakech base: a riad run by the same family for three generations.',
    badge: 'Hospitality',
  },
  {
    name: 'Sahara 4×4',
    description: 'Local vehicle fleet kept in top condition by mechanics who live in the desert.',
    badge: 'Transport',
  },
  {
    name: 'Amal Cooperative',
    description: 'Women-led food cooperative preparing authentic Moroccan meals on every trip.',
    badge: 'Food & Culture',
  },
  {
    name: 'Green Trail Morocco',
    description: 'Partners in our zero-waste camping initiative and dune clean-up program.',
    badge: 'Sustainability',
  },
];

export interface Partner {
  name: string;
  description: string;
  badge: string;
  logo?: string;
}

export interface PartnersProps {
  eyebrow?: string;
  headline?: string;
  subtext?: string;
  partners?: Partner[];
}

export function Partners({
  eyebrow,
  headline,
  subtext,
  partners = DEFAULT_PARTNERS,
}: PartnersProps) {
  const t = useT();
  return (
    <section className="py-section bg-white">
      <div className="container max-w-content">
        {/* Header */}
        <div className="mx-auto max-w-xl text-center">
          <p className="mb-3 font-body text-label uppercase tracking-[0.18em] text-primary">
            {eyebrow || t('about.network_eyebrow', 'Who we work with')}
          </p>
          <h2 className="font-display text-h2 text-dark">
            {headline || t('about.network_heading', 'A network built on trust.')}
          </h2>
          <p className="mt-4 text-base text-dark/70">
            {subtext ||
              t(
                'about.network_subtext',
                'Every partner we work with was chosen for quality, authenticity, and their deep roots in Moroccan culture.',
              )}
          </p>
        </div>

        {/* Partner grid */}
        <ul className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {partners.map((p) => (
            <li
              key={p.name}
              className="flex flex-col gap-3 rounded-card bg-sand p-6 shadow-card"
            >
              {p.logo ? (
                <img
                  src={p.logo}
                  alt={p.name}
                  className="h-10 w-auto object-contain opacity-80"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-10 items-center">
                  <span className="font-display text-price text-primary">{p.name[0]}</span>
                </div>
              )}
              <div>
                <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 font-body text-label uppercase tracking-[0.12em] text-primary">
                  {p.badge}
                </span>
                <h3 className="mt-2 font-display text-h3 text-dark">{p.name}</h3>
                <p className="mt-1.5 text-base text-dark/70 leading-relaxed">{p.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default Partners;
