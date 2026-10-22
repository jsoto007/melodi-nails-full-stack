import { useEffect, useMemo, useState } from 'react';
import FadeIn from '../components/FadeIn.jsx';
import Card from '../components/Card.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import staticServices from '../data/services.json';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { apiGet } from '../lib/api.js';
import { localizeService } from '../lib/localizedService.js';

// Normalize an API option (or a static fallback row) into the display shape,
// picking Spanish or English catalogue text for the current language.
function toDisplayService(option, { language, t, formatCurrency }) {
  const localized = localizeService(option, language);
  const minutes = Number(option.duration_minutes) || 0;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  const durationParts = [];
  if (hours) durationParts.push(t('common.duration.hours', { count: hours }));
  if (remainder) durationParts.push(t('common.duration.minutes', { count: remainder }));
  let price = null;
  if (option.price_cents != null) {
    price = Number(option.price_cents) === 0 ? t('public.services.free') : formatCurrency(option.price_cents);
  }
  return {
    id: String(option.id),
    name: localized.name || t('public.services.untitled'),
    tagline: localized.tagline || '',
    description: localized.description || '',
    category: localized.category || t('public.services.otherCategory'),
    duration: durationParts.join(' ') || null,
    price,
  };
}

// Group an array of services by their category, preserving insertion order.
function groupByCategory(services) {
  const map = new Map();
  for (const svc of services) {
    if (!map.has(svc.category)) map.set(svc.category, []);
    map.get(svc.category).push(svc);
  }
  return map;
}

export default function Services() {
  const { language, t, formatCurrency } = useLanguage();
  const [sessionOptions, setSessionOptions] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    apiGet('/api/pricing/session-options', { signal: controller.signal })
      .then((data) => {
        if (Array.isArray(data)) setSessionOptions(data);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
    return () => controller.abort();
  }, []);

  // Use API data when available; fall back to the bundled static catalogue.
  const displayServices = useMemo(() => {
    const source = loaded && sessionOptions.length ? sessionOptions : staticServices;
    return source.map((option) => toDisplayService(option, { language, t, formatCurrency }));
  }, [loaded, sessionOptions, language, t, formatCurrency]);

  const groupedServices = useMemo(() => groupByCategory(displayServices), [displayServices]);

  const copy = {
    eyebrow: t('public.services.eyebrow'),
    title: t('public.services.title'),
    description: t('public.services.description'),
  };

  return (
    <section id="services" className="bg-[#ECE7E2] py-16 text-[#23301d]">
      <FadeIn className="mx-auto flex max-w-6xl flex-col gap-14 px-6" delayStep={0.12}>
        <SectionTitle
          eyebrow={copy.eyebrow}
          title={copy.title}
          description={copy.description}
        />

        {Array.from(groupedServices.entries()).map(([category, services]) => (
          <div key={category} className="space-y-6">
            <div className="flex items-center gap-4">
              <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.35em] text-[#6f7863]">
                {category}
              </p>
              <div className="h-px flex-1 bg-[#d3c9bc]" />
            </div>

            <FadeIn
              className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
              childClassName="h-full"
              delayStep={0.1}
            >
              {services.map((service) => (
                <Card key={service.id} className="h-full space-y-4 bg-[#fffaf5]/95">
                  {service.tagline ? (
                    <p className="text-xs uppercase tracking-[0.3em] text-[#6f7863]">
                      {service.tagline}
                    </p>
                  ) : null}
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-xl font-semibold text-slate-900">{service.name}</h3>
                    {service.price ? (
                      <span className="mt-0.5 shrink-0 rounded-full bg-[#2a3923] px-3 py-1 text-xs font-semibold text-[#f3e7d9]">
                        {service.price}
                      </span>
                    ) : null}
                  </div>
                  {service.description ? (
                    <p className="text-sm leading-relaxed text-slate-700">{service.description}</p>
                  ) : null}
                  {service.duration ? (
                    <p className="text-xs uppercase tracking-[0.3em] text-[#8d755a]">
                      {t('public.services.approx', { duration: service.duration })}
                    </p>
                  ) : null}
                </Card>
              ))}
            </FadeIn>
          </div>
        ))}
      </FadeIn>
    </section>
  );
}
