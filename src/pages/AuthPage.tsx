import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api';

const DEMO_USERS = [
  { label: 'Dr. Ananya Rao (Instructor)', email: 'instructor@smarttech.edu' },
  { label: 'Aarav Sharma (Learner · 5/15 mastered)', email: 'aarav@smarttech.edu' },
  { label: 'Priya Nair (Learner · 1/15 mastered)', email: 'priya@smarttech.edu' },
  { label: 'Rohan Kulkarni (Learner · 11/15 mastered)', email: 'rohan@smarttech.edu' },
];

export function AuthPage() {
  const { t, i18n } = useTranslation();
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState<'login' | 'register'>(
    searchParams.get('mode') === 'register' ? 'register' : 'login'
  );
  const [role, setRole] = useState<'learner' | 'instructor'>(
    searchParams.get('role') === 'instructor' ? 'instructor' : 'learner'
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate(user.role === 'instructor' ? '/instructor' : '/learner', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim() || (mode === 'register' && !name.trim())) {
      setError(t('auth.errorRequired'));
      return;
    }

    setSubmitting(true);
    try {
      const lang = (['en', 'kn', 'hi'].includes(i18n.language) ? i18n.language : 'en') as
        | 'en'
        | 'kn'
        | 'hi';
      const loggedIn =
        mode === 'login'
          ? await login(email.trim(), password)
          : await register({
              name: name.trim(),
              email: email.trim(),
              password,
              role,
              preferred_language: lang,
            });
      navigate(loggedIn.role === 'instructor' ? '/instructor' : '/learner');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setError('');
    setSubmitting(true);
    try {
      const loggedIn = await login(demoEmail, 'demo123');
      navigate(loggedIn.role === 'instructor' ? '/instructor' : '/learner');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-50 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Form Card */}
        <div className="md:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
          <h1 className="font-display text-2xl font-bold text-slate-900">
            {mode === 'login' ? t('auth.welcomeBack') : t('auth.createAccount')}
          </h1>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t('auth.fullName')}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Kavya Hegde"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t('auth.role')}
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'learner' | 'instructor')}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="learner">{t('auth.learnerRole')}</option>
                    <option value="instructor">{t('auth.instructorRole')}</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t('auth.email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@smarttech.edu"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t('auth.password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting
                ? t('common.loading')
                : mode === 'login'
                ? t('auth.submitLogin')
                : t('auth.submitRegister')}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
              }}
              className="text-sm font-medium text-indigo-700 hover:underline cursor-pointer"
            >
              {mode === 'login' ? t('auth.switchRegister') : t('auth.switchLogin')}
            </button>
          </div>
        </div>

        {/* Quick Demo Access */}
        <div className="md:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              {t('auth.quickDemoTitle')}
            </h2>
            <p className="text-xs text-slate-600 mt-1">{t('auth.quickDemoHint')}</p>
          </div>

          <div className="space-y-2.5">
            {DEMO_USERS.map((d) => (
              <button
                key={d.email}
                type="button"
                disabled={submitting}
                onClick={() => handleDemoLogin(d.email)}
                className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition-colors cursor-pointer"
              >
                <div className="text-sm font-semibold text-slate-900">{d.label}</div>
                <div className="text-xs font-mono text-slate-500 mt-0.5">{d.email}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
