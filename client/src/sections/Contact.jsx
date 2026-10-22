import FadeIn from '../components/FadeIn.jsx';
import Card from '../components/Card.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';

const PHONE = '(929) 342-8062';
const EMAIL = 'nailsmelodi@gmail.com';
const ADDRESS = '1205 College Ave, Bronx, NY 10456';

export default function Contact() {
  const { t } = useLanguage();
  const contactPoints = [
    { id: 'call', heading: t('public.contact.phoneHeading'), value: PHONE, body: t('public.contact.phoneBody') },
    { id: 'email', heading: t('public.contact.emailHeading'), value: EMAIL, body: t('public.contact.emailBody') },
    { id: 'studio', heading: t('public.contact.salonHeading'), value: ADDRESS, body: t('public.contact.salonBody') },
  ];
  const copy = {
    eyebrow: t('public.contact.eyebrow'),
    title: t('public.contact.title'),
    description: t('public.contact.description'),
    mapLabel: t('public.contact.mapLabel'),
    smsLabel: t('public.contact.smsLabel'),
    emailLabel: t('public.contact.emailLabel'),
    instagramLabel: t('public.contact.instagramLabel'),
  };
  return (
    <section id="contact" className="bg-[#fffaf5] py-16 text-[#23301d]">
      <FadeIn className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-6" delayStep={0.16}>
        <SectionTitle
          eyebrow={copy.eyebrow}
          title={copy.title}
          description={copy.description}
        />
        <FadeIn className="grid gap-8 md:grid-cols-3" childClassName="h-full" delayStep={0.1}>
          {contactPoints.map((item) => (
            <Card key={item.id} className="space-y-3 bg-[#fffdf9]">
              <p className="text-xs uppercase tracking-[0.3em] text-[#6f7863]">{item.heading}</p>
              {item.id === 'studio' ? (
                <address className="not-italic break-words text-sm font-semibold tracking-[0.08em] text-slate-900 sm:text-base">
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(item.value)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline-offset-4 hover:underline"
                    aria-label={copy.mapLabel}
                  >
                    {item.value}
                  </a>
                </address>
              ) : (
                item.id === 'call' ? (
                  <a
                    href={`sms:${item.value.replace(/[^0-9]/g, '')}`}
                    className="text-sm font-semibold tracking-[0.08em] text-slate-900 underline-offset-4 hover:underline sm:text-base"
                    aria-label={copy.smsLabel}
                  >
                    {item.value}
                  </a>
                ) : item.id === 'email' ? (
                  <a
                    href={`mailto:${item.value}`}
                    className="whitespace-nowrap text-sm font-semibold tracking-[0.08em] text-slate-900 underline-offset-4 hover:underline sm:text-base"
                    aria-label={copy.emailLabel}
                  >
                    {item.value}
                  </a>
                ) : (
                  <p className="break-words text-sm font-semibold tracking-[0.08em] text-slate-900 sm:text-base">
                    {item.value}
                  </p>
                )
              )}
              <p className="text-sm text-slate-700">{item.body}</p>
            </Card>
          ))}
        </FadeIn>
        <FadeIn className="flex items-center gap-4" immediate delayStep={0.2}>
          <a
            href="https://www.instagram.com/_melodinails_?igsh=dWV5Y2VoOGd2dzI2&utm_source=qr"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#c8af8f] text-xs font-semibold uppercase tracking-[0.3em] text-[#6f7863] transition hover:bg-[#f3e7d9]"
            aria-label={copy.instagramLabel}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17" cy="7" r="1.25" />
            </svg>
          </a>
          <a
            href="https://www.instagram.com/_melodinails_?igsh=dWV5Y2VoOGd2dzI2&utm_source=qr"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6f7863] underline-offset-4 hover:underline"
            aria-label={copy.instagramLabel}
          >
            instagram.com/_melodinails_
          </a>
        </FadeIn>
      </FadeIn>
    </section>
  );
}
