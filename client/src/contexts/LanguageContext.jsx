import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  STUDIO_TIME_ZONE,
  localeFor,
  setCurrentLanguage,
  translate,
} from '../i18n/index.js';

const LANGUAGE_STORAGE_KEY = 'melodi-nails:language';

const LanguageContext = createContext(null);

function detectInitialLanguage() {
  if (typeof window === 'undefined') {
    return 'en';
  }

  let stored = null;
  try {
    stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    stored = null;
  }
  if (stored === 'en' || stored === 'es') {
    return stored;
  }

  const browserLanguage = String(window.navigator.language || '').toLowerCase();
  return browserLanguage.startsWith('es') ? 'es' : 'en';
}

function toDate(value) {
  if (value == null || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Locale-aware formatters. Dates and times always render in the studio's time
// zone so customers outside New York see the real appointment time.
export function buildFormatters(language) {
  const locale = localeFor(language);
  const withZone = (options) => ({ timeZone: STUDIO_TIME_ZONE, ...options });

  return {
    locale,
    formatDate(value, options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) {
      const date = toDate(value);
      return date ? new Intl.DateTimeFormat(locale, withZone(options)).format(date) : '';
    },
    formatTime(value, options = { hour: 'numeric', minute: '2-digit' }) {
      const date = toDate(value);
      return date ? new Intl.DateTimeFormat(locale, withZone(options)).format(date) : '';
    },
    formatDateTime(value, options = { dateStyle: 'medium', timeStyle: 'short' }) {
      const date = toDate(value);
      return date ? new Intl.DateTimeFormat(locale, withZone(options)).format(date) : '';
    },
    formatCurrency(cents, currency = 'USD', options = {}) {
      if (cents == null || Number.isNaN(Number(cents))) return '';
      const amount = Number(cents) / 100;
      const wholeDollars = Number.isInteger(amount);
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: (currency || 'USD').toUpperCase(),
        minimumFractionDigits: wholeDollars ? 0 : 2,
        maximumFractionDigits: 2,
        ...options,
      }).format(amount);
    },
  };
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(detectInitialLanguage);

  // Keep non-React code (API client, helpers) in sync before children render.
  setCurrentLanguage(language);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Storage can be unavailable (private mode); the in-memory choice still applies.
    }
    document.documentElement.lang = language;
    document.title = translate('common.meta.title', language);
    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute('content', translate('common.meta.description', language));
    }
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      isSpanish: language === 'es',
      setLanguage,
      t: (key, vars) => translate(key, language, vars),
      ...buildFormatters(language),
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Shorthand for components that only need strings + formatters.
export function useT() {
  return useLanguage();
}
