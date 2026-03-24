import { useEffect, useMemo, useState } from 'react';
import FadeIn from '../components/FadeIn.jsx';
import Card from '../components/Card.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import staticServices from '../data/services.json';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { apiGet } from '../lib/api.js';

const PRICE_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function formatPrice(cents) {
  if (cents == null) return null;
  if (cents === 0) return 'Gratis';
  return PRICE_FORMATTER.format(cents / 100);
}

function formatDuration(minutes) {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  const parts = [];
  if (hours) parts.push(`${hours}h`);
  if (remainder) parts.push(`${remainder}m`);
  return parts.join(' ') || null;
}

// Normalize API option → display shape (DB fields take priority, fallback to static)
function toDisplayService(option) {
  return {
    id: String(option.id),
    name: option.name || 'Servicio',
    tagline: option.tagline || '',
    description: option.description || '',
    category: option.category || 'Otros',
    duration: formatDuration(option.duration_minutes),
    price_cents: option.price_cents,
  };
}

// Group an array of services by their category, preserving insertion order.
function groupByCategory(services) {
  const map = new Map();
  for (const svc of services) {
    const cat = svc.category || 'Otros';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat).push(svc);
  }
  return map;
}

export default function Services() {
  const { isSpanish } = useLanguage();
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

  // Use API data when available; fall back to static JSON (no prices).
  const displayServices = useMemo(() => {
    if (!loaded || !sessionOptions.length) {
      return staticServices.map((s) => ({ ...s, id: s.id }));
    }
    return sessionOptions.map(toDisplayService);
  }, [loaded, sessionOptions]);

  const groupedServices = useMemo(() => groupByCategory(displayServices), [displayServices]);

  const copy = isSpanish
    ? {
        eyebrow: 'Servicios',
        title: 'Servicios que ofrecemos',
        description:
          'Este menú destaca citas exclusivas enfocadas en estructura, detalle y belleza duradera.',
      }
    : {
        eyebrow: 'Menu',
        title: 'Services we offer',
        description:
          'This menu highlights signature appointments focused on structure, detail, and long-lasting beauty.',
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
                    {service.price_cents != null && (
                      <span className="mt-0.5 shrink-0 rounded-full bg-[#2a3923] px-3 py-1 text-xs font-semibold text-[#f3e7d9]">
                        {formatPrice(service.price_cents)}
                      </span>
                    )}
                  </div>
                  {service.description ? (
                    <p className="text-sm leading-relaxed text-slate-700">{service.description}</p>
                  ) : null}
                  {service.duration ? (
                    <p className="text-xs uppercase tracking-[0.3em] text-[#8d755a]">
                      Aprox. {service.duration}
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
