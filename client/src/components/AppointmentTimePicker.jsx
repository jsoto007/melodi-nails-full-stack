import { useEffect, useMemo, useRef } from 'react';

const QUICK_DAY_COUNT = 14;

const PERIODS = [
  { key: 'morning', label: 'Morning', matches: (hour) => hour < 12 },
  { key: 'afternoon', label: 'Afternoon', matches: (hour) => hour >= 12 && hour < 17 },
  { key: 'evening', label: 'Evening', matches: (hour) => hour >= 17 },
];

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

function formatTime(value) {
  return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
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
  const today = toDateInputValue(new Date());
  const dayStripRef = useRef(null);
  const selectedDayRef = useRef(null);

  const quickDays = useMemo(
    () =>
      Array.from({ length: QUICK_DAY_COUNT }, (_, index) => {
        const value = addDays(today, index);
        const parsed = parseDateValue(value);
        return {
          value,
          weekday: index === 0 ? 'Today' : parsed.toLocaleDateString([], { weekday: 'short' }),
          day: parsed.getDate(),
          month: parsed.toLocaleDateString([], { month: 'short' }),
          fullLabel: parsed.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }),
        };
      }),
    [today]
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
        slots: slots.filter((slot) => period.matches(new Date(slot.start).getHours())),
      })).filter((period) => period.slots.length),
    [slots]
  );

  const selectedSlot = slots.find((slot) => slot.start === selectedStart) || null;
  const dateLabel = date
    ? parseDateValue(date).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
    : '';
  const inQuickDays = quickDays.some((day) => day.value === date);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm font-semibold text-[#2a3923]">Pick a day</p>
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
          <span>Need a later date?</span>
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
            Pick a time{dateLabel ? <span className="font-normal text-[#6f7863]"> · {dateLabel}</span> : null}
          </p>
          {hasServices && !loading && slots.length ? (
            <span className="shrink-0 text-xs text-[#6f7863]">{slots.length} open</span>
          ) : null}
        </div>

        {!hasServices ? (
          <p className="rounded-xl border border-dashed border-[#d9cbbc] bg-white/60 px-4 py-6 text-center text-sm text-[#6f7863]">
            Select at least one service above to see available times
          </p>
        ) : loading ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-busy="true" aria-label="Loading available times">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-xl bg-[#ede5d8]" />
            ))}
          </div>
        ) : !slots.length ? (
          <div className="space-y-3 rounded-xl border border-dashed border-[#d9cbbc] bg-white/60 px-4 py-6 text-center">
            <p className="text-sm text-[#6f7863]">
              {isClosed ? 'The studio is closed on this date.' : 'No times left on this date.'}
            </p>
            <button
              type="button"
              onClick={() => onDateChange(addDays(date, 1))}
              className="rounded-xl border border-[#2a3923] px-4 py-2.5 text-sm font-semibold text-[#2a3923] transition hover:bg-[#2a3923] hover:text-white"
            >
              Try the next day →
            </button>
          </div>
        ) : (
          groupedSlots.map((period) => (
            <div key={period.key} className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#6f7863]">{period.label}</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
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
            </div>
          ))
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
