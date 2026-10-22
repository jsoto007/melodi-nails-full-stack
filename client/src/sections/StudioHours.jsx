import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import FadeIn from '../components/FadeIn.jsx';
import Card from '../components/Card.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { apiGet } from '../lib/api.js';

const WEEKDAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const WEEKDAY_INDEX = WEEKDAY_ORDER.reduce((acc, key, index) => {
  acc[key] = index;
  return acc;
}, {});

// "HH:MM" wall-clock values from the salon config. Format them as-is (UTC in,
// UTC out) so the viewer's own time zone never shifts the salon's hours.
function formatTimeValue(value, formatTime) {
  if (!value) {
    return null;
  }
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  return formatTime(new Date(Date.UTC(2000, 0, 1, hours, minutes)), {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

function formatTimeRange(openTime, closeTime, { t, formatTime }) {
  const start = formatTimeValue(openTime, formatTime);
  const end = formatTimeValue(closeTime, formatTime);
  if (start && end) {
    return `${start} – ${end}`;
  }
  return start || end || t('public.hours.comingSoon');
}

function splitIntoRanges(indexes) {
  const ranges = [];
  if (!indexes.length) {
    return ranges;
  }
  let rangeStart = indexes[0];
  let prev = indexes[0];
  for (let i = 1; i < indexes.length; i += 1) {
    const current = indexes[i];
    if (current === prev + 1) {
      prev = current;
      continue;
    }
    ranges.push({ start: rangeStart, end: prev });
    rangeStart = current;
    prev = current;
  }
  ranges.push({ start: rangeStart, end: prev });
  return ranges;
}

function buildSummary(hours, helpers) {
  const openEntries = (hours || [])
    .filter((entry) => entry?.is_open)
    .map((entry) => ({
      originalDay: entry.day,
      open_time: entry.open_time,
      close_time: entry.close_time,
      index: WEEKDAY_INDEX[String(entry.day || '').toLowerCase()]
    }))
    .filter((entry) => Number.isFinite(entry.index));

  if (!openEntries.length) {
    return [];
  }

  const byTime = new Map();
  openEntries.forEach((entry) => {
    const key = `${entry.open_time || ''}|${entry.close_time || ''}`;
    const bucket = byTime.get(key) || {
      open_time: entry.open_time,
      close_time: entry.close_time,
      indexes: []
    };
    bucket.indexes.push(entry.index);
    byTime.set(key, bucket);
  });

  const summary = [];
  byTime.forEach(({ open_time, close_time, indexes }) => {
    const uniqueIndexes = Array.from(new Set(indexes)).sort((a, b) => a - b);
    const ranges = splitIntoRanges(uniqueIndexes);
    ranges.forEach((range) => {
      const startLabel = helpers.t(`public.hours.weekdays.${WEEKDAY_ORDER[range.start]}`);
      const endLabel = helpers.t(`public.hours.weekdays.${WEEKDAY_ORDER[range.end]}`);
      const dayLabel =
        range.start === range.end ? startLabel : helpers.t('public.hours.dayRange', { start: startLabel, end: endLabel });
      summary.push({
        dayLabel,
        timeLabel: formatTimeRange(open_time, close_time, helpers),
        startIndex: range.start
      });
    });
  });
  return summary.sort((a, b) => a.startIndex - b.startIndex);
}

export default function StudioHours() {
  const { t, formatTime } = useLanguage();
  const [hours, setHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const copy = {
    eyebrow: t('public.hours.eyebrow'),
    title: t('public.hours.title'),
    description: t('public.hours.description'),
    cta: t('public.hours.cta'),
    loading: t('public.hours.loading'),
    fallback: t('public.hours.fallback'),
    defaultDescription: t('public.hours.defaultDescription'),
    error: t('public.hours.error'),
  };

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadHours() {
      try {
        const data = await apiGet('/api/availability/config', { signal: controller.signal });
        if (!isMounted) {
          return;
        }
        const operatingHours = Array.isArray(data?.operating_hours) ? data.operating_hours : [];
        setHours(operatingHours);
        setError(false);
      } catch {
        if (!isMounted) {
          return;
        }
        setError(true);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadHours();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const summaryRows = useMemo(() => buildSummary(hours, { t, formatTime }), [hours, t, formatTime]);
  const showFallback = !summaryRows.length && !loading && !error;

  return (
    <section id="hours" className="bg-[#fffaf5] text-[#23301d]">
      <FadeIn className="mx-auto flex w-full max-w-5xl justify-center px-6 py-16" delayStep={0.18}>
        <Card className="space-y-6 border border-[#dbc9b4]/60 bg-[#fffdf9]/95 px-8 py-10 shadow-[0_20px_60px_rgba(42,57,35,0.10)]">
          <SectionTitle
            eyebrow={copy.eyebrow}
            title={copy.title}
            description={copy.description}
            align="center"
          />
          <div className="flex justify-center">
            <Link
              to="/appointments/new"
              className="inline-flex items-center gap-2 rounded-full border border-[#2a3923] px-6 py-2 text-sm font-medium text-[#2a3923] transition hover:bg-[#f3e7d9]"
            >
              {copy.cta} <span className="text-lg">→</span>
            </Link>
          </div>
          <div className="space-y-4 text-center">
            {loading ? (
              <p className="text-sm uppercase tracking-[0.3em] text-[#6f7863]">{copy.loading}</p>
            ) : error ? (
              <p className="text-sm uppercase tracking-[0.3em] text-rose-500">{copy.error}</p>
            ) : showFallback ? (
              <p className="text-sm uppercase tracking-[0.3em] text-[#6f7863]">{copy.fallback}</p>
            ) : null}
          </div>
          <p className="mx-auto mt-2 max-w-xl border-t border-[#dbc9b4]/60 pt-6 text-center text-sm leading-relaxed text-[#5e6755] md:text-base">
            {copy.defaultDescription}
          </p>
        </Card>
      </FadeIn>
    </section>
  );
}
