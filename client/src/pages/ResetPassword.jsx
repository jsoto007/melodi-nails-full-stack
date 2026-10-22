import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { apiPost } from '../lib/api.js';

const MIN_PASSWORD_LENGTH = 8;

export default function ResetPassword() {
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const initialEmail = useMemo(() => searchParams.get('email') || '', [searchParams]);
  const initialCode = useMemo(() => searchParams.get('code') || '', [searchParams]);

  const [form, setForm] = useState({
    email: initialEmail,
    code: initialCode,
    new_password: '',
    confirm_password: ''
  });
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    setNotice(null);
    setError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setNotice(null);
    setError(null);

    if (form.new_password !== form.confirm_password) {
      setError({ key: 'auth.validation.passwordsMustMatch' });
      setSubmitting(false);
      return;
    }
    if (form.new_password.trim().length < MIN_PASSWORD_LENGTH) {
      setError({ key: 'auth.validation.passwordTooShort', vars: { min: MIN_PASSWORD_LENGTH } });
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        email: form.email.trim().toLowerCase(),
        code: form.code.trim(),
        new_password: form.new_password
      };
      await apiPost('/api/auth/forgot-password/confirm', payload);
      setNotice({ key: 'auth.reset.success' });
      await refreshSession();
      navigate('/portal/dashboard', { replace: true });
    } catch (err) {
      // The server answers 400 for an invalid/expired code (and for missing or
      // short fields, which the checks above already catch client-side).
      const serverMessage = String(err?.body?.error || '').toLowerCase();
      if (err?.status === 429) {
        setError({ key: 'auth.errors.rateLimited' });
      } else if (err?.status === 400 && serverMessage.includes('password must')) {
        setError({ key: 'auth.validation.passwordTooShort', vars: { min: MIN_PASSWORD_LENGTH } });
      } else if (err?.status === 400) {
        setError({ key: 'auth.reset.invalidCode' });
      } else {
        setError({ key: 'auth.reset.failed' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="bg-white py-16 text-gray-900">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6">
        <SectionTitle
          eyebrow={t('auth.eyebrow.security')}
          title={t('auth.reset.title')}
          description={t('auth.reset.description')}
        />
        <Card className="space-y-6">
          {notice ? (
            <div className="rounded-2xl border border-emerald-500 bg-emerald-50 px-4 py-3 text-xs uppercase tracking-[0.3em] text-emerald-700">
              {t(notice.key, notice.vars)}
            </div>
          ) : null}
          {error ? (
            <div className="rounded-2xl border border-rose-500 bg-rose-50 px-4 py-3 text-xs uppercase tracking-[0.3em] text-rose-700">
              {t(error.key, error.vars)}
            </div>
          ) : null}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.3em] text-gray-500">{t('auth.fields.email')}</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={handleChange('email')}
                  required
                  className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-black"
                  placeholder={t('auth.fields.emailPlaceholder')}
                  autoComplete="email"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.3em] text-gray-500">{t('auth.fields.code')}</span>
                <input
                  type="text"
                  value={form.code}
                  onChange={handleChange('code')}
                  required
                  className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-black"
                  placeholder={t('auth.fields.codePlaceholder')}
                  autoComplete="one-time-code"
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.3em] text-gray-500">{t('auth.fields.newPassword')}</span>
                <input
                  type="password"
                  value={form.new_password}
                  onChange={handleChange('new_password')}
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-black"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.3em] text-gray-500">{t('auth.fields.confirmPassword')}</span>
                <input
                  type="password"
                  value={form.confirm_password}
                  onChange={handleChange('confirm_password')}
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-black"
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={submitting}>
                {submitting ? t('auth.reset.submitting') : t('auth.reset.submit')}
              </Button>
              <Link to="/forgot-password" className="text-xs uppercase tracking-[0.3em] text-gray-500 hover:text-black">
                {t('auth.links.resendCode')}
              </Link>
              <Link to="/auth" className="text-xs uppercase tracking-[0.3em] text-gray-500 hover:text-black">
                {t('auth.links.backToSignIn')}
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}
