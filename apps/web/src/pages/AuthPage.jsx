import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/use-auth.js';
import { StatusMessage } from '../components/StatusMessage.jsx';

export function AuthPage() {
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState('login');
  const { isLoading, login, register, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!isLoading && user) return <Navigate replace to="/dashboard" />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);

    try {
      if (mode === 'register') {
        await register({
          consentAccepted: form.get('consentAccepted') === 'on',
          consentVersion: 'mvp-v1',
          displayName: form.get('displayName'),
          email: form.get('email'),
          password: form.get('password'),
        });
      } else {
        await login({
          email: form.get('email'),
          password: form.get('password'),
        });
      }
      navigate(location.state?.from ?? '/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="bg-gradient-to-br from-indigo-700 to-violet-700 p-8 text-white sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-100">
          Prepare with purpose
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight">
          Your interview workspace starts here.
        </h1>
        <p className="mt-5 leading-7 text-indigo-100">
          Save one active resume, choose a software role, and keep your preparation data
          private to your account.
        </p>
      </section>

      <section className="p-8 sm:p-10" aria-labelledby="auth-title">
        <div className="flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Account access">
          {['login', 'register'].map((item) => (
            <button
              aria-pressed={mode === item}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold capitalize transition ${
                mode === item ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600'
              }`}
              key={item}
              onClick={() => {
                setError('');
                setMode(item);
              }}
              type="button"
            >
              {item === 'login' ? 'Sign in' : 'Register'}
            </button>
          ))}
        </div>

        <h2 className="mt-8 text-2xl font-semibold text-slate-950" id="auth-title">
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {mode === 'login'
            ? 'Sign in with your email and password.'
            : 'Use at least eight characters for your password.'}
        </p>

        <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
          {mode === 'register' ? (
            <label className="field-label">
              Display name
              <input autoComplete="name" className="field-input" name="displayName" required />
            </label>
          ) : null}
          <label className="field-label">
            Email
            <input
              autoComplete="email"
              className="field-input"
              name="email"
              required
              type="email"
            />
          </label>
          <label className="field-label">
            Password
            <input
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="field-input"
              minLength={8}
              name="password"
              required
              type="password"
            />
          </label>
          {mode === 'register' ? (
            <label className="flex items-start gap-3 text-sm leading-6 text-slate-600">
              <input className="mt-1 size-4 accent-indigo-600" name="consentAccepted" required type="checkbox" />
              <span>
                I consent to storing my account, resume, and interview answers and to future
                AI processing when I choose to start an interview.
              </span>
            </label>
          ) : null}
          {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
          <button className="button-primary w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </section>
    </div>
  );
}
