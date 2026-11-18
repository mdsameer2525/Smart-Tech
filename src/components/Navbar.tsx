import { Globe, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BrandLogo } from './BrandLogo';

export function Navbar() {
  const { t, i18n } = useTranslation();
  const { user, logout, changeLanguage } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileOpen(false);
  };

  const navLinkClass = (active: boolean) =>
    `text-sm font-medium transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 ${
      active
        ? 'text-indigo-700 border-indigo-700'
        : 'text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand mark + wordmark */}
        <Link
          to="/"
          className="inline-flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          <BrandLogo size={28} />
          <span>{t('brand')}</span>
        </Link>

        {/* Zone 2: Concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/" className={navLinkClass(location.pathname === '/')}>
            {t('nav.home')}
          </Link>
          {user?.role === 'learner' && (
            <Link to="/learner" className={navLinkClass(location.pathname.startsWith('/learner'))}>
              {t('nav.learnerHub')}
            </Link>
          )}
          {user?.role === 'instructor' && (
            <Link
              to="/instructor"
              className={navLinkClass(location.pathname.startsWith('/instructor'))}
            >
              {t('nav.instructorStudio')}
            </Link>
          )}
          <Link
            to="/learn/1"
            className={navLinkClass(location.pathname.startsWith('/learn'))}
          >
            {t('nav.courses')}
          </Link>
          <Link
            to="/games"
            className={navLinkClass(location.pathname.startsWith('/games'))}
          >
            {t('nav.gameZone')}
          </Link>
          <Link
            to="/explore"
            className={navLinkClass(location.pathname.startsWith('/explore'))}
          >
            {t('nav.explore3d')}
          </Link>
        </nav>

        {/* Zone 3: Language selector + Primary Action */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50">
            <Globe className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
            <select
              aria-label={t('lang.label')}
              value={i18n.language}
              onChange={(e) => changeLanguage(e.target.value as 'en' | 'kn' | 'hi')}
              className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="en">{t('lang.en')}</option>
              <option value="kn">{t('lang.kn')}</option>
              <option value="hi">{t('lang.hi')}</option>
            </select>
          </div>

          {user ? (
            <div className="flex items-center gap-3">
              <Link
                to={user.role === 'instructor' ? '/instructor' : '/learner'}
                className="text-sm font-medium text-slate-700 hover:text-indigo-700 whitespace-nowrap shrink-0"
              >
                {user.name}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                {t('nav.signOut')}
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {t('nav.signIn')}
            </Link>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100"
          aria-label="Toggle Menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3">
          <div className="flex flex-col gap-2">
            <Link
              to="/"
              onClick={() => setMobileOpen(false)}
              className="py-2 text-sm font-medium text-slate-700"
            >
              {t('nav.home')}
            </Link>
            {user?.role === 'learner' && (
              <Link
                to="/learner"
                onClick={() => setMobileOpen(false)}
                className="py-2 text-sm font-medium text-slate-700"
              >
                {t('nav.learnerHub')}
              </Link>
            )}
            {user?.role === 'instructor' && (
              <Link
                to="/instructor"
                onClick={() => setMobileOpen(false)}
                className="py-2 text-sm font-medium text-slate-700"
              >
                {t('nav.instructorStudio')}
              </Link>
            )}
            <Link
              to="/learn/1"
              onClick={() => setMobileOpen(false)}
              className="py-2 text-sm font-medium text-slate-700"
            >
              {t('nav.courses')}
            </Link>
            <Link
              to="/games"
              onClick={() => setMobileOpen(false)}
              className="py-2 text-sm font-medium text-slate-700"
            >
              {t('nav.gameZone')}
            </Link>
            <Link
              to="/explore"
              onClick={() => setMobileOpen(false)}
              className="py-2 text-sm font-medium text-slate-700"
            >
              {t('nav.explore3d')}
            </Link>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
            <select
              aria-label={t('lang.label')}
              value={i18n.language}
              onChange={(e) => changeLanguage(e.target.value as 'en' | 'kn' | 'hi')}
              className="border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 bg-slate-50"
            >
              <option value="en">{t('lang.en')}</option>
              <option value="kn">{t('lang.kn')}</option>
              <option value="hi">{t('lang.hi')}</option>
            </select>

            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg"
              >
                {t('nav.signOut')}
              </button>
            ) : (
              <Link
                to="/auth"
                onClick={() => setMobileOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 rounded-lg"
              >
                {t('nav.signIn')}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
