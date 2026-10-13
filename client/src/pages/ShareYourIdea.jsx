import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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

function StepBadge({ number, label, active, done }) {
  return (
    <div className={`flex items-center gap-2 ${active ? 'opacity-100' : done ? 'opacity-70' : 'opacity-40'}`} aria-current={active ? 'step' : undefined}>
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        done || active ? 'bg-[#2a3923] text-white' : 'border-2 border-[#d9cbbc] text-[#6f7863]'
      }`}>
        {done ? (
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : number}
      </div>
      <span className={`hidden text-xs font-semibold uppercase tracking-[0.2em] sm:block ${active ? 'text-[#2a3923]' : 'text-[#6f7863]'}`}>{label}</span>
    </div>
  );
}

function SectionHeader({ number, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 border-b border-[#ede5d8] pb-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2a3923] text-sm font-bold text-white">
        {number}
      </div>
      <div>
        <h2 className="font-serif text-lg text-[#2a3923]">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-[#6f7863]">{subtitle}</p> : null}
      </div>
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

export default function ShareYourIdea() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [step, setStep] = useState(STEP_SERVICE);
  const stepCardRef = useRef(null);
  const isFirstStepRender = useRef(true);

  // The form is replaced by the (shorter) checkout view, so the browser would keep
  // the old scroll offset and land on the footer. Reset to the top of the checkout.
  useLayoutEffect(() => {
    if (clientSecret) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [clientSecret]);

  // Each step is its own screen: bring it into view when it changes.
  useEffect(() => {
    if (isFirstStepRender.current) { isFirstStepRender.current = false; return; }
    stepCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step]);

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

  const stepDone = (key) => Object.keys(validateStep(key)).length === 0;

  const goTo = (key) => {
    setStep(key);
    setPageError('');
  };

  const goNext = () => {
    const errors = validateStep(step);
    if (Object.keys(errors).length) {
      setFormErrors((current) => ({ ...current, ...errors }));
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
        // The banner always carries the message, even when the step cannot render that field.
        setPageError(error.body.errors[0]?.message || 'Please review your booking.');
      } else {
        setPageError(error.body?.error || error.message || 'Unable to start checkout. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (clientSecret && stripePromise) {
    return (
      <main className="min-h-screen bg-[#ECE7E2] py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <FadeIn className="text-center mb-10">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.4em] text-[#6f7863]">Secure Checkout</p>
            <h1 className="font-serif text-3xl text-[#2a3923] sm:text-4xl">Complete your booking</h1>
          </FadeIn>
          <Card className="p-0 overflow-hidden bg-white shadow-xl max-w-2xl mx-auto rounded-3xl min-h-[600px] relative">
            <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
              <EmbeddedCheckout className="py-8" />
            </EmbeddedCheckoutProvider>
          </Card>
        </div>
      </main>
    );
  }

  const dateLabel = form.selected_date
    ? new Date(form.selected_date + 'T00:00:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
    : '—';
  const timeLabel = form.scheduled_start
    ? new Date(form.scheduled_start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '—';
  const isLastStep = step === STEP_REVIEW;

  return (
    <main className="min-h-screen bg-[#ECE7E2] py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">

        {/* Header */}
        <FadeIn className="mb-10 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.4em] text-[#6f7863]">Book your visit</p>
          <h1 className="font-serif text-4xl text-[#2a3923] sm:text-5xl">Reserve your appointment</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#5e6755]">
            Pick a service, choose a time, then pay a deposit or the full amount to secure your slot.
          </p>
        </FadeIn>

        {/* Step progress */}
        <FadeIn className="mb-8 flex items-center justify-center gap-3 sm:gap-6">
          {steps.map((key, index) => (
            <div key={key} className="flex items-center gap-3 sm:gap-6">
              {index > 0 ? <div className="h-px w-6 bg-[#d9cbbc] sm:w-10" /> : null}
              <StepBadge
                number={index + 1}
                label={STEP_LABELS[key]}
                active={key === step}
                done={index < stepIndex && stepDone(key)}
              />
            </div>
          ))}
        </FadeIn>

        {/* Alerts */}
        {notice ? (
          <FadeIn role="status" className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            {notice}
          </FadeIn>
        ) : null}
        {pageError ? (
          <FadeIn role="alert" className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {pageError}
          </FadeIn>
        ) : null}

        <form onSubmit={handleSubmit}>
          {/* A disabled default button turns off implicit (Enter-key) submission before the review step. */}
          {!isLastStep ? <button type="submit" disabled hidden aria-hidden="true" tabIndex={-1} /> : null}
          <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-start">

            {/* Current step */}
            <div ref={stepCardRef} className="min-w-0 scroll-mt-24">
              <Card className="space-y-6 p-6 sm:p-8">

                {step === STEP_SERVICE ? (
                  <>
                    <SectionHeader number={stepIndex + 1} title="Elige un servicio" subtitle="Tap a category, then a service. You can pick one service per category." />
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
                    <SectionHeader number={stepIndex + 1} title="Date & time" subtitle={`${formatDuration(pricing.durationMinutes)} · ${[...selectedProducts, ...addonProducts].map((p) => p.name).join(' + ')}`} />
                    <AppointmentTimePicker
                      date={form.selected_date}
                      onDateChange={(value) => handleChange({ target: { name: 'selected_date', value } })}
                      slots={availability}
                      selectedStart={form.scheduled_start}
                      onSelectSlot={(start) => {
                        setForm((c) => ({ ...c, scheduled_start: start }));
                        setFormErrors((c) => ({ ...c, scheduled_start: '' }));
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
                      number={stepIndex + 1}
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
                    <SectionHeader number={stepIndex + 1} title="Your details" subtitle="We'll send your confirmation here. No account needed." />
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
                    <SectionHeader number={stepIndex + 1} title="Review & pay" subtitle="Check everything, then choose how you'd like to pay." />

                    <div className="divide-y divide-[#ede5d8] rounded-2xl border border-[#d9cbbc] bg-white">
                      <div className="flex items-start justify-between gap-3 p-4">
                        <div className="min-w-0 space-y-2">
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
                                <span className="rounded-full bg-[#eef1ea] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#2a3923]">Add-on -{addonDiscountPercent}%</span>
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
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#6f7863]">Who</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">{form.first_name} {form.last_name}</p>
                          <p className="text-xs text-[#6f7863]">{form.email} · {form.phone}</p>
                        </div>
                        <EditLink onClick={() => goTo(STEP_DETAILS)} />
                      </div>
                    </div>

                    <fieldset className="space-y-3">
                      <legend className="sr-only">How would you like to pay?</legend>
                      <label className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition ${
                        !form.pay_full_amount ? 'border-[#2a3923] bg-[#2a3923]/5' : 'border-[#d9cbbc] bg-white hover:border-[#2a3923]'
                      }`}>
                        <input
                          type="radio"
                          name="payment_choice"
                          aria-label="Pay deposit"
                          checked={!form.pay_full_amount}
                          onChange={() => setForm((c) => ({ ...c, pay_full_amount: false }))}
                          className="mt-0.5 accent-[#2a3923]"
                        />
                        <div>
                          <p className="font-semibold text-slate-900">
                            Pay deposit — {formatCurrency(pricing.depositCents, pricing.currency)}
                          </p>
                          <p className="mt-0.5 text-sm text-[#6f7863]">
                            Secure your slot with a {pricing.bookingFeePercent}% deposit. Pay the rest at the studio.
                          </p>
                        </div>
                      </label>
                      <label className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition ${
                        form.pay_full_amount ? 'border-[#2a3923] bg-[#2a3923]/5' : 'border-[#d9cbbc] bg-white hover:border-[#2a3923]'
                      }`}>
                        <input
                          type="radio"
                          name="payment_choice"
                          aria-label="Pay in full"
                          checked={form.pay_full_amount}
                          onChange={() => setForm((c) => ({ ...c, pay_full_amount: true }))}
                          className="mt-0.5 accent-[#2a3923]"
                        />
                        <div>
                          <p className="font-semibold text-slate-900">
                            Pay in full — {formatCurrency(pricing.totalCents, pricing.currency)}
                          </p>
                          <p className="mt-0.5 text-sm text-[#6f7863]">
                            Complete payment now via Stripe. Nothing more to pay at the studio.
                          </p>
                        </div>
                      </label>
                    </fieldset>
                  </>
                ) : null}

                {/* Step footer: running total on small screens + navigation */}
                <div className="space-y-4 border-t border-[#ede5d8] pt-5">
                  {hasSelectedProducts ? (
                    <div className="flex items-center justify-between text-sm lg:hidden">
                      <span className="text-[#6f7863]">
                        {selectedProducts.length + addonProducts.length} {selectedProducts.length + addonProducts.length === 1 ? 'service' : 'services'} · {formatDuration(pricing.durationMinutes)}
                      </span>
                      <span className="font-semibold text-[#2a3923]">{formatCurrency(pricing.totalCents, pricing.currency)}</span>
                    </div>
                  ) : null}
                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {stepIndex > 0 ? (
                      <Button type="button" variant="ghost" onClick={goBack} className="w-full sm:w-auto">
                        ← Back
                      </Button>
                    ) : <span />}
                    {isLastStep ? (
                      <Button type="submit" disabled={submitting || !hasSelectedProducts} className="w-full sm:w-auto">
                        {submitting ? 'Processing…' : `Continue to payment · ${formatCurrency(pricing.amountDueToday, pricing.currency)}`}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={goNext}
                        disabled={loadingSlots && (step === STEP_TIME || step === STEP_ADDONS)}
                        className="w-full disabled:opacity-60 sm:w-auto"
                      >
                        {loadingSlots && (step === STEP_TIME || step === STEP_ADDONS)
                          ? 'Checking times…'
                          : step === STEP_ADDONS && !addonProducts.length ? 'No thanks, continue' : 'Continue'}
                      </Button>
                    )}
                  </div>
                  {isLastStep ? (
                    <p className="text-center text-xs text-[#6f7863] sm:text-left">No account required. Payment processed securely by Stripe.</p>
                  ) : null}
                </div>
              </Card>
            </div>

            {/* Sticky sidebar (desktop) */}
            <div className="hidden lg:sticky lg:top-24 lg:block">
              <Card className="space-y-5 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6f7863]">Booking summary</p>
                <div className="space-y-3">
                  <SummaryRow
                    label="Services"
                    value={hasSelectedProducts ? `${selectedProducts.length + addonProducts.length} selected` : 'Not selected'}
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
