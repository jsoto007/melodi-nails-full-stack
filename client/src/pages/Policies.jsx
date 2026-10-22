import SectionTitle from '../components/SectionTitle.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';

// Effective date of these terms (rendered in the active language).
const EFFECTIVE_DATE = new Date(Date.UTC(2025, 10, 15, 12));

export default function Policies() {
  const { t, isSpanish, formatDate } = useLanguage();
  const effectiveDate = formatDate(EFFECTIVE_DATE, { month: 'long', year: 'numeric' });

  return (
    <main className="bg-white text-gray-900">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-16">
        <SectionTitle
          eyebrow={t('policies.header.eyebrow')}
          title={t('policies.header.title')}
          description={t('policies.header.description')}
        />

        {isSpanish && <p className="text-sm text-gray-600">{t('policies.translationNote')}</p>}

        <div className="space-y-6 text-xs uppercase tracking-[0.3em] text-gray-500">
          <p>{t('policies.brand')}</p>
          <p>
            {t('policies.location')} · {effectiveDate}
          </p>
        </div>

        <section className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.4em] text-gray-700">{t('policies.consent.heading')}</p>
            <p className="text-xs uppercase tracking-[0.35em] text-gray-500">
              {t('policies.consent.instruction')}
            </p>
          </div>
          <p className="text-sm text-gray-600">
            {t('policies.consent.intro')}
          </p>
          <ul className="space-y-2 text-sm text-gray-700">
            {t('policies.consent.statements').map((statement) => (
              <li key={statement} className="list-disc pl-5">
                {statement}
              </li>
            ))}
          </ul>
          <div className="space-y-2 text-sm text-gray-600">
            {t('policies.consent.paragraphs').map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <p className="text-sm text-gray-600">
            {t('policies.consent.important')}
          </p>
        </section>

        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500">{t('policies.terms.heading')}</p>
          {t('policies.terms.paragraphs').map((paragraph) => (
            <p key={paragraph} className="text-sm text-gray-600">
              {paragraph}
            </p>
          ))}
        </section>

        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500">{t('policies.site.heading')}</p>
          <p className="text-sm text-gray-600">{t('policies.site.body')}</p>
        </section>

        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500">{t('policies.disclaimers.heading')}</p>
          <ul className="space-y-2 text-sm text-gray-700">
            {t('policies.disclaimers.points').map((point) => (
              <li key={point} className="list-disc pl-5">
                {point}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500">{t('policies.eligibility.heading')}</p>
          <p className="text-sm text-gray-600">{t('policies.eligibility.body')}</p>
        </section>

        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500">{t('policies.accounts.heading')}</p>
          <p className="text-sm text-gray-600">{t('policies.accounts.body')}</p>
          <ul className="space-y-2 text-sm text-gray-700">
            {t('policies.accounts.points').map((point) => (
              <li key={point} className="list-disc pl-5">
                {point}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500">{t('policies.payments.heading')}</p>
          <ul className="space-y-2 text-sm text-gray-700">
            {t('policies.payments.points').map((point) => (
              <li key={point} className="list-disc pl-5">
                {point}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500">{t('policies.conduct.heading')}</p>
          <p className="text-sm text-gray-600">{t('policies.conduct.body')}</p>
        </section>

        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500">{t('policies.ip.heading')}</p>
          {t('policies.ip.paragraphs').map((paragraph) => (
            <p key={paragraph} className="text-sm text-gray-600">
              {paragraph}
            </p>
          ))}
        </section>

        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500">{t('policies.disputes.heading')}</p>
          <p className="text-sm text-gray-600">{t('policies.disputes.summary')}</p>
          <div className="space-y-2 text-sm text-gray-600">
            {t('policies.disputes.paragraphs').map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500">{t('policies.general.heading')}</p>
          <ul className="space-y-2 text-sm text-gray-700">
            {t('policies.general.points').map((point) => (
              <li key={point} className="list-disc pl-5">
                {point}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2 text-sm text-gray-600">
          <p>{t('policies.contact.intro')}</p>
          <p>
            Melodi Nails<br />
            {t('policies.contact.emailLabel')} <a className="underline" href="mailto:nailsmelodi@gmail.com">nailsmelodi@gmail.com</a>
          </p>
        </section>
      </div>
    </main>
  );
}
