import { useMemo, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import FadeIn from '../components/FadeIn.jsx';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { localizedServiceField } from '../lib/localizedService.js';
import { formatStatusLabel, getStatusBadgeClasses } from '../lib/statusStyles.js';
import { apiGet, apiPost } from '../lib/api.js';
import { sanitizeAppointmentForConfirmation } from '../lib/appointments.js';

const BOOKING_RECEIPT_KEY = 'melodi-nails:last-booking';
const LOCATION_LINE = '1205 College Ave, Bronx, NY 10456';
const STUDIO_EMAIL = 'melodinails@mail.sotodev.com';
// Raw payment / Stripe status values that have a translated label.
const KNOWN_PAYMENT_STATUSES = new Set([
  'paid',
  'succeeded',
  'pending',
  'processing',
  'requires_payment_method',
  'requires_action',
  'failed',
  'canceled',
  'cancelled',
  'expired',
  'refunded',
  'partially_refunded',
]);
const DIRECTIONS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(LOCATION_LINE)}`;
function readLatestAppointment() {
  try {
    const raw = sessionStorage.getItem(BOOKING_RECEIPT_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed?.appointment || null;
  } catch {
    return null;
  }
}

function storeLatestAppointment(appointment) {
  const sanitized = sanitizeAppointmentForConfirmation(appointment);
  if (!sanitized) {
    return;
  }
  try {
    sessionStorage.setItem(BOOKING_RECEIPT_KEY, JSON.stringify({ appointment: sanitized, savedAt: Date.now() }));
  } catch {
    // Ignore persistence failures (e.g. Safari private mode).
  }
}

function RelatedServices({ currentServiceNames, currentCategory }) {
  const { language, t, formatCurrency } = useLanguage();
  const [services, setServices] = useState([]);
  useEffect(() => {
    const controller = new AbortController();
    apiGet('/api/pricing/session-options', { signal: controller.signal })
      .then((data) => { if (Array.isArray(data)) setServices(data); })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const related = useMemo(() => {
    if (!currentCategory) return [];
    return services.filter(
      (s) => s.category === currentCategory && !currentServiceNames.includes(s.name)
    ).slice(0, 3);
  }, [services, currentCategory, currentServiceNames]);

  if (!related.length) return null;

  const categoryLabel = localizedServiceField(related[0], 'category', language) || currentCategory;

  return (
    <FadeIn className="mt-8">
      <div className="mb-4 flex items-center gap-4">
        <p className="shrink-0 text-xs font-semibold uppercase tracking-[0.35em] text-gray-500">
          {t('confirmation.labels.alsoIn', { category: categoryLabel })}
        </p>
        <div className="h-px flex-1 bg-gray-200" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {related.map((s) => {
          const tagline = localizedServiceField(s, 'tagline', language);
          const description = localizedServiceField(s, 'description', language);
          return (
          <Card key={s.id} className="space-y-2 bg-white/80">
            {tagline ? (
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8d755a]">{tagline}</p>
            ) : null}
            <p className="font-semibold text-slate-900">{localizedServiceField(s, 'name', language)}</p>
            {description ? (
              <p className="text-xs leading-relaxed text-gray-500 line-clamp-2">{description}</p>
            ) : null}
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-xs text-gray-400">
                {s.duration_minutes ? t('common.duration.minutes', { count: s.duration_minutes }) : ''}
              </span>
              <span className="rounded-full bg-[#2a3923] px-2.5 py-0.5 text-xs font-semibold text-[#f3e7d9]">
                {s.price_cents ? formatCurrency(s.price_cents, 'USD', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '—'}
              </span>
            </div>
            <Link
              to="/appointments/new"
              className="mt-1 block text-center rounded-xl border border-[#2a3923] px-3 py-2 text-xs font-semibold text-[#2a3923] transition hover:bg-[#2a3923] hover:text-white"
            >
              {t('confirmation.actions.book')}
            </Link>
          </Card>
          );
        })}
      </div>
    </FadeIn>
  );
}

export default function BookingConfirmation() {
  const { isAuthenticated } = useAuth();
  const { language, t, formatDate, formatTime, formatCurrency } = useLanguage();
  const [appointment, setAppointment] = useState(() => readLatestAppointment());

  const location = useLocation();
  const locationAppointment = location.state?.appointment ?? null;
  const [remoteAppointment, setRemoteAppointment] = useState(null);
  const [isFetchingRemote, setIsFetchingRemote] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const referenceQuery = searchParams.get('reference')?.trim();
  const emailQuery = searchParams.get('email')?.trim();
  const sessionIdQuery = searchParams.get('session_id')?.trim();

  useEffect(() => {
    if (!sessionIdQuery) {
      return;
    }
    let isActive = true;
    let retryTimer = null;
    setIsFetchingRemote(true);
    setFetchError(null);
    const verifyPayment = (attempt = 0) => {
      apiPost('/api/payments/stripe/verify-session', {
        session_id: sessionIdQuery,
      })
        .then((payload) => {
          if (!isActive) {
            return;
          }
          const appointmentPayload = payload?.appointment ?? payload;
          if (appointmentPayload) {
            setRemoteAppointment(appointmentPayload);
            storeLatestAppointment(appointmentPayload);
          }
          if (payload?.payment_status === 'processing' && attempt < 6) {
            retryTimer = window.setTimeout(() => verifyPayment(attempt + 1), 2000);
            return;
          }
          setIsFetchingRemote(false);
        })
        .catch((error) => {
          if (!isActive) {
            return;
          }
          const fallbackAppointment = error.body?.appointment ?? null;
          if (fallbackAppointment) {
            setRemoteAppointment(fallbackAppointment);
            storeLatestAppointment(fallbackAppointment);
          }
          setFetchError('verifyPayment');
          setIsFetchingRemote(false);
        });
    };
    verifyPayment();
    return () => {
      isActive = false;
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
    };
  }, [sessionIdQuery]);

  useEffect(() => {
    if (appointment || remoteAppointment || !referenceQuery || !emailQuery) {
      return;
    }
    let isActive = true;
    const controller = new AbortController();
    setIsFetchingRemote(true);
    setFetchError(null);
    apiGet(
      `/api/public/appointments/lookup?reference=${encodeURIComponent(referenceQuery)}&email=${encodeURIComponent(
        emailQuery
      )}`,
      { signal: controller.signal }
    )
      .then((payload) => {
        if (!isActive) {
          return;
        }
        setRemoteAppointment(payload);
        storeLatestAppointment(payload);
      })
      .catch((error) => {
        if (!isActive || error.name === 'AbortError') {
          return;
        }
        setFetchError('loadAppointment');
      })
      .finally(() => {
        if (isActive) {
          setIsFetchingRemote(false);
        }
      });
    return () => {
      isActive = false;
      controller.abort();
    };
  }, [appointment, remoteAppointment, referenceQuery, emailQuery]);

  useEffect(() => {
    if (!locationAppointment) {
      return;
    }
    setAppointment(locationAppointment);
    storeLatestAppointment(locationAppointment);
  }, [locationAppointment]);

  const bookingDetails = remoteAppointment || appointment;
  const scheduledStart = bookingDetails?.scheduled_start ? new Date(bookingDetails.scheduled_start) : null;
  const formattedDateLabel = scheduledStart
    ? formatDate(scheduledStart, { weekday: 'long', month: 'long', day: 'numeric' })
    : t('confirmation.fallbacks.pendingScheduling');
  const formattedTimeLabel = scheduledStart ? formatTime(scheduledStart) : t('confirmation.fallbacks.toBeConfirmed');
  const durationLabel = formatDuration(bookingDetails?.duration_minutes, t);
  const suggestedDurationLabel =
    bookingDetails?.suggested_duration_minutes && bookingDetails?.suggested_duration_minutes !== bookingDetails?.duration_minutes
      ? formatDuration(bookingDetails.suggested_duration_minutes, t)
      : null;
  const payment = bookingDetails?.payments?.[0] || null;
  const depositLabel = payment
    ? formatCurrency(payment.amount_cents || 0, payment.currency || 'USD', { minimumFractionDigits: 2 })
    : null;
  const contactName =
    bookingDetails?.contact_name ||
    bookingDetails?.contact?.name ||
    bookingDetails?.client?.display_name ||
    t('confirmation.fallbacks.guestBooking');
  const contactEmail =
    bookingDetails?.contact_email || bookingDetails?.contact?.email || bookingDetails?.client?.email || '—';
  const contactPhone =
    bookingDetails?.contact_phone || bookingDetails?.contact?.phone || bookingDetails?.client?.phone || '—';
  const selectedOptions = Array.isArray(bookingDetails?.session_options)
    ? bookingDetails.session_options.filter((option) => option?.name)
    : [];
  const rawServiceNames = selectedOptions.length
    ? selectedOptions.map((option) => option.name)
    : [bookingDetails?.session_option?.name].filter(Boolean);
  const localizedServiceNames = selectedOptions.length
    ? selectedOptions.map((option) => localizedServiceField(option, 'name', language))
    : [localizedServiceField(bookingDetails?.session_option, 'name', language)].filter(Boolean);
  // Prefer the per-service names (they carry English variants) over the
  // pre-joined service.name, which is always in the catalogue's Spanish.
  const serviceLabel =
    (localizedServiceNames.length ? localizedServiceNames.join(' + ') : null) ||
    bookingDetails?.service?.name ||
    t('confirmation.fallbacks.servicePending');
  const currentServiceCategory =
    bookingDetails?.session_option?.category ||
    bookingDetails?.session_options?.find((option) => option?.category)?.category ||
    null;
  const placementNotes =
    bookingDetails?.service?.notes || bookingDetails?.client_description || bookingDetails?.tattoo?.notes || '';
  const descriptionCopy = bookingDetails?.client_description || '';
  const nailTechName =
    bookingDetails?.assigned_admin?.name ||
    bookingDetails?.assigned_admin?.display_name ||
    t('confirmation.fallbacks.assignedShortly');
  const nailTechEmail =
    bookingDetails?.assigned_admin?.email || bookingDetails?.assigned_admin?.contact_email || '';
  const statusLabel = formatStatusLabel(bookingDetails?.status, language);
  const statusClasses = getStatusBadgeClasses(bookingDetails?.status);
  const isPaymentAwaiting = bookingDetails?.status === 'awaiting_payment';
  const isPaymentFailed = bookingDetails?.status === 'payment_failed' || bookingDetails?.status === 'payment_expired';
  const pageState = isPaymentAwaiting ? 'processing' : isPaymentFailed ? 'failed' : 'confirmed';
  const confirmationTitle = t(`confirmation.title.${pageState}`);
  const confirmationDescription = t(`confirmation.description.${pageState}`);
  const paymentStatusKey = String(payment?.status || '').toLowerCase();
  const paymentStatusLabel = paymentStatusKey
    ? KNOWN_PAYMENT_STATUSES.has(paymentStatusKey)
      ? t(`confirmation.paymentStatus.${paymentStatusKey}`)
      : t('confirmation.fallbacks.recorded')
    : null;
  const depositSecondary = payment?.receipt_url ? (
    <a
      href={payment.receipt_url}
      target="_blank"
      rel="noreferrer"
      className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 underline-offset-4 hover:underline"
    >
      {t('confirmation.actions.viewReceipt')}
    </a>
  ) : (
    paymentStatusLabel || t('confirmation.fallbacks.captured')
  );

  return (
    <main className="bg-white py-12 text-gray-900">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4">
        <FadeIn>
          <SectionTitle
            eyebrow={t(`confirmation.eyebrow.${isPaymentFailed ? 'failed' : isPaymentAwaiting ? 'processing' : 'booked'}`)}
            title={confirmationTitle}
            description={confirmationDescription}
          />
        </FadeIn>
        <FadeIn>
          <p className="text-sm text-gray-600">
            {isPaymentAwaiting ? (
              t('confirmation.help.processing')
            ) : isPaymentFailed ? (
              <>
                {t('confirmation.help.failedBefore')}
                <a href={`mailto:${STUDIO_EMAIL}`} className="font-semibold underline-offset-4 hover:underline">
                  {STUDIO_EMAIL}
                </a>
                {t('confirmation.help.failedAfter')}
              </>
            ) : (
              <>
                {t('confirmation.help.confirmedBefore')}
                <span className="font-semibold">{STUDIO_EMAIL}</span>
                {t('confirmation.help.confirmedAfter')}
              </>
            )}
          </p>
        </FadeIn>

        {bookingDetails ? (
          <FadeIn className="space-y-6">
            <Card className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{t('confirmation.labels.reference')}</p>
                  <p className="text-2xl font-semibold tracking-[0.2em] text-gray-900">
                    {bookingDetails.reference_code || t('confirmation.fallbacks.pending')}
                  </p>
                  <p className="text-sm text-gray-500">{t('confirmation.labels.bookedForName', { name: contactName })}</p>
                </div>
                <span
                  className={`inline-flex w-fit items-center rounded-full px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] ${statusClasses}`}
                >
                  {statusLabel}
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <DetailItem
                  label={t('confirmation.labels.date')}
                  value={formattedDateLabel}
                  secondary={
                    scheduledStart ? t('confirmation.secondary.arriveEarly') : t('confirmation.secondary.emailOnceConfirmed')
                  }
                />
                <DetailItem
                  label={t('confirmation.labels.startTime')}
                  value={formattedTimeLabel}
                  secondary={scheduledStart ? t('confirmation.secondary.timeZone') : t('confirmation.secondary.schedulingInProgress')}
                />
                <DetailItem
                  label={t('confirmation.labels.length')}
                  value={durationLabel}
                  secondary={suggestedDurationLabel ? t('confirmation.secondary.suggested', { duration: suggestedDurationLabel }) : null}
                />
                <DetailItem
                  label={t('confirmation.labels.studio')}
                  value={LOCATION_LINE}
                  secondary={
                    <a
                      href={DIRECTIONS_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 underline-offset-4 hover:underline"
                    >
                      {t('confirmation.actions.viewMap')}
                    </a>
                  }
                />
                <DetailItem
                  label={t('confirmation.labels.nailTech')}
                  value={nailTechName}
                  secondary={nailTechEmail || null}
                />
                <DetailItem
                  label={t('confirmation.labels.payment')}
                  value={depositLabel || t('confirmation.fallbacks.recorded')}
                  secondary={depositSecondary}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <DetailItem label={t('confirmation.labels.bookedFor')} value={contactName} secondary={contactEmail} />
                <DetailItem
                  label={t('confirmation.labels.phone')}
                  value={contactPhone}
                  secondary={t('confirmation.secondary.phoneNote')}
                />
              </div>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{t('confirmation.labels.details')}</p>
                <p className="text-sm text-gray-900">{serviceLabel}</p>
                {placementNotes ? <p className="text-sm text-gray-600">{placementNotes}</p> : null}
                {descriptionCopy ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 p-4 text-sm text-gray-600">
                    <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{t('confirmation.labels.clientNotes')}</p>
                    <p className="mt-2 leading-relaxed text-gray-700">{descriptionCopy}</p>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button as="a" href={DIRECTIONS_URL} target="_blank" rel="noreferrer">
                  {t('confirmation.actions.directions')}
                </Button>
                <Button as="a" href={`mailto:${STUDIO_EMAIL}`} variant="secondary">
                  {t('confirmation.actions.emailStudio')}
                </Button>
                {payment?.receipt_url ? (
                  <Button as="a" href={payment.receipt_url} target="_blank" rel="noreferrer" variant="ghost">
                    {t('confirmation.actions.viewReceipt')}
                  </Button>
                ) : null}
              </div>
            </Card>

            <div className="flex flex-wrap gap-3">
              <Button as={Link} to="/" variant="secondary">
                {t('confirmation.actions.returnHome')}
              </Button>
              {isAuthenticated ? (
                <Button as={Link} to="/portal/dashboard">
                  {t('confirmation.actions.dashboard')}
                </Button>
              ) : (
                <Button as={Link} to="/appointments/new">
                  {t('confirmation.actions.bookAnother')}
                </Button>
              )}
            </div>

            <RelatedServices
              currentServiceNames={rawServiceNames}
              currentCategory={currentServiceCategory}
            />
          </FadeIn>
        ) : isFetchingRemote ? (
          <FadeIn>
            <Card className="space-y-4">
              <p className="text-sm text-gray-600">{t('confirmation.loading.title')}</p>
              <p className="text-xs text-gray-500">{t('confirmation.loading.hint')}</p>
            </Card>
          </FadeIn>
        ) : (
          <FadeIn>
            <Card className="space-y-4">
              <p className="text-sm text-gray-600">
                {fetchError ? t(`confirmation.errors.${fetchError}`) : t('confirmation.notFound.message')}
              </p>
              <p className="text-xs text-gray-500">{t('confirmation.notFound.hint')}</p>
              <div className="flex flex-wrap gap-3">
                <Button as={Link} to="/appointments/new">
                  {t('confirmation.actions.startBooking')}
                </Button>
                <Button as={Link} to="/" variant="secondary">
                  {t('confirmation.actions.backHome')}
                </Button>
              </div>
            </Card>
          </FadeIn>
        )}
      </div>
    </main>
  );
}

function formatDuration(minutes, t) {
  if (!minutes || Number.isNaN(Number(minutes))) {
    return t('confirmation.fallbacks.toBeConfirmed');
  }
  const hours = minutes / 60;
  if (Number.isInteger(hours)) {
    return t('confirmation.duration.hours', { count: hours });
  }
  return t('confirmation.duration.minutes', { count: Number(minutes) });
}

function DetailItem({ label, value, secondary }) {
  const hasValue = !(value === undefined || value === null || value === '');
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{hasValue ? value : '—'}</p>
      {secondary
        ? typeof secondary === 'string'
          ? <p className="text-xs text-gray-500">{secondary}</p>
          : secondary
        : null}
    </div>
  );
}
