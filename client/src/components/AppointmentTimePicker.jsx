import { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { STUDIO_TIME_ZONE } from '../i18n/index.js';

const QUICK_DAY_COUNT = 14;

const PERIODS = [
  { key: 'morning', matches: (hour) => hour < 12 },
  { key: 'afternoon', matches: (hour) => hour >= 12 && hour < 17 },
  { key: 'evening', matches: (hour) => hour >= 17 },
];

const STUDIO_HOUR_FORMATTER = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  hourCycle: 'h23',
  timeZone: STUDIO_TIME_ZONE,
});

// Hour of a slot in the studio's time zone, so a slot shown as "5:00 PM" (ET)
// is grouped under evening even for a visitor whose browser is elsewhere.
function studioHour(value) {
  return Number(STUDIO_HOUR_FORMATTER.format(new Date(value))) % 24;
}

// A YYYY-MM-DD key as noon UTC: formatting it in the studio zone always lands
// on the same calendar day, whatever the visitor's browser zone is.
function dateKeyToDisplayDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

// Local calendar date (not UTC) so "today" doesn't roll over early in the evening.
export function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateValue(value) {
  return new Date(`${value}T00:00:00`);
}

function addDays(value, amount) {
  const date = parseDateValue(value);
  date.setDate(date.getDate() + amount);
  return toDateInputValue(date);
}

export default function AppointmentTimePicker({
  date,
  onDateChange,
  slots,
  selectedStart,
  onSelectSlot,
  loading,
  hasServices,
  isClosed,
  dateError,
  timeError,
}) {
  const { t, formatDate, formatTime } = useLanguage();
  const today = toDateInputValue(new Date());
  const dayStripRef = useRef(null);
  const selectedDayRef = useRef(null);

  const quickDays = useMemo(
    () =>
      Array.from({ length: QUICK_DAY_COUNT }, (_, index) => {
        const value = addDays(today, index);
        const parsed = parseDateValue(value);
        const display = dateKeyToDisplayDate(value);
        return {
          value,
          weekday: index === 0 ? t('confirmation.timePicker.today') : formatDate(display, { weekday: 'short' }),
          day: parsed.getDate(),
          month: formatDate(display, { month: 'short' }),
          fullLabel: formatDate(display, { weekday: 'long', month: 'long', day: 'numeric' }),
        };
      }),
    [today, t, formatDate]
  );

  // Scroll only the day strip (not the page) so the selected day stays visible.
  useEffect(() => {
    const strip = dayStripRef.current;
    const day = selectedDayRef.current;
    if (!strip || !day) return;
    strip.scrollTo({ left: day.offsetLeft - (strip.clientWidth - day.offsetWidth) / 2, behavior: 'smooth' });
  }, [date]);

  const groupedSlots = useMemo(
    () =>
      PERIODS.map((period) => ({
        ...period,
        slots: slots.filter((slot) => period.matches(studioHour(slot.start))),
      })).filter((period) => period.slots.length),
    [slots]
  );

  const selectedSlot = slots.find((slot) => slot.start === selectedStart) || null;

  // Periods are collapsed to one row each; tapping a header reveals its times.
  // Collapse again when the day changes, except the period holding the selection.
  const [expandedPeriod, setExpandedPeriod] = useState(null);
  useEffect(() => {
    const owner = groupedSlots.find((period) => period.slots.some((slot) => slot.start === selectedStart));
    setExpandedPeriod(owner ? owner.key : null);
  }, [groupedSlots, selectedStart]);
  const dateLabel = date
    ? formatDate(dateKeyToDisplayDate(date), { weekday: 'long', month: 'long', day: 'numeric' })
    : '';
  const inQuickDays = quickDays.some((day) => day.value === date);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm font-semibold text-[#2a3923]">{t('confirmation.timePicker.pickDay')}</p>
        <div ref={dayStripRef} className="relative -mx-2 flex snap-x gap-2 overflow-x-auto px-2 pb-2">
          {quickDays.map((day) => {
            const selected = day.value === date;
            return (
              <button
                key={day.value}
                ref={selected ? selectedDayRef : null}
                type="button"
                aria-pressed={selected}
                aria-label={day.fullLabel}
                onClick={() => onDateChange(day.value)}
                className={`flex min-w-[4.25rem] shrink-0 snap-start flex-col items-center rounded-2xl border px-3 py-2.5 transition ${
                  selected
                    ? 'border-[#2a3923] bg-[#2a3923] text-white shadow-sm'
                    : 'border-[#d9cbbc] bg-white text-slate-900 hover:border-[#2a3923]'
                }`}
              >
                <span className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${selected ? 'text-white/80' : 'text-[#6f7863]'}`}>
                  {day.weekday}
                </span>
                <span className="text-xl font-semibold leading-tight">{day.day}</span>
                <span className={`text-[11px] ${selected ? 'text-white/80' : 'text-[#6f7863]'}`}>{day.month}</span>
              </button>
            );
          })}
        </div>
        <label className="flex flex-wrap items-center gap-3 text-sm text-[#5e6755]">
          <span>{t('confirmation.timePicker.laterDate')}</span>
          <input
            name="selected_date"
            type="date"
            min={today}
            value={date}
            onChange={(event) => onDateChange(event.target.value)}
            className={`rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#2a3923] focus:ring-2 focus:ring-[#2a3923]/10 ${
              inQuickDays ? 'border-[#d9cbbc]' : 'border-[#2a3923]'
            }`}
          />
        </label>
        {dateError ? <p className="text-xs font-medium text-red-600">{dateError}</p> : null}
      </div>

      <div className="space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold text-[#2a3923]">
            {t('confirmation.timePicker.pickTime')}{dateLabel ? <span className="font-normal text-[#6f7863]"> · {dateLabel}</span> : null}
          </p>
        </div>

        {!hasServices ? (
          <p className="rounded-xl border border-dashed border-[#d9cbbc] bg-white/60 px-4 py-6 text-center text-sm text-[#6f7863]">
            {t('confirmation.timePicker.selectServiceFirst')}
          </p>
        ) : loading ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-busy="true" aria-label={t('confirmation.timePicker.loadingTimes')}>
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-xl bg-[#ede5d8]" />
            ))}
          </div>
        ) : !slots.length ? (
          <div className="space-y-3 rounded-xl border border-dashed border-[#d9cbbc] bg-white/60 px-4 py-6 text-center">
            <p className="text-sm text-[#6f7863]">
              {isClosed ? t('confirmation.timePicker.closed') : t('confirmation.timePicker.noTimes')}
            </p>
            <button
              type="button"
              onClick={() => onDateChange(addDays(date, 1))}
              className="rounded-xl border border-[#2a3923] px-4 py-2.5 text-sm font-semibold text-[#2a3923] transition hover:bg-[#2a3923] hover:text-white"
            >
              {t('confirmation.timePicker.nextDay')}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#ede5d8] overflow-hidden rounded-2xl border border-[#d9cbbc] bg-white">
            {groupedSlots.map((period) => {
              const expanded = expandedPeriod === period.key;
              const periodSelected = period.slots.find((slot) => slot.start === selectedStart) || null;
              const first = period.slots[0];
              const last = period.slots[period.slots.length - 1];
              return (
                <div key={period.key}>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={`period-${period.key}`}
                    onClick={() => setExpandedPeriod(expanded ? null : period.key)}
                    className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition ${
                      expanded ? 'bg-[#f6f2ec]' : 'hover:bg-[#faf7f2]'
                    }`}
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-[#2a3923]">{t(`confirmation.timePicker.periods.${period.key}`)}</span>
                      <span className="block truncate text-xs text-[#6f7863]">
                        {periodSelected
                          ? t('confirmation.timePicker.selected', { time: formatTime(periodSelected.start) })
                          : `${formatTime(first.start)} – ${formatTime(last.start)}`}
                      </span>
                    </span>
                    {periodSelected ? (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2a3923] text-white">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-[#eef1ea] px-2.5 py-1 text-xs font-semibold text-[#2a3923]">
                        {t('confirmation.timePicker.open', { count: period.slots.length })}
                      </span>
                    )}
                    <svg
                      className={`h-4 w-4 shrink-0 text-[#6f7863] transition-transform ${expanded ? 'rotate-180' : ''}`}
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  {expanded ? (
                    <div id={`period-${period.key}`} className="grid grid-cols-3 gap-2 bg-[#f6f2ec] px-4 pb-4 sm:grid-cols-4">
                      {period.slots.map((slot) => {
                        const selected = selectedStart === slot.start;
                        return (
                          <button
                            key={slot.start}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => onSelectSlot(slot.start)}
                            className={`min-h-12 rounded-xl border px-1 text-sm font-semibold transition ${
                              selected
                                ? 'border-[#2a3923] bg-[#2a3923] text-white shadow-sm'
                                : 'border-[#d9cbbc] bg-white text-slate-900 hover:border-[#2a3923]'
                            }`}
                          >
                            {formatTime(slot.start)}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        <div aria-live="polite">
          {selectedSlot ? (
            <p className="flex items-center gap-2 rounded-xl bg-[#eef1ea] px-4 py-3 text-sm font-semibold text-[#2a3923]">
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span>
                {dateLabel}, {formatTime(selectedSlot.start)} – {formatTime(selectedSlot.end)}
              </span>
            </p>
          ) : null}
        </div>
        {timeError ? <p className="text-xs font-medium text-red-600">{timeError}</p> : null}
      </div>
    </div>
  );
}
