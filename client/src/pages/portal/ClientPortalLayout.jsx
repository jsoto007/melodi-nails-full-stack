import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { ClientPortalProvider } from '../../contexts/ClientPortalContext.jsx';
import Button from '../../components/Button.jsx';
import LanguageToggle from '../../components/LanguageToggle.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import { USER_NAV_ITEMS } from '../../data/navigation.js';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}
export default function ClientPortalLayout() {
  const { isAuthenticated, status, isAdmin, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await logout();
    navigate('/auth', { replace: true });
  };
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const loading = status === 'loading';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-gray-900">
        <p className="text-sm uppercase tracking-[0.4em] text-gray-500">{t('portal.layout.loading')}</p>
      </div>
    );
  }

  if (isAdmin) {
    return <Navigate to="/dashboard/admin" replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  const linkClasses = ({ isActive }) =>
    classNames(
      'rounded-full px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
      isActive
        ? 'border-b-2 border-black text-black'
        : 'text-gray-600 hover:text-black'
    );

  const mobileNavItemClass =
    'text-gray-600 transition-colors hover:text-black focus:outline-none focus-visible:underline';

  const circleButtonClass =
    'inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:border-gray-900 hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

  const menuButtonClass = `${circleButtonClass} md:hidden`;

  return (
    <ClientPortalProvider>
      <div className="min-h-screen bg-white">
        <div className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
            <div className="flex items-center gap-6">
              <Link
                to="/"
                className="text-[0.65rem] font-semibold uppercase tracking-[0.5em] text-gray-900 transition hover:text-gray-600"
              >
                Melodi Nails
              </Link>
              <nav
                aria-label={t('portal.nav.label')}
                className="hidden items-center gap-4 text-[0.65rem] uppercase tracking-[0.3em] md:flex"
              >
                {USER_NAV_ITEMS.map((item) => (
                  <NavLink key={item.to} to={item.to} className={linkClasses} end={item.end}>
                    {t(item.labelKey)}
                  </NavLink>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <LanguageToggle className="hidden md:inline-flex" />
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className={menuButtonClass}
                aria-expanded={mobileMenuOpen}
                aria-controls="portal-mobile-navigation"
                aria-label={mobileMenuOpen ? t('portal.nav.closeMenu') : t('portal.nav.openMenu')}
              >
                {mobileMenuOpen ? (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
              </button>
              <Button as={Link} to="/appointments/new" className="hidden md:inline-flex">
                {t('portal.layout.bookAppointment')}
              </Button>
              <Button variant="secondary" onClick={handleSignOut} className="hidden md:inline-flex">
                {t('portal.layout.signOut')}
              </Button>
            </div>
          </div>
          {mobileMenuOpen ? (
            <div
              id="portal-mobile-navigation"
              className="border-t border-gray-200 bg-white px-6 py-4 text-xs uppercase tracking-[0.3em] md:hidden"
            >
              <nav aria-label={t('portal.nav.label')} className="flex flex-col gap-3">
                {USER_NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={mobileNavItemClass}
                    onClick={() => setMobileMenuOpen(false)}
                    end={item.end}
                  >
                    {t(item.labelKey)}
                  </NavLink>
                ))}
              </nav>
              <LanguageToggle className="mt-4" />
              <div className="mt-4 flex flex-col gap-2">
                <Button as={Link} to="/appointments/new" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                  {t('portal.layout.bookAppointment')}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="w-full"
                >
                  {t('portal.layout.signOut')}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
        <main className="py-10">
          <div className="mx-auto max-w-6xl space-y-8 px-4">
            <Outlet />
          </div>
        </main>
      </div>
    </ClientPortalProvider>
  );
}
