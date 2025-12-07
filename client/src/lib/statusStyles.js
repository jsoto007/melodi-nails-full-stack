const STATUS_META = {
  pending: {
    label: 'Pending review',
    badgeClasses:
      'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/50',
  },
  confirmed: {
    label: 'Confirmed',
    badgeClasses:
      'bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/50',
  },
  completed: {
    label: 'Completed',
    badgeClasses:
      'bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/50',
  },
  cancelled: {
    label: 'Cancelled',
    badgeClasses:
      'bg-rose-50 text-rose-800 ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900/50',
  },
  cancelled_by_client: {
    label: 'Cancelled by client',
    badgeClasses:
      'bg-rose-50 text-rose-800 ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900/50',
  },
  declined: {
    label: 'Declined',
    badgeClasses:
      'bg-rose-50 text-rose-800 ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900/50',
  },
  no_show: {
    label: 'No show',
    badgeClasses:
      'bg-slate-50 text-slate-900 ring-slate-400/60 dark:bg-slate-900/40 dark:text-slate-200 dark:ring-slate-700/60',
  },
  default: {
    label: 'Scheduled',
    badgeClasses:
      'bg-gray-100 text-gray-700 ring-gray-300 dark:bg-gray-900 dark:text-gray-200 dark:ring-gray-700',
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

export function formatStatusLabel(status) {
  return getStatusMeta(status).label;
}

export function getStatusBadgeLabel(status) {
  return formatStatusLabel(status);
}

export function getStatusBadgeClasses(status) {
  return getStatusMeta(status).badgeClasses;
}
