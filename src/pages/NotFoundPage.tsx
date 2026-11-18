import { ArrowLeft, Compass } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

export function NotFoundPage() {
  const { t } = useTranslation();

  useDocumentMeta({
    title: `${t('notFound.code')} — ${t('notFound.title')} | Smart-Tech`,
    description: t('notFound.description'),
  });

  return (
    <main className="min-h-[65vh] flex items-center justify-center px-4 sm:px-6 py-16">
      <div className="max-w-lg w-full bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 text-center space-y-5 shadow-xs">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mx-auto">
          <Compass className="w-6 h-6" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-mono font-semibold text-indigo-700 tracking-wider">
            {t('notFound.code')}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            {t('notFound.title')}
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">{t('notFound.description')}</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            {t('notFound.backHome')}
          </Link>
          <Link
            to="/learn/1"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            {t('notFound.browseCourses')}
          </Link>
        </div>
      </div>
    </main>
  );
}
