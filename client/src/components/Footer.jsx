import { Link } from 'react-router-dom';
import LanguageToggle from './LanguageToggle.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import melodiLogo from '../assets/melodi/LogoWithBg.png';

const year = new Date().getFullYear();

const LOCATION = '1205 College Ave, Bronx, NY 10456';

export default function Footer() {
  const { t } = useLanguage();
  const copy = {
    studio: t('public.footer.salon'),
    quickLinks: t('public.footer.quickLinks'),
    policies: t('public.footer.policies'),
    backToTop: t('public.footer.backToTop'),
    admin: t('public.footer.admin'),
    poweredBy: t('public.footer.poweredBy'),
    language: t('public.footer.language'),
    languageHint: t('public.footer.languageHint'),
    location: LOCATION,
    contact: t('public.footer.byAppointment'),
    logoAlt: t('public.footer.logoAlt'),
  };

  return (
    <footer className="border-t border-[#d8c7b4] bg-[linear-gradient(180deg,rgba(255,253,249,0.96)_0%,rgba(246,239,231,0.92)_100%)]">
      <div className="mx-auto max-w-6xl px-6 py-12 text-sm text-[#5e6755]">
        <div className="grid gap-10 border-b border-[#d8c7b4]/80 pb-10 md:grid-cols-[1.35fr_0.85fr_0.9fr] md:gap-8">
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <img
                src={melodiLogo}
                alt={copy.logoAlt}
                className="h-16 w-auto rounded-2xl shadow-[0_10px_24px_rgba(42,57,35,0.12)]"
              />
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#8d755a]">{copy.studio}</p>
                <p className="text-xl font-semibold tracking-[0.08em] text-[#23301d]">Melodi Nails</p>
              </div>
            </div>
            <div className="space-y-2 text-sm leading-relaxed text-[#5e6755]">
              <p>{copy.location}</p>
              <p>{copy.contact}</p>
            </div>
            <a
              href="https://sotodev.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-[#6f7863] underline underline-offset-4 transition hover:text-[#2a3923] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8d755a]"
            >
              {copy.poweredBy}
            </a>
          </div>

          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#8d755a]">{copy.quickLinks}</p>
            <nav className="flex flex-col gap-3 text-sm font-medium text-[#32412a]">
              <a
                href="https://www.instagram.com/_melodinails_?igsh=dWV5Y2VoOGd2dzI2&utm_source=qr"
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-[#2a3923]"
              >
                Instagram
              </a>
              <Link to="/policies/terms" className="transition hover:text-[#2a3923]">
                {copy.policies}
              </Link>
              <a href="#top" className="transition hover:text-[#2a3923]">
                {copy.backToTop}
              </a>
              <Link to="/auth" className="transition hover:text-[#2a3923]">
                {copy.admin}
              </Link>
            </nav>
          </div>

          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#8d755a]">{copy.language}</p>
            <LanguageToggle />
            <p className="max-w-xs text-sm leading-relaxed text-[#6f7863]">
              {copy.languageHint}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3 pt-5 text-xs text-[#6f7863] md:flex-row md:items-center md:justify-between">
          <span className="font-semibold uppercase tracking-[0.3em]">© {year} Melodi Nails</span>
          <div className="flex flex-wrap items-center gap-3">
            <span>{copy.location}</span>
            <span className="hidden h-1 w-1 rounded-full bg-[#bda789] md:inline-block" />
            <span>{copy.contact}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
