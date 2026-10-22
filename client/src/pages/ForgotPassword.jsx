import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { apiPost } from '../lib/api.js';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setNotice(null);
    setError(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await apiPost('/api/auth/forgot-password', { email: normalizedEmail });

      if (response?.status === 'verify_email') {
        setNotice('auth.forgot.verifyFirst');
        navigate(`/verify-email?email=${encodeURIComponent(normalizedEmail)}`);
        return;
      }

      setNotice('auth.forgot.sent');
      navigate(`/reset-password?email=${encodeURIComponent(normalizedEmail)}`);
    } catch (err) {
      // Map known failures to translated copy instead of echoing the server's English.
      if (err?.status === 429) {
        setError('auth.errors.rateLimited');
      } else if (err?.status === 503) {
        setError('auth.errors.emailUnavailable');
      } else if (err?.status === 400) {
        setError('auth.errors.emailRequired');
      } else {
        setError('auth.forgot.failed');
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
          title={t('auth.forgot.title')}
          description={t('auth.forgot.description')}
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
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.3em] text-gray-500">{t('auth.fields.email')}</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-black"
                placeholder={t('auth.fields.emailPlaceholder')}
                autoComplete="email"
              />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={submitting}>
                {submitting ? t('common.states.sending') : t('auth.forgot.submit')}
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
