import {useState} from 'react';
import {useT} from '~/lib/ui-strings';

interface Faq {
  q: string;
  a: string;
}

const FAQS: Faq[] = [
  {q: 'Wait… is it really cold at night?', a: 'Yes — even in summer. Desert nights drop fast after sunset. Bring layers. We’re not kidding.'},
  {q: 'What if I’ve never ridden a camel?', a: 'Neither had most of our travelers. The camels are calm, the pace is slow, and our guides walk beside you the whole way.'},
  {q: 'Can I do this with kids?', a: 'Absolutely. Families join every week. The minibus, camp beds, and meals all work for children, and the camel trek is short and gentle.'},
  {q: 'Are there bathrooms at the camp?', a: 'Yes. Shared bathrooms come standard; Comfort and Superior camps include a private bathroom inside your tent.'},
  {q: 'Will there be Wi-Fi? Be honest.', a: 'Barely, and that’s kind of the point. There’s patchy signal at camp — enough for a quick message, not for doom-scrolling.'},
  {q: 'I’m a solo traveler. Will I feel out of place?', a: 'Not at all. Roughly a third of our travelers come solo. Shared dinners around the fire make it easy to meet people.'},
  {q: 'What if it rains?', a: 'Rain in the Sahara is rare, but the itinerary flexes if weather turns. Your guide adjusts stops so you never miss the highlights.'},
  {q: 'How far in advance should I book?', a: 'Two to four weeks is comfortable in peak season (Sep–Nov, Mar–May). Off-season, a few days is often enough.'},
  {q: 'What’s your cancellation policy?', a: 'Free cancellation up to 7 days before departure for a full refund. Inside 7 days we’ll rebook you or refund 50%.'},
  {q: 'Can you pick me up from my riad or the airport?', a: 'Yes. Riad pickup in Marrakech is included. Airport pickup can be arranged — just tell us your flight details.'},
];

export interface FaqProps {
  heading?: string;
  faqs?: Faq[];
  /** Index of the item open on first render (-1 = all closed). */
  defaultOpen?: number;
  whatsappUrl?: string;
  whatsappNote?: string;
  /**
   * Drops the white-to-sand gradient for flat sand. Set where the section sits
   * directly under PageHero, whose own gradient already lands on sand.
   */
  flush?: boolean;
}

export function Faq({
  heading = 'Real questions from real travelers!',
  faqs = FAQS,
  defaultOpen = 0,
  whatsappUrl = '#',
  whatsappNote,
  flush = false,
}: FaqProps) {
  const t = useT();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      aria-label={t('aria.faq.section', 'Frequently asked questions')}
      className={`py-section ${
        flush ? 'bg-sand' : 'bg-gradient-to-b from-white from-20% to-sand'
      }`}
    >
      <div className="container max-w-content">

        {/* Header */}
        <h2 className="mx-auto mb-[clamp(40px,5vw,60px)] max-w-190 text-center text-h3 md:text-h2 font-display text-dark">
          {heading}
        </h2>

        {/* Accordion */}
        <ul role="list" className="mx-auto flex max-w-190 flex-col gap-3.5">
          {faqs.map((faq, i) => {
            const isOpen = i === open;
            return (
              <li key={i} className="list-none">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="relative w-full rounded-full bg-white px-[clamp(48px,6vw,60px)] py-5.5 text-center shadow-card"
                >
                  <span className="text-[clamp(1.125rem,1.5vw,1.25rem)] font-semibold text-dark">
                    {faq.q}
                  </span>
                  <span className="absolute right-[clamp(24px,3vw,34px)] top-1/2 flex -translate-y-1/2">
                    <PlusMinus open={isOpen} />
                  </span>
                </button>

                {/* Animated answer — sits below the pill, left-aligned */}
                <div className="faq-body" data-open={isOpen}>
                  <p className="m-0 px-[clamp(20px,3vw,30px)] pb-2 pt-4.5 text-left text-base text-dark">
                    {faq.a}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Footer / WhatsApp */}
        <div className="mt-[clamp(48px,6vw,80px)] text-center">
          <p className="mb-2 flex items-center justify-center gap-2 text-base font-semibold text-dark">
            <span role="img" aria-label={t('aria.faq.emoji', 'Thinking face')} className="text-xl">🤔</span>
            {t('faq.still_questions', 'Still have questions?')}
          </p>
          <p className="mb-5.5 text-base text-dark/80">
            {whatsappNote ||
              t('faq.whatsapp_note', 'WhatsApp us \u2014 we usually answer within an hour.')}
          </p>
          <a
            href={whatsappUrl}
            className="inline-flex items-center gap-2.5 rounded-full bg-[#25A65B] px-8.5 py-3.75 font-display text-btn text-white
                       shadow-card transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-[#1f8f4c]"
          >
            <WhatsAppIcon />
            {t('faq.chat_whatsapp', 'Chat on WhatsApp')}
          </a>
        </div>

      </div>
    </section>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function PlusMinus({open}: {open: boolean}) {
  return (
    <span
      className="faq-chevron shrink-0 text-primary"
      data-open={open}
      aria-hidden="true"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path d="M5 12h14" />
        <path d="M12 5v14" />
      </svg>
    </span>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.004c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.004a8.23 8.23 0 0 1-4.19-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.69 8.24-8.23 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42-.14 0-.31-.02-.47-.02s-.43.06-.66.31c-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29z" />
    </svg>
  );
}

export default Faq;
