export const DEFAULT_NAV_ITEMS = [
  { label: 'Gallery', to: '/#work', type: 'link' },
  { label: 'Menu', to: '/#services', type: 'link' },
  { label: 'About', to: '/#about', type: 'link' },
  { label: 'Contact', to: '/#contact', type: 'link' }
];

// Client portal nav. `labelKey` is translated by ClientPortalLayout via t().
export const USER_NAV_ITEMS = [
  { labelKey: 'portal.nav.dashboard', to: '/portal/dashboard', type: 'link', end: true },
  { labelKey: 'portal.nav.appointments', to: '/portal/appointments', type: 'link' },
  { labelKey: 'portal.nav.profile', to: '/portal/profile', type: 'link' }
];

export const ADMIN_NAV_ITEMS = [
  { label: 'Settings', to: '/dashboard/admin/settings', type: 'link' },
  { label: 'Calendar', to: '/dashboard/admin/calendar', type: 'link' },
  { label: 'Gallery', to: '/dashboard/admin/gallery', type: 'link' }
];
