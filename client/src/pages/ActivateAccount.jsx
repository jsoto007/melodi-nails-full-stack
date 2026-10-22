import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { apiPost } from '../lib/api.js';

const MIN_PASSWORD_LENGTH = 8;

export default function ActivateAccount() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const { t } = useLanguage();
  const [token, setToken] = useState(searchParams.get('token') ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (searchParams.get('token')) {
      setToken(searchParams.get('token'));
    }
  }, [searchParams]);

  const statusStyle = useMemo(() => {
    if (!status) {
      return '';
    }
    return status.tone === 'error'
      ? 'border-rose-400 bg-rose-50 text-rose-700'
      : 'border-emerald-400 bg-emerald-50 text-emerald-800';
  }, [status]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!token.trim()) {
      setStatus({ tone: 'error', key: 'auth.activate.tokenRequired' });
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setStatus({ tone: 'error', key: 'auth.validation.passwordTooShort', vars: { min: MIN_PASSWORD_LENGTH } });
      return;
    }
    if (password !== confirmPassword) {
      setStatus({ tone: 'error', key: 'auth.activate.passwordsMustMatch' });
      return;
    }
    setSubmitting(true);
    setStatus(null);
    try {
      await apiPost('/api/auth/activate', { token: token.trim(), password });
      setStatus({ tone: 'success', key: 'auth.activate.success' });
      await refreshSession();
      navigate('/portal/dashboard', { replace: true });
    } catch (err) {
      let key = 'auth.activate.failed';
      if (err?.status === 429) {
        key = 'auth.errors.rateLimited';
      } else if (err?.status === 400) {
        // 400 = missing/invalid/expired token (fields are validated above).
        key = 'auth.activate.invalidToken';
      }
      setStatus({ tone: 'error', key });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="bg-white py-16 text-gray-900">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6">
        <SectionTitle
          eyebrow={t('auth.eyebrow.account')}
          title={t('auth.activate.title')}
          description={t('auth.activate.description')}
        />
        {status ? (
          <div className={`rounded-2xl border px-6 py-4 text-xs uppercase tracking-[0.3em] ${statusStyle}`}>
            {t(status.key, status.vars)}
          </div>
        ) : null}
        <Card className="space-y-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="activation-token" className="text-xs uppercase tracking-[0.3em] text-gray-500">
                {t('auth.activate.token')}
              </label>
              <input
                id="activation-token"
                type="text"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder={t('auth.activate.tokenPlaceholder')}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0"
                required
              />
            </div>
            <div>
              <label htmlFor="activation-password" className="text-xs uppercase tracking-[0.3em] text-gray-500">
                {t('auth.fields.newPassword')}
              </label>
              <input
                id="activation-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0"
                minLength={MIN_PASSWORD_LENGTH}
                required
              />
            </div>
            <div>
              <label htmlFor="activation-password-confirm" className="text-xs uppercase tracking-[0.3em] text-gray-500">
                {t('auth.fields.confirmPassword')}
              </label>
              <input
                id="activation-password-confirm"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0"
                minLength={MIN_PASSWORD_LENGTH}
                required
              />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? t('auth.activate.submitting') : t('auth.activate.submit')}
            </Button>
          </form>
          <p className="text-[0.7rem] uppercase tracking-[0.35em] text-gray-500">
            {t('auth.activate.signedInPrompt')}{' '}
            <Link to="/portal/dashboard" className="font-semibold underline">
              {t('auth.activate.signedInLink')}
            </Link>
          </p>
          <p className="text-[0.7rem] uppercase tracking-[0.35em] text-gray-500">
            {t('auth.activate.expiredPrompt')}{' '}
            <Link to="/forgot-password" className="font-semibold text-gray-900 underline">
              {t('auth.activate.expiredLink')}
            </Link>
          </p>
        </Card>
      </div>
    </main>
  );
}
