import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, type GooglePendingProfile } from '../context/AuthContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { ApiError } from '../services/api';

const DEMO_USERS = [
  { label: 'Dr. Ananya Rao (Instructor)', email: 'instructor@smarttech.edu' },
  { label: 'Aarav Sharma (Learner · 5/15 mastered)', email: 'aarav@smarttech.edu' },
  { label: 'Priya Nair (Learner · 1/15 mastered)', email: 'priya@smarttech.edu' },
  { label: 'Rohan Kulkarni (Learner · 11/15 mastered)', email: 'rohan@smarttech.edu' },
];

function GoogleMark() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
      />
    </svg>
  );
}

export function AuthPage() {
  const { t, i18n } = useTranslation();
  const { user, login, register, loginWithGoogle, completeGoogleSignup } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useDocumentMeta({
    title: 'Sign In — Smart-Tech',
    description: 'Sign in or create a learner or instructor account on Smart-Tech.',
    canonicalPath: '/auth',
  });

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
  const [pendingGoogle, setPendingGoogle] = useState<{
    idToken: string;
    profile: GooglePendingProfile;
  } | null>(null);

  useEffect(() => {
    if (user) {
      navigate(user.role === 'instructor' ? '/instructor' : '/learner', { replace: true });
    }
  }, [user, navigate]);

  const getCurrentLang = (): 'en' | 'kn' | 'hi' =>
    (['en', 'kn', 'hi'].includes(i18n.language) ? i18n.language : 'en') as 'en' | 'kn' | 'hi';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password.trim() || (mode === 'register' && !name.trim())) {
      setError(t('auth.errorRequired'));
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setError(t('auth.errorEmail'));
      return;
    }
    if (mode === 'register' && password.length < 6) {
      setError(t('auth.errorPasswordLength'));
      return;
    }

    setSubmitting(true);
    try {
      const lang = getCurrentLang();
      const loggedIn =
        mode === 'login'
          ? await login(trimmedEmail, password)
          : await register({
              name: name.trim(),
              email: trimmedEmail,
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

  const handleGoogleAuth = async () => {
    setError('');
    setSubmitting(true);
    try {
      const result = await loginWithGoogle({
        role,
        preferred_language: getCurrentLang(),
        confirmSignup: mode === 'register',
      });

      if (result.status === 'needs_registration') {
        setPendingGoogle({
          idToken: result.idToken,
          profile: result.googleProfile,
        });
        return;
      }

      navigate(result.user.role === 'instructor' ? '/instructor' : '/learner');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (typeof err === 'object' && err !== null && 'code' in err) {
        const code = String((err as { code?: string }).code);
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
          setError(t('auth.googlePopupClosed'));
        } else if (code === 'auth/popup-blocked') {
          setError(t('auth.googlePopupBlocked'));
        } else {
          setError(t('auth.googleAuthFailed'));
        }
      } else {
        setError(t('auth.googleAuthFailed'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteGoogleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingGoogle) return;
    setError('');
    setSubmitting(true);
    try {
      const created = await completeGoogleSignup(pendingGoogle.idToken, role, getCurrentLang());
      navigate(created.role === 'instructor' ? '/instructor' : '/learner');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.googleAuthFailed'));
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
          {pendingGoogle ? (
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900">
                {t('auth.googleSignupStepTitle')}
              </h1>
              <p className="text-sm text-slate-600 mt-1">{t('auth.googleSignupStepHint')}</p>

              {error && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800"
                >
                  {error}
                </div>
              )}

              <div className="mt-5 p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-3">
                {pendingGoogle.profile.avatar_url ? (
                  <img
                    src={pendingGoogle.profile.avatar_url}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full border border-slate-200 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center shrink-0">
                    {pendingGoogle.profile.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">
                    {pendingGoogle.profile.name}
                  </div>
                  <div className="text-xs font-mono text-slate-600 truncate">
                    {pendingGoogle.profile.email}
                  </div>
                </div>
              </div>

              <form onSubmit={handleCompleteGoogleSignup} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="google-role" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t('auth.role')}
                  </label>
                  <select
                    id="google-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'learner' | 'instructor')}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="learner">{t('auth.learnerRole')}</option>
                    <option value="instructor">{t('auth.instructorRole')}</option>
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? t('common.loading') : t('auth.googleCompleteBtn')}
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      setPendingGoogle(null);
                      setError('');
                    }}
                    className="py-2.5 px-4 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {t('auth.googleCancelBtn')}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4">
                <h1 className="font-display text-2xl font-bold text-slate-900">
                  {mode === 'login' ? t('auth.welcomeBack') : t('auth.createAccount')}
                </h1>
              </div>

              {error && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800"
                >
                  {error}
                </div>
              )}

              {/* Role selector shown in register mode so Google Sign-Up creates the chosen role directly */}
              {mode === 'register' && (
                <div className="mt-5">
                  <label htmlFor="auth-role" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t('auth.role')}
                  </label>
                  <select
                    id="auth-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'learner' | 'instructor')}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="learner">{t('auth.learnerRole')}</option>
                    <option value="instructor">{t('auth.instructorRole')}</option>
                  </select>
                </div>
              )}

              {/* Google Sign-In / Sign-Up */}
              <div className={mode === 'register' ? 'mt-4' : 'mt-6'}>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleGoogleAuth}
                  className="w-full inline-flex items-center justify-center gap-3 py-2.5 px-4 text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  <GoogleMark />
                  <span>{mode === 'login' ? t('auth.googleSignIn') : t('auth.googleSignUp')}</span>
                </button>
              </div>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {t('auth.orContinueWithEmail')}
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {mode === 'register' && (
                  <div>
                    <label htmlFor="auth-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {t('auth.fullName')}
                    </label>
                    <input
                      id="auth-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Kavya Hegde"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="auth-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t('auth.email')}
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@smarttech.edu"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label htmlFor="auth-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t('auth.password')}
                  </label>
                  <input
                    id="auth-password"
                    type="password"
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
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
            </>
          )}
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
                className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition-colors cursor-pointer disabled:opacity-50"
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
