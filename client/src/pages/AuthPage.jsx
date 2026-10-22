import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { apiPost } from '../lib/api.js';

const INITIAL_LOGIN = {
  email: '',
  password: ''
};

const LOGIN_FIELD_IDS = {
  email: 'login-email',
  password: 'login-password'
};

export default function AuthPage() {
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const { t } = useLanguage();
  const [loginForm, setLoginForm] = useState(INITIAL_LOGIN);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const loginEmailRef = useRef(null);

  useEffect(() => {
    loginEmailRef.current?.focus();
  }, []);

  // Messages are stored as keys so they re-render in the active language.
  const heroTitle = t('auth.login.title');
  const heroDescription = t('auth.login.description');

  const handleLoginChange = (field) => (event) => {
    setLoginForm((prev) => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setNotice(null);
    setError(null);

    try {
      const payload = {
        email: loginForm.email.trim().toLowerCase(),
        password: loginForm.password
      };

      const response = await apiPost('/api/auth/login', payload);
      const redirect = response?.redirect_to;

      if (redirect) {
        setLoginForm(INITIAL_LOGIN);
        setNotice('auth.login.success');
        await refreshSession();
        navigate(redirect, { replace: true });
        return;
      }

      setError('auth.errors.unexpectedResponse');
    } catch (err) {
      if (err?.status === 401) {
        setError('auth.login.invalidCredentials');
      } else if (err?.status === 429) {
        setError('auth.errors.rateLimited');
      } else if (err?.status === 400) {
        setError('auth.login.missingFields');
      } else {
        setError('auth.login.failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="bg-white py-16 text-gray-900">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6">
        <SectionTitle eyebrow={t('auth.eyebrow.account')} title={heroTitle} description={heroDescription} />
        {notice ? (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-4 text-xs uppercase tracking-[0.3em] text-gray-600">
            {t(notice)}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-2xl border border-rose-500 bg-rose-50 px-6 py-4 text-xs uppercase tracking-[0.3em] text-rose-700">
            {t(error)}
          </div>
        ) : null}
        <div className="mx-auto w-full max-w-2xl space-y-6">
          <Card className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">
                {t('auth.login.cardTitle')}
              </h2>
              <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
                {t('auth.login.cardDescription')}
              </p>
            </div>
              <form className="space-y-4" onSubmit={handleLoginSubmit}>
                <div>
                  <label
                    htmlFor={LOGIN_FIELD_IDS.email}
                    className="text-xs uppercase tracking-[0.3em] text-gray-500"
                  >
                    {t('auth.fields.email')}
                  </label>
                  <input
                    id={LOGIN_FIELD_IDS.email}
                    ref={loginEmailRef}
                    type="email"
                    value={loginForm.email}
                    onChange={handleLoginChange('email')}
                    placeholder={t('auth.fields.emailPlaceholder')}
                    autoComplete="email"
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor={LOGIN_FIELD_IDS.password}
                    className="text-xs uppercase tracking-[0.3em] text-gray-500"
                  >
                    {t('auth.fields.password')}
                  </label>
                  <input
                    id={LOGIN_FIELD_IDS.password}
                    type="password"
                    value={loginForm.password}
                    onChange={handleLoginChange('password')}
                    autoComplete="current-password"
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0"
                    required
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? t('auth.login.submitting') : t('auth.login.submit')}
                  </Button>
                  <Link
                    to="/forgot-password"
                    className="text-xs uppercase tracking-[0.3em] text-gray-500 hover:text-black"
                  >
                    {t('auth.login.forgotPassword')}
                  </Link>
                </div>
              </form>
        <p className="text-[0.6rem] uppercase tracking-[0.35em] text-gray-500 mt-6">
          {t('auth.login.staffPrompt')}{' '}
          <Link to="/dashboard/admin" className="font-semibold text-gray-900 underline">
            {t('auth.login.staffLink')}
          </Link>
        </p>
      </Card>
        </div>
      </div>
    </main>
  );
}
