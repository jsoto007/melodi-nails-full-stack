import { getCurrentLanguage, translate } from '../i18n/index.js';

const STATUS_META = {
  awaiting_payment: {
    label: 'Awaiting payment',
    badgeClasses:
      'bg-sky-50 text-sky-800 ring-sky-600/20',
  },
  pending: {
    label: 'Pending review',
    badgeClasses:
      'bg-amber-50 text-amber-800 ring-amber-600/20',
  },
  confirmed: {
    label: 'Confirmed',
    badgeClasses:
      'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
  },
  completed: {
    label: 'Completed',
    badgeClasses:
      'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
  },
  cancelled: {
    label: 'Cancelled',
    badgeClasses:
      'bg-rose-50 text-rose-800 ring-rose-600/20',
  },
  cancelled_by_client: {
    label: 'Cancelled by client',
    badgeClasses:
      'bg-rose-50 text-rose-800 ring-rose-600/20',
  },
  declined: {
    label: 'Declined',
    badgeClasses:
      'bg-rose-50 text-rose-800 ring-rose-600/20',
  },
  no_show: {
    label: 'No show',
    badgeClasses:
      'bg-slate-50 text-slate-900 ring-slate-400/60',
  },
  payment_failed: {
    label: 'Payment failed',
    badgeClasses:
      'bg-rose-50 text-rose-800 ring-rose-600/20',
  },
  payment_expired: {
    label: 'Payment expired',
    badgeClasses:
      'bg-rose-50 text-rose-800 ring-rose-600/20',
  },
  default: {
    label: 'Scheduled',
    badgeClasses:
      'bg-gray-100 text-gray-700 ring-gray-300',
  },
};

function resolveStatusKey(status) {
  if (!status) {
    return 'default';
  }
  const normalized = status.toString().trim().toLowerCase();
  if (!normalized) {
    return 'default';
  }
  return STATUS_META[normalized] ? normalized : 'default';
}

export function getStatusMeta(status) {
  return STATUS_META[resolveStatusKey(status)];
}

// Labels follow the site language; `label` in STATUS_META is the English fallback.
export function formatStatusLabel(status, language = getCurrentLanguage()) {
  return translate(`common.status.${resolveStatusKey(status)}`, language);
}

export function getStatusBadgeLabel(status, language) {
  return formatStatusLabel(status, language);
}

export function getStatusBadgeClasses(status) {
  return getStatusMeta(status).badgeClasses;
}
