import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import { apiPost } from '../lib/api.js';

const INITIAL_REGISTER = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  password: ''
};

const INITIAL_LOGIN = {
  email: '',
  password: ''
};

export default function AuthPage() {
  const navigate = useNavigate();
  const [registerForm, setRegisterForm] = useState(INITIAL_REGISTER);
  const [loginForm, setLoginForm] = useState(INITIAL_LOGIN);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleRegisterChange = (field) => (event) => {
    setRegisterForm((prev) => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleLoginChange = (field) => (event) => {
    setLoginForm((prev) => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setNotice(null);
    setError(null);

    try {
      const payload = {
        first_name: registerForm.first_name.trim(),
        last_name: registerForm.last_name.trim(),
        email: registerForm.email.trim().toLowerCase(),
        phone: registerForm.phone.trim() || null,
        password: registerForm.password
      };

      const response = await apiPost('/api/auth/register', payload);
      const redirect = response?.redirect_to || '/dashboard/user';
      setRegisterForm(INITIAL_REGISTER);
      setLoginForm(INITIAL_LOGIN);
      setNotice('Account created successfully – redirecting to your dashboard.');
      navigate(redirect, { replace: true });
    } catch (err) {
      if (err.status === 400) {
        setError('Please review the highlighted fields and try again.');
      } else {
        setError('Unable to create your account right now.');
      }
    } finally {
      setSubmitting(false);
    }
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
        setNotice('Signed in successfully – redirecting.');
        navigate(redirect, { replace: true });
        return;
      }

      setError('Unexpected response. Please try again.');
    } catch (err) {
      if (err.status === 401) {
        setError('Invalid email or password.');
      } else {
        setError('Unable to sign in right now.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="bg-white py-16 text-gray-900 dark:bg-black dark:text-gray-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6">
        <SectionTitle
          eyebrow="Account"
          title="Sign in or create an account"
          description="Access personal bookings, documents, and admin tools using your secure credentials."
        />
        {notice ? (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-4 text-xs uppercase tracking-[0.3em] text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
            {notice}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-2xl border border-rose-500 bg-rose-50 px-6 py-4 text-xs uppercase tracking-[0.3em] text-rose-700 dark:border-rose-400 dark:bg-rose-950/30 dark:text-rose-300">
            {error}
          </div>
        ) : null}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
              Create an account
            </h2>
            <form className="space-y-4" onSubmit={handleRegisterSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
                    First name
                  </label>
                  <input
                    type="text"
                    value={registerForm.first_name}
                    onChange={handleRegisterChange('first_name')}
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-400"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
                    Last name
                  </label>
                  <input
                    type="text"
                    value={registerForm.last_name}
                    onChange={handleRegisterChange('last_name')}
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-400"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">Email</label>
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={handleRegisterChange('email')}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-400"
                  required
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">Phone</label>
                <input
                  type="tel"
                  value={registerForm.phone}
                  onChange={handleRegisterChange('phone')}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-400"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">Password</label>
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={handleRegisterChange('password')}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-400"
                  required
                  minLength={8}
                />
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create account'}
              </Button>
            </form>
          </Card>
          <Card className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
              Sign in
            </h2>
            <form className="space-y-4" onSubmit={handleLoginSubmit}>
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">Email</label>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={handleLoginChange('email')}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-400"
                  required
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">Password</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={handleLoginChange('password')}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-400"
                  required
                />
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
              Admins use the same form. We will redirect you to the correct dashboard after authentication.
            </p>
          </Card>
        </div>
      </div>
    </main>
  );
}
