import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import FadeIn from '../components/FadeIn.jsx';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import AppointmentTimePicker, { toDateInputValue } from '../components/AppointmentTimePicker.jsx';
import ServiceAccordionPicker, { discountedPriceCents } from '../components/ServiceAccordionPicker.jsx';
import { apiGet, apiPost } from '../lib/api.js';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/heic', 'image/heif']);
const DEFAULT_ADDON_DISCOUNT_PERCENT = 10;

// One decision per screen (Fresha / Square style): pick → time → upsell → who → pay.
const STEP_SERVICE = 'service';
const STEP_TIME = 'time';
const STEP_ADDONS = 'addons';
const STEP_DETAILS = 'details';
const STEP_REVIEW = 'review';

const STEP_LABELS = {
  [STEP_SERVICE]: 'Service',
  [STEP_TIME]: 'Date & time',
  [STEP_ADDONS]: 'Add-ons',
  [STEP_DETAILS]: 'Your details',
  [STEP_REVIEW]: 'Review & pay',
};

// Steps slide in from the side the client is moving towards.
const stepVariants = {
  enter: (direction) => ({ opacity: 0, x: direction > 0 ? 28 : -28 }),
  center: { opacity: 1, x: 0 },
  exit: (direction) => ({ opacity: 0, x: direction > 0 ? -28 : 28 }),
};

function formatCurrency(amountCents, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format((amountCents || 0) / 100);
}

function formatDuration(minutes) {
  if (!minutes) return 'TBD';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  const parts = [];
  if (hours) parts.push(`${hours}h`);
  if (remainder) parts.push(`${remainder}m`);
  return parts.join(' ') || '0m';
}

function categoryKey(product) {
  return (product?.category || 'Otros').trim().toLowerCase();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read image.'));
    reader.readAsDataURL(file);
  });
}

const inputClasses =
  'w-full rounded-xl border border-[#d9cbbc] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#2a3923] focus:ring-2 focus:ring-[#2a3923]/10 placeholder:text-slate-400';

function CheckIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function LockIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

/**
 * Progress for the wizard: a slim animated track on every screen, a
 * "Step n of m" line on phones and labelled, clickable milestones on wider
 * screens. Completed steps can be revisited with one tap.
 */
function StepProgress({ steps, stepIndex, onJump }) {
  const prefersReduced = useReducedMotion();
  const percent = ((stepIndex + 1) / steps.length) * 100;
  return (
    <nav className="mb-6 sm:mb-8" aria-label="Booking progress">
      <div className="mb-2.5 flex items-center justify-between sm:hidden">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2a3923]">{STEP_LABELS[steps[stepIndex]]}</span>
        <span className="text-xs text-[#6f7863]">Step {stepIndex + 1} of {steps.length}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#d9cbbc]/60" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={stepIndex + 1}>
        <motion.div
          className="h-full rounded-full bg-[#2a3923]"
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 170, damping: 26 }}
        />
      </div>
      <ol className="mt-3 hidden items-center justify-between gap-2 sm:flex">
        {steps.map((key, index) => {
          const done = index < stepIndex;
          const active = index === stepIndex;
          return (
            <li key={key} className="min-w-0">
              <button
                type="button"
                onClick={() => onJump(key)}
                disabled={!done}
                aria-current={active ? 'step' : undefined}
                className={`flex items-center gap-2 rounded-full py-1 pr-2 text-left transition ${
                  active ? 'text-[#2a3923]' : done ? 'text-[#5e6755] hover:text-[#2a3923]' : 'cursor-default text-[#6f7863]/60'
                }`}
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  done || active ? 'bg-[#2a3923] text-white' : 'border-2 border-[#d9cbbc] text-[#6f7863]'
                }`}>
                  {done ? <CheckIcon className="h-3 w-3" /> : index + 1}
                </span>
                <span className="truncate text-[11px] font-semibold uppercase tracking-[0.18em]">{STEP_LABELS[key]}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="border-b border-[#ede5d8] pb-4">
      <h2 className="font-serif text-xl text-[#2a3923] sm:text-2xl">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-[#6f7863]">{subtitle}</p> : null}
    </div>
  );
}

function Field({ label, error, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-[#2a3923]">{label}</label>
      {children}
      {hint && !error ? <p className="text-xs text-[#6f7863]">{hint}</p> : null}
      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[#ede5d8] pb-3 last:border-0 last:pb-0">
      <span className="text-xs text-[#6f7863]">{label}</span>
      <span className="text-right text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function EditLink({ onClick, children = 'Edit' }) {
  return (
    <button type="button" onClick={onClick} className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6f7863] transition hover:text-[#2a3923]">
      {children}
    </button>
  );
}

function PaymentChoice({ checked, onSelect, title, description }) {
  return (
    <label className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition ${
      checked ? 'border-[#2a3923] bg-[#2a3923]/5 shadow-[0_0_0_1px_#2a3923]' : 'border-[#d9cbbc] bg-white hover:border-[#2a3923]'
    }`}>
      <input type="radio" name="payment_choice" aria-label={title} checked={checked} onChange={onSelect} className="sr-only" />
      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
        checked ? 'border-[#2a3923] bg-[#2a3923] text-white' : 'border-[#d9cbbc] bg-white'
      }`} aria-hidden="true">
        {checked ? <CheckIcon className="h-3 w-3" /> : null}
      </span>
      <span>
        <span className="block font-semibold text-slate-900">{title}</span>
        <span className="mt-0.5 block text-sm text-[#6f7863]">{description}</span>
      </span>
    </label>
  );
}

export default function ShareYourIdea() {
  const [searchParams] = useSearchParams();
  const prefersReduced = useReducedMotion();
  const [products, setProducts] = useState([]);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [step, setStep] = useState(STEP_SERVICE);
  const stepCardRef = useRef(null);
  const isFirstStepRender = useRef(true);
  const directionRef = useRef(1);

  // The form and the checkout replace each other, and each is a different
  // height: start either one from the top instead of wherever the other ended.
  const wasCheckoutRef = useRef(false);
  useLayoutEffect(() => {
    const isCheckout = Boolean(clientSecret);
    if (isCheckout || wasCheckoutRef.current) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    wasCheckoutRef.current = isCheckout;
  }, [clientSecret]);

  // Each step is its own screen: bring it into view when it changes.
  useEffect(() => {
    if (isFirstStepRender.current) { isFirstStepRender.current = false; return; }
    stepCardRef.current?.scrollIntoView({ behavior: prefersReduced ? 'instant' : 'smooth', block: 'start' });
  }, [step, prefersReduced]);

  const stripePromise = useMemo(() => {
    return paymentConfig?.publishable_key ? loadStripe(paymentConfig.publishable_key) : null;
  }, [paymentConfig?.publishable_key]);
  const [availability, setAvailability] = useState([]);
  const [availabilityMeta, setAvailabilityMeta] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [notice, setNotice] = useState(
    searchParams.get('payment') === 'cancelled'
      ? 'Payment was cancelled. Your slot was not secured yet.'
      : ''
  );
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    session_option_ids: [],
    addon_session_option_ids: [],
    notes: '',
    selected_date: toDateInputValue(new Date()),
    scheduled_start: '',
    pay_full_amount: false,
  });
  const [inspoFile, setInspoFile] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([apiGet('/api/pricing/session-options'), apiGet('/api/payments/config')])
      .then(([productPayload, paymentPayload]) => {
        if (!active) return;
        setProducts(Array.isArray(productPayload) ? productPayload : []);
        setPaymentConfig(paymentPayload?.stripe || null);
      })
      .catch((error) => {
        if (!active) return;
        setPageError(error.message || 'Unable to load booking information.');
      });
    return () => { active = false; };
  }, []);

  const addonDiscountPercent = Number.isFinite(Number(paymentConfig?.addon_discount_percent))
    ? Number(paymentConfig.addon_discount_percent)
    : DEFAULT_ADDON_DISCOUNT_PERCENT;

  const findProduct = (id) => products.find((p) => String(p.id) === String(id));
  const selectedProducts = useMemo(
    () => form.session_option_ids.map(findProduct).filter(Boolean),
    [products, form.session_option_ids] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const addonProducts = useMemo(
    () => form.addon_session_option_ids.map(findProduct).filter(Boolean),
    [products, form.addon_session_option_ids] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const hasSelectedProducts = selectedProducts.length > 0;
  const serviceCount = selectedProducts.length + addonProducts.length;

  // Add-on candidates: every service in a category the client has not booked from.
  const addonCandidates = useMemo(() => {
    const bookedCategories = new Set(selectedProducts.map(categoryKey));
    return products.filter((product) => !bookedCategories.has(categoryKey(product)));
  }, [products, selectedProducts]);
  const hasAddonStep = hasSelectedProducts && addonCandidates.length > 0;

  const steps = useMemo(
    () => [STEP_SERVICE, STEP_TIME, ...(hasAddonStep ? [STEP_ADDONS] : []), STEP_DETAILS, STEP_REVIEW],
    [hasAddonStep]
  );
  const stepIndex = Math.max(0, steps.indexOf(step));

  const allSelectedIdsKey = useMemo(
    () => [...form.session_option_ids, ...form.addon_session_option_ids].map(String).join(','),
    [form.session_option_ids, form.addon_session_option_ids]
  );

  // Availability depends on the combined duration (main + add-ons). If a slot the
  // client already chose no longer fits, clear it and say why.
  useEffect(() => {
    if (!form.selected_date || !allSelectedIdsKey) {
      setAvailability([]);
      setAvailabilityMeta(null);
      return;
    }
    let active = true;
    setLoadingSlots(true);
    apiGet(`/api/availability?date=${encodeURIComponent(form.selected_date)}&session_option_ids=${encodeURIComponent(allSelectedIdsKey)}`)
      .then((payload) => {
        if (!active) return;
        const slots = Array.isArray(payload?.slots) ? payload.slots : [];
        setAvailability(slots);
        setAvailabilityMeta(payload || null);
        setForm((current) => {
          if (!current.scheduled_start || slots.some((slot) => slot.start === current.scheduled_start)) return current;
          setNotice('Your services changed the appointment length, so the time you picked no longer fits. Please choose a new time.');
          return { ...current, scheduled_start: '' };
        });
      })
      .catch((error) => {
        if (!active) return;
        setAvailability([]);
        setAvailabilityMeta(null);
        // A time we could not re-verify against the new duration is not kept.
        setForm((current) => (current.scheduled_start ? { ...current, scheduled_start: '' } : current));
        setPageError(error.message || 'Unable to load available times.');
      })
      .finally(() => { if (active) setLoadingSlots(false); });
    return () => { active = false; };
  }, [form.selected_date, allSelectedIdsKey]);

  const pricing = useMemo(() => {
    const mainCents = selectedProducts.reduce((sum, product) => sum + (Number(product.price_cents) || 0), 0);
    const addonListCents = addonProducts.reduce((sum, product) => sum + (Number(product.price_cents) || 0), 0);
    const addonCents = addonProducts.reduce(
      (sum, product) => sum + discountedPriceCents(product.price_cents, addonDiscountPercent),
      0
    );
    const totalCents = mainCents + addonCents;
    const durationMinutes = [...selectedProducts, ...addonProducts].reduce(
      (sum, product) => sum + (Number(product.duration_minutes) || 0),
      0
    );
    // Server floors the fee at its minimum (20); mirror that if config is missing.
    const bookingFeePercent = Number(paymentConfig?.booking_fee_percent) || 20;
    const depositCents = totalCents > 0
      ? Math.min(totalCents, Math.max(1, Math.ceil((totalCents * bookingFeePercent) / 100)))
      : 0;
    return {
      currency: paymentConfig?.currency || 'USD',
      totalCents,
      savingsCents: addonListCents - addonCents,
      depositCents,
      durationMinutes,
      bookingFeePercent,
      amountDueToday: form.pay_full_amount ? totalCents : depositCents,
    };
  }, [paymentConfig, selectedProducts, addonProducts, addonDiscountPercent, form.pay_full_amount]);

  const clearSelectionErrors = () => {
    setFormErrors((current) => ({ ...current, session_option_ids: '', session_option_id: '', addon_session_option_ids: '', scheduled_start: '' }));
    setPageError('');
    setNotice('');
  };

  // One service per category: picking another in the same category replaces it.
  // Any add-on from that category is dropped too, since it is no longer an add-on.
  const handleProductSelect = (product) => {
    setForm((current) => {
      const productId = String(product.id);
      const key = categoryKey(product);
      const withoutCategory = current.session_option_ids.filter((id) => categoryKey(findProduct(id)) !== key);
      return {
        ...current,
        session_option_ids: [...withoutCategory, productId],
        addon_session_option_ids: current.addon_session_option_ids.filter(
          (id) => String(id) !== productId && categoryKey(findProduct(id)) !== key
        ),
      };
    });
    clearSelectionErrors();
  };

  const handleProductRemove = (productId) => {
    setForm((current) => ({
      ...current,
      session_option_ids: current.session_option_ids.filter((id) => String(id) !== String(productId)),
    }));
    clearSelectionErrors();
  };

  const handleAddonSelect = (product) => {
    setForm((current) => {
      const key = categoryKey(product);
      const withoutCategory = current.addon_session_option_ids.filter((id) => categoryKey(findProduct(id)) !== key);
      return { ...current, addon_session_option_ids: [...withoutCategory, String(product.id)] };
    });
    clearSelectionErrors();
  };

  const handleAddonRemove = (productId) => {
    setForm((current) => ({
      ...current,
      addon_session_option_ids: current.addon_session_option_ids.filter((id) => String(id) !== String(productId)),
    }));
    clearSelectionErrors();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((c) => ({ ...c, [name]: value }));
    setFormErrors((c) => ({ ...c, [name]: '' }));
    setPageError('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setFormErrors((c) => ({ ...c, inspiration: '' }));
    if (!file) { setInspoFile(null); return; }
    if (!ACCEPTED_TYPES.has(file.type)) {
      setFormErrors((c) => ({ ...c, inspiration: 'Upload a JPG, PNG, WEBP, HEIC, or HEIF image.' }));
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFormErrors((c) => ({ ...c, inspiration: 'Image must be smaller than 8 MB.' }));
      return;
    }
    setInspoFile(file);
  };

  const validateStep = (key) => {
    const e = {};
    if (key === STEP_SERVICE && !form.session_option_ids.length) e.session_option_ids = 'Choose at least one service.';
    if (key === STEP_TIME) {
      if (!form.selected_date) e.selected_date = 'Choose a date.';
      if (!form.scheduled_start) e.scheduled_start = 'Choose a time slot.';
    }
    if (key === STEP_DETAILS) {
      if (!form.first_name.trim()) e.first_name = 'First name is required.';
      if (!form.last_name.trim()) e.last_name = 'Last name is required.';
      if (!form.email.trim()) e.email = 'Email is required.';
      if (!form.phone.trim()) e.phone = 'Phone is required.';
    }
    return e;
  };

  const goTo = (key) => {
    directionRef.current = steps.indexOf(key) >= stepIndex ? 1 : -1;
    setStep(key);
    setPageError('');
  };

  const goNext = () => {
    const errors = validateStep(step);
    if (Object.keys(errors).length) {
      setFormErrors((current) => ({ ...current, ...errors }));
      setPageError(Object.values(errors)[0]);
      return;
    }
    // A time cleared by a duration change sends the client back to re-pick it.
    if (step === STEP_ADDONS && !form.scheduled_start) { goTo(STEP_TIME); return; }
    const next = steps[Math.min(stepIndex + 1, steps.length - 1)];
    goTo(next);
  };

  const goBack = () => {
    if (stepIndex === 0) return;
    goTo(steps[stepIndex - 1]);
  };

  const stepForField = (field) => {
    if (field === 'session_option_ids' || field === 'session_option_id') return STEP_SERVICE;
    if (field === 'addon_session_option_ids') return hasAddonStep ? STEP_ADDONS : STEP_SERVICE;
    if (field === 'scheduled_start') return STEP_TIME;
    if (['first_name', 'last_name', 'email', 'phone', 'inspiration', 'notes'].includes(field)) return STEP_DETAILS;
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    for (const key of steps) {
      const errors = validateStep(key);
      if (Object.keys(errors).length) {
        setFormErrors((current) => ({ ...current, ...errors }));
        goTo(key);
        setPageError(Object.values(errors)[0]);
        return;
      }
    }
    setSubmitting(true);
    setPageError('');
    try {
      const inspiration_urls = inspoFile ? [await readFileAsDataUrl(inspoFile)] : [];
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        session_option_ids: form.session_option_ids.map((id) => Number(id)),
        addon_session_option_ids: form.addon_session_option_ids.map((id) => Number(id)),
        scheduled_start: form.scheduled_start,
        notes: form.notes.trim(),
        inspiration_urls,
        pay_full_amount: form.pay_full_amount,
        // What the button showed; the server refuses (409) if its total differs.
        expected_amount_cents: pricing.amountDueToday,
      };
      const response = await apiPost('/api/payments/stripe/initiate', payload);
      if (response?.checkout_client_secret) {
        setClientSecret(response.checkout_client_secret);
        return;
      }
      setPageError('Unable to start checkout. Please try again.');
    } catch (error) {
      if (error.status === 409 && error.body?.code === 'amount_mismatch') {
        // Catalogue prices changed under us: reload them and let the client re-check the total.
        try {
          const fresh = await apiGet('/api/pricing/session-options');
          setProducts(Array.isArray(fresh) ? fresh : []);
        } catch { /* keep the stale list; the banner still explains */ }
        goTo(STEP_REVIEW);
        setPageError(error.body.error || 'Prices have changed since you started. Please review the updated total.');
      } else if (error.body?.errors?.length) {
        const fieldErrors = {};
        error.body.errors.forEach((entry) => {
          if (!entry?.field) return;
          fieldErrors[entry.field === 'inspiration_urls' ? 'inspiration' : entry.field] = entry.message;
        });
        setFormErrors(fieldErrors);
        if (fieldErrors.addon_session_option_ids) {
          // Rejected add-ons are dropped so a retry cannot resend them.
          setForm((current) => ({ ...current, addon_session_option_ids: [] }));
        }
        const firstField = error.body.errors[0]?.field;
        const target = stepForField(firstField === 'inspiration_urls' ? 'inspiration' : firstField);
        if (target) goTo(target);
        // The action bar always carries the message, even when the step cannot render that field.
        setPageError(error.body.errors[0]?.message || 'Please review your booking.');
      } else {
        setPageError(error.body?.error || error.message || 'Unable to start checkout. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const dateLabel = form.selected_date
    ? new Date(form.selected_date + 'T00:00:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
    : '—';
  const timeLabel = form.scheduled_start
    ? new Date(form.scheduled_start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '—';
  const serviceNames = [...selectedProducts, ...addonProducts].map((p) => p.name).join(' + ');

  if (clientSecret && stripePromise) {
    return (
      <main className="min-h-screen bg-[#ECE7E2] py-8 sm:py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setClientSecret(null)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#6f7863] transition hover:text-[#2a3923]"
            >
              <span aria-hidden="true">←</span> Back to review
            </button>
            <span className="inline-flex items-center gap-1.5 text-xs text-[#6f7863]">
              <LockIcon /> Secure checkout by Stripe
            </span>
          </div>
          <FadeIn className="mb-8 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.4em] text-[#6f7863]">Almost there</p>
            <h1 className="font-serif text-3xl text-[#2a3923] sm:text-4xl">Complete your booking</h1>
          </FadeIn>
          <div className="mx-auto max-w-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-2xl border border-[#d9cbbc] bg-[#fffdf9] px-5 py-4 text-sm">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{serviceNames}</p>
                <p className="text-xs text-[#6f7863]">{dateLabel} · {timeLabel} · {formatDuration(pricing.durationMinutes)}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-xs uppercase tracking-[0.2em] text-[#6f7863]">Due today</p>
                <p className="text-lg font-bold text-[#2a3923]">{formatCurrency(pricing.amountDueToday, pricing.currency)}</p>
                {!form.pay_full_amount && pricing.totalCents > pricing.amountDueToday ? (
                  <p className="text-xs text-[#6f7863]">{formatCurrency(pricing.totalCents - pricing.amountDueToday, pricing.currency)} at the studio</p>
                ) : null}
              </div>
            </div>
            <Card className="relative min-h-[600px] overflow-hidden rounded-3xl bg-white p-0 shadow-xl sm:p-0">
              {/* Sits behind the Stripe frame; the frame covers it once it has loaded. */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-[#6f7863]" aria-hidden="true">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#d9cbbc] border-t-[#2a3923]" />
                Loading secure checkout…
              </div>
              <div className="relative z-10 bg-white">
                <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
                  <EmbeddedCheckout className="py-8" />
                </EmbeddedCheckoutProvider>
              </div>
            </Card>
          </div>
        </div>
      </main>
    );
  }

  const isLastStep = step === STEP_REVIEW;
  const checkingTimes = loadingSlots && (step === STEP_TIME || step === STEP_ADDONS);
  const continueDisabled = isLastStep ? submitting || !hasSelectedProducts : checkingTimes;
  let continueLabel;
  if (isLastStep) {
    continueLabel = submitting ? (
      'Processing…'
    ) : (
      <>
        <span className="sm:hidden">Pay {formatCurrency(pricing.amountDueToday, pricing.currency)}</span>
        <span className="hidden sm:inline">Continue to payment</span>
      </>
    );
  } else if (checkingTimes) {
    continueLabel = 'Checking times…';
  } else if (step === STEP_ADDONS && !addonProducts.length) {
    continueLabel = 'Skip';
  } else {
    continueLabel = 'Continue';
  }

  return (
    <main className="min-h-screen bg-[#ECE7E2] py-8 sm:py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">

        {/* Header */}
        <FadeIn className="mb-6 text-center sm:mb-10">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.4em] text-[#6f7863]">Book your visit</p>
          <h1 className="font-serif text-3xl text-[#2a3923] sm:text-5xl">Reserve your appointment</h1>
          <p className="mx-auto mt-3 hidden max-w-md text-sm leading-relaxed text-[#5e6755] sm:block">
            Pick a service, choose a time, then pay a deposit or the full amount to secure your slot.
          </p>
        </FadeIn>

        <StepProgress steps={steps} stepIndex={stepIndex} onJump={goTo} />

        <form onSubmit={handleSubmit}>
          {/* A disabled default button turns off implicit (Enter-key) submission before the review step. */}
          {!isLastStep ? <button type="submit" disabled hidden aria-hidden="true" tabIndex={-1} /> : null}
          <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-start">

            {/* Current step */}
            <div ref={stepCardRef} className="min-w-0 scroll-mt-24">
              <Card className="overflow-hidden p-5 sm:p-8">
                {notice ? (
                  <div role="status" className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {notice}
                  </div>
                ) : null}
                <AnimatePresence mode="wait" initial={false} custom={directionRef.current}>
                  <motion.div
                    key={step}
                    custom={directionRef.current}
                    variants={stepVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={prefersReduced ? { duration: 0 } : { duration: 0.22, ease: 'easeOut' }}
                    className="space-y-6"
                  >
                    {step === STEP_SERVICE ? (
                      <>
                        <SectionHeader title="Elige un servicio" subtitle="Tap a category, then a service. You can pick one service per category." />
                        <ServiceAccordionPicker
                          products={products}
                          selectedIds={form.session_option_ids}
                          onSelect={handleProductSelect}
                          onRemove={handleProductRemove}
                          currency={pricing.currency}
                        />
                        {formErrors.session_option_ids || formErrors.session_option_id ? (
                          <p className="text-xs font-medium text-red-600">{formErrors.session_option_ids || formErrors.session_option_id}</p>
                        ) : null}
                      </>
                    ) : null}

                    {step === STEP_TIME ? (
                      <div id="time-selection-section" className="space-y-6">
                        <SectionHeader title="Date & time" subtitle={`${formatDuration(pricing.durationMinutes)} · ${serviceNames}`} />
                        <AppointmentTimePicker
                          date={form.selected_date}
                          onDateChange={(value) => handleChange({ target: { name: 'selected_date', value } })}
                          slots={availability}
                          selectedStart={form.scheduled_start}
                          onSelectSlot={(start) => {
                            setForm((c) => ({ ...c, scheduled_start: start }));
                            setFormErrors((c) => ({ ...c, scheduled_start: '' }));
                            setPageError('');
                            setNotice('');
                          }}
                          loading={loadingSlots}
                          hasServices={hasSelectedProducts}
                          isClosed={Boolean(availabilityMeta?.is_closed)}
                          dateError={formErrors.selected_date}
                          timeError={formErrors.scheduled_start}
                        />
                      </div>
                    ) : null}

                    {step === STEP_ADDONS ? (
                      <>
                        <SectionHeader
                          title="Add something extra?"
                          subtitle={`Save ${addonDiscountPercent}% on any extra service when you add it to this visit. Optional — skip if you're all set.`}
                        />
                        <div className="flex items-center gap-3 rounded-2xl bg-[#eef1ea] px-4 py-3">
                          <span className="shrink-0 rounded-full bg-[#2a3923] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-white">
                            -{addonDiscountPercent}%
                          </span>
                          <p className="text-sm text-[#2a3923]">
                            Prices below already include the discount. Your time slot updates to fit the longer visit.
                          </p>
                        </div>
                        <ServiceAccordionPicker
                          products={addonCandidates}
                          selectedIds={form.addon_session_option_ids}
                          onSelect={handleAddonSelect}
                          onRemove={handleAddonRemove}
                          currency={pricing.currency}
                          discountPercent={addonDiscountPercent}
                        />
                        {formErrors.addon_session_option_ids ? (
                          <p className="text-xs font-medium text-red-600">{formErrors.addon_session_option_ids}</p>
                        ) : null}
                      </>
                    ) : null}

                    {step === STEP_DETAILS ? (
                      <>
                        <SectionHeader title="Your details" subtitle="We'll send your confirmation here. No account needed." />
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label="First name" error={formErrors.first_name}>
                            <input name="first_name" autoComplete="given-name" value={form.first_name} onChange={handleChange} placeholder="First name" className={inputClasses} />
                          </Field>
                          <Field label="Last name" error={formErrors.last_name}>
                            <input name="last_name" autoComplete="family-name" value={form.last_name} onChange={handleChange} placeholder="Last name" className={inputClasses} />
                          </Field>
                          <Field label="Email address" error={formErrors.email}>
                            <input name="email" type="email" autoComplete="email" inputMode="email" value={form.email} onChange={handleChange} placeholder="you@example.com" className={inputClasses} />
                          </Field>
                          <Field label="Phone number" error={formErrors.phone}>
                            <input name="phone" type="tel" autoComplete="tel" inputMode="tel" value={form.phone} onChange={handleChange} placeholder="(929) 000-0000" className={inputClasses} />
                          </Field>
                        </div>
                        <div className="space-y-5 border-t border-[#ede5d8] pt-5">
                          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6f7863]">Optional</p>
                          <Field label="Notes for your nail tech" hint="Anything you'd like them to know before the visit.">
                            <textarea
                              name="notes"
                              rows="3"
                              value={form.notes}
                              onChange={handleChange}
                              placeholder="e.g. I want a minimalist look, short nails…"
                              className={inputClasses}
                            />
                          </Field>
                          <Field label="Inspiration image" error={formErrors.inspiration} hint="JPG, PNG, WEBP, HEIC — max 8 MB.">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileChange}
                              className="block w-full cursor-pointer rounded-xl border border-dashed border-[#d9cbbc] bg-white px-4 py-5 text-sm text-[#6f7863] transition file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#2a3923] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:uppercase file:tracking-wide file:text-white hover:border-[#2a3923]"
                            />
                            {inspoFile ? <p className="mt-1.5 text-xs text-[#6f7863]">✓ {inspoFile.name}</p> : null}
                          </Field>
                        </div>
                      </>
                    ) : null}

                    {step === STEP_REVIEW ? (
                      <>
                        <SectionHeader title="Review & pay" subtitle="Check everything, then choose how you'd like to pay." />

                        <div className="divide-y divide-[#ede5d8] rounded-2xl border border-[#d9cbbc] bg-white">
                          <div className="flex items-start justify-between gap-3 p-4">
                            <div className="min-w-0 flex-1 space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#6f7863]">Services</p>
                              {selectedProducts.map((product) => (
                                <div key={product.id} className="flex items-baseline justify-between gap-3 text-sm">
                                  <span className="font-semibold text-slate-900">{product.name}</span>
                                  <span className="shrink-0 text-[#5e6755]">{formatDuration(product.duration_minutes)} · <span className="font-semibold text-[#2a3923]">{formatCurrency(product.price_cents, pricing.currency)}</span></span>
                                </div>
                              ))}
                              {addonProducts.map((product) => (
                                <div key={product.id} className="flex items-start justify-between gap-3 text-sm">
                                  <span className="flex flex-col items-start gap-1">
                                    <span className="font-semibold text-slate-900">{product.name}</span>
                                    <span className="whitespace-nowrap rounded-full bg-[#eef1ea] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#2a3923]">Add-on -{addonDiscountPercent}%</span>
                                  </span>
                                  <span className="shrink-0 text-right text-[#5e6755]">
                                    {formatDuration(product.duration_minutes)} ·{' '}
                                    <span className="line-through">{formatCurrency(product.price_cents, pricing.currency)}</span>{' '}
                                    <span className="font-semibold text-[#2a3923]">{formatCurrency(discountedPriceCents(product.price_cents, addonDiscountPercent), pricing.currency)}</span>
                                  </span>
                                </div>
                              ))}
                            </div>
                            <EditLink onClick={() => goTo(STEP_SERVICE)} />
                          </div>
                          <div className="flex items-start justify-between gap-3 p-4">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#6f7863]">When</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900">{dateLabel} · {timeLabel}</p>
                              <p className="text-xs text-[#6f7863]">{formatDuration(pricing.durationMinutes)} total</p>
                            </div>
                            <EditLink onClick={() => goTo(STEP_TIME)} />
                          </div>
                          <div className="flex items-start justify-between gap-3 p-4">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#6f7863]">Who</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900">{form.first_name} {form.last_name}</p>
                              <p className="break-words text-xs text-[#6f7863]">{form.email} · {form.phone}</p>
                            </div>
                            <EditLink onClick={() => goTo(STEP_DETAILS)} />
                          </div>
                        </div>

                        <fieldset className="space-y-3">
                          <legend className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#6f7863]">How would you like to pay?</legend>
                          <PaymentChoice
                            checked={!form.pay_full_amount}
                            onSelect={() => setForm((c) => ({ ...c, pay_full_amount: false }))}
                            title={`Pay deposit — ${formatCurrency(pricing.depositCents, pricing.currency)}`}
                            description={`Secure your slot with a ${pricing.bookingFeePercent}% deposit. Pay the rest at the studio.`}
                          />
                          <PaymentChoice
                            checked={form.pay_full_amount}
                            onSelect={() => setForm((c) => ({ ...c, pay_full_amount: true }))}
                            title={`Pay in full — ${formatCurrency(pricing.totalCents, pricing.currency)}`}
                            description="Complete payment now via Stripe. Nothing more to pay at the studio."
                          />
                        </fieldset>
                        <p className="inline-flex items-center gap-1.5 text-xs text-[#6f7863]">
                          <LockIcon /> No account required. Payment processed securely by Stripe.
                        </p>
                      </>
                    ) : null}
                  </motion.div>
                </AnimatePresence>
              </Card>

              {/* Sticky action bar: the next step is always one tap away, however long the step is. */}
              <div className="sticky bottom-0 z-30 -mx-4 mt-4 sm:mx-0">
                <div className="border-t border-[#d9cbbc] bg-[#ECE7E2]/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-12px_30px_rgba(42,57,35,0.08)] backdrop-blur-md sm:rounded-2xl sm:border sm:px-5 sm:py-4">
                  {pageError ? (
                    <p role="alert" className="mb-2.5 flex items-start gap-2 text-sm font-medium text-red-700">
                      <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                      </svg>
                      <span>{pageError}</span>
                    </p>
                  ) : null}
                  <div className="flex items-center gap-3">
                    {stepIndex > 0 ? (
                      <button
                        type="button"
                        onClick={goBack}
                        className="shrink-0 rounded-full px-2 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#6f7863] transition hover:text-[#2a3923] sm:px-3"
                      >
                        <span aria-hidden="true">←</span> Back
                      </button>
                    ) : null}
                    <div className="min-w-0 flex-1 leading-tight">
                      {hasSelectedProducts ? (
                        isLastStep ? (
                          <>
                            <p className="truncate text-xs text-[#6f7863]">Due today</p>
                            <p className="truncate text-sm font-bold text-[#2a3923]">
                              {formatCurrency(pricing.amountDueToday, pricing.currency)}
                              {!form.pay_full_amount && pricing.totalCents > pricing.amountDueToday ? (
                                <span className="hidden font-normal text-[#6f7863] sm:inline"> · {formatCurrency(pricing.totalCents - pricing.amountDueToday, pricing.currency)} at studio</span>
                              ) : null}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="truncate text-xs text-[#6f7863]">
                              {serviceCount} {serviceCount === 1 ? 'service' : 'services'} · {formatDuration(pricing.durationMinutes)}
                            </p>
                            <p className="truncate text-sm font-bold text-[#2a3923]">{formatCurrency(pricing.totalCents, pricing.currency)}</p>
                          </>
                        )
                      ) : (
                        <p className="truncate text-xs text-[#6f7863]">Select a service to continue</p>
                      )}
                    </div>
                    <Button
                      type={isLastStep ? 'submit' : 'button'}
                      onClick={isLastStep ? undefined : goNext}
                      disabled={continueDisabled}
                      className="shrink-0 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {continueLabel}
                      {!isLastStep && !checkingTimes ? <span aria-hidden="true">→</span> : null}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky sidebar (desktop) */}
            <div className="hidden lg:sticky lg:top-24 lg:block">
              <Card className="space-y-5 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6f7863]">Booking summary</p>
                <div className="space-y-3">
                  <SummaryRow
                    label="Services"
                    value={hasSelectedProducts ? `${serviceCount} selected` : 'Not selected'}
                  />
                  <SummaryRow label="Duration" value={hasSelectedProducts ? formatDuration(pricing.durationMinutes) : '—'} />
                  <SummaryRow label="Date" value={dateLabel} />
                  <SummaryRow label="Time" value={timeLabel} />
                </div>

                {hasSelectedProducts ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      {selectedProducts.map((product) => (
                        <div key={product.id} className="rounded-2xl bg-[#f5f0ea] p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{product.name}</p>
                              <p className="text-xs text-[#6f7863]">
                                {formatDuration(product.duration_minutes)} · {formatCurrency(product.price_cents, pricing.currency)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleProductRemove(product.id)}
                              className="rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#6f7863] transition hover:bg-white hover:text-[#2a3923]"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                      {addonProducts.map((product) => (
                        <div key={product.id} className="rounded-2xl bg-[#eef1ea] p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{product.name}</p>
                              <p className="text-xs text-[#6f7863]">
                                {formatDuration(product.duration_minutes)} ·{' '}
                                <span className="line-through">{formatCurrency(product.price_cents, pricing.currency)}</span>{' '}
                                <span className="font-semibold text-[#2a3923]">{formatCurrency(discountedPriceCents(product.price_cents, addonDiscountPercent), pricing.currency)}</span>
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAddonRemove(product.id)}
                              className="rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#6f7863] transition hover:bg-white hover:text-[#2a3923]"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2 rounded-2xl bg-[#f5f0ea] p-4">
                      {pricing.savingsCents > 0 ? (
                        <div className="flex justify-between text-sm">
                          <span className="text-[#6f7863]">Add-on savings</span>
                          <span className="font-semibold text-[#2a3923]">-{formatCurrency(pricing.savingsCents, pricing.currency)}</span>
                        </div>
                      ) : null}
                      <div className="flex justify-between text-sm">
                        <span className="text-[#6f7863]">Total</span>
                        <span className="font-semibold text-slate-900">{formatCurrency(pricing.totalCents, pricing.currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-[#6f7863]">Due today</span>
                        <span className="text-lg font-bold text-[#2a3923]">{formatCurrency(pricing.amountDueToday, pricing.currency)}</span>
                      </div>
                      {!form.pay_full_amount && pricing.totalCents > pricing.depositCents ? (
                        <p className="pt-1 text-xs text-[#6f7863]">
                          Remaining {formatCurrency(pricing.totalCents - pricing.depositCents, pricing.currency)} paid at studio.
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-[#f5f0ea] p-4 text-center text-xs text-[#6f7863]">
                    Select a service to see pricing
                  </div>
                )}

                <div className="space-y-2 text-xs text-[#6f7863]">
                  <div className="flex items-center gap-2">
                    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    Payments secured by Stripe
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                    Confirmation sent by email
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
