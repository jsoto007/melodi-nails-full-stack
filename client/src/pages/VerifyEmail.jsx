import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { apiPost } from '../lib/api.js';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const initialEmail = useMemo(() => searchParams.get('email') || '', [searchParams]);
  const initialCode = useMemo(() => searchParams.get('code') || '', [searchParams]);

  const [form, setForm] = useState({
    email: initialEmail,
    code: initialCode
  });
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    setNotice(null);
    setError(null);
  };

  const handleRequestCode = async () => {
    setSending(true);
    setNotice(null);
    setError(null);
    try {
      const response = await apiPost('/api/auth/email/verify-request', { email: form.email.trim().toLowerCase() });
      setNotice(response?.status === 'already_verified' ? 'auth.verify.alreadyVerified' : 'auth.verify.codeSent');
    } catch (err) {
      if (err?.status === 429) {
        setError('auth.errors.rateLimited');
      } else if (err?.status === 503) {
        setError('auth.errors.emailUnavailable');
      } else if (err?.status === 400) {
        setError('auth.errors.emailRequired');
      } else {
        setError('auth.verify.sendFailed');
      }
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setNotice(null);
    setError(null);
    try {
      const payload = {
        email: form.email.trim().toLowerCase(),
        code: form.code.trim()
      };
      await apiPost('/api/auth/email/verify', payload);
      setNotice('auth.verify.success');
      await refreshSession();
      navigate('/portal/dashboard', { replace: true });
    } catch (err) {
      if (err?.status === 429) {
        setError('auth.errors.rateLimited');
      } else if (err?.status === 400) {
        setError('auth.verify.invalidCode');
      } else {
        setError('auth.verify.failed');
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
          title={t('auth.verify.title')}
          description={t('auth.verify.description')}
        />
        <Card className="space-y-6">
          {notice ? (
            <div className="rounded-2xl border border-emerald-500 bg-emerald-50 px-4 py-3 text-xs uppercase tracking-[0.3em] text-emerald-700">
              {t(notice)}
            </div>
          ) : null}
          {error ? (
            <div className="rounded-2xl border border-rose-500 bg-rose-50 px-4 py-3 text-xs uppercase tracking-[0.3em] text-rose-700">
              {t(error)}
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
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={submitting}>
                {submitting ? t('auth.verify.submitting') : t('auth.verify.submit')}
              </Button>
              <Button type="button" variant="ghost" onClick={handleRequestCode} disabled={sending || !form.email}>
                {sending ? t('common.states.sending') : t('auth.links.resendCode')}
              </Button>
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
