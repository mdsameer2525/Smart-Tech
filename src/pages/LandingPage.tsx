import { ArrowRight, BookOpen, GitBranch, Layers, ShieldCheck, Waypoints } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';

interface CourseSummary {
  id: number;
  title: string;
  description: string;
  category: string;
  instructor_name: string;
  concept_count: number;
  edge_count: number;
  enrolled_count: number;
  total_duration: number;
}

const DEMO_ACCOUNTS = [
  {
    name: 'Dr. Ananya Rao',
    email: 'instructor@smarttech.edu',
    role: 'instructor' as const,
    summary: 'Course author · Graph editor & live restructuring',
  },
  {
    name: 'Aarav Sharma',
    email: 'aarav@smarttech.edu',
    role: 'learner' as const,
    summary: '5/15 mastered · Loops quiz failed (55%) · Target: Algorithms',
  },
  {
    name: 'Priya Nair',
    email: 'priya@smarttech.edu',
    role: 'learner' as const,
    summary: '1/15 mastered · Early beginner · Target: Recursion',
  },
  {
    name: 'Rohan Kulkarni',
    email: 'rohan@smarttech.edu',
    role: 'learner' as const,
    summary: '11/15 mastered · Advanced branch · Target: Algorithms',
  },
];

export function LandingPage() {
  const { t } = useTranslation();
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [demoLoadingEmail, setDemoLoadingEmail] = useState<string | null>(null);
  const [heroImgError, setHeroImgError] = useState(false);

  useEffect(() => {
    apiRequest<{ courses: CourseSummary[] }>('/courses')
      .then((res) => setCourses(res.courses))
      .catch(() => setCourses([]))
      .finally(() => setLoadingCourses(false));
  }, []);

  const handleQuickDemo = async (email: string) => {
    setDemoLoadingEmail(email);
    try {
      const loggedIn = await login(email, 'demo123');
      navigate(loggedIn.role === 'instructor' ? '/instructor' : '/learner');
    } finally {
      setDemoLoadingEmail(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
              <p className="text-xs font-semibold tracking-wide text-indigo-700">
                {t('landing.kicker')}
              </p>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 leading-[1.12] [text-wrap:balance]">
                {t('landing.headline')}
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                {t('landing.subheadline')}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                {user ? (
                  <Link
                    to={user.role === 'instructor' ? '/instructor' : '/learner'}
                    className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    {user.role === 'instructor'
                      ? t('landing.openInstructor')
                      : t('landing.openLearner')}
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/auth?mode=register&role=learner"
                      className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      {t('landing.openLearner')}
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                    <Link
                      to="/auth?mode=register&role=instructor"
                      className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      {t('landing.openInstructor')}
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div className="lg:col-span-5 flex items-stretch">
              <div className="w-full rounded-xl border border-slate-200 overflow-hidden bg-slate-100 min-h-[260px]">
                {!heroImgError ? (
                  <img
                    src="/src/assets/images/hero_knowledge_graph_1794938152732.jpg"
                    alt="Interconnected learning pathway network"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full min-h-[260px] flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-slate-100 to-indigo-50">
                    <GitBranch className="w-10 h-10 text-indigo-700 mb-3" />
                    <p className="font-display font-semibold text-slate-900">
                      {t('landing.pillar1Title')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Three Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="max-w-2xl mb-8">
          <h2 className="font-display text-2xl font-bold text-slate-900">
            {t('landing.howItWorksTitle')}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-1.5">
            {t('landing.howItWorksDesc')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <GitBranch className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="font-display text-lg font-semibold text-slate-900">
              {t('landing.pillar1Title')}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">{t('landing.pillar1Desc')}</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="font-display text-lg font-semibold text-slate-900">
              {t('landing.pillar2Title')}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">{t('landing.pillar2Desc')}</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Waypoints className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="font-display text-lg font-semibold text-slate-900">
              {t('landing.pillar3Title')}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">{t('landing.pillar3Desc')}</p>
          </div>
        </div>
      </section>

      {/* Instant Demo Accounts */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-14">
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900">
                {t('landing.demoAccountsTitle')}
              </h2>
              <p className="text-sm text-slate-600 mt-1">{t('landing.demoAccountsDesc')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {DEMO_ACCOUNTS.map((acc) => (
              <div
                key={acc.email}
                className="border border-slate-200 rounded-lg p-4 flex flex-col justify-between gap-4 bg-slate-50/50"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-indigo-700">
                      {acc.role === 'instructor'
                        ? t('landing.roleInstructor')
                        : t('landing.roleLearner')}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono truncate">{acc.email}</span>
                  </div>
                  <h3 className="font-display font-semibold text-slate-900">{acc.name}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{acc.summary}</p>
                </div>

                <button
                  type="button"
                  disabled={demoLoadingEmail !== null}
                  onClick={() => handleQuickDemo(acc.email)}
                  className="w-full py-2 px-3 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {demoLoadingEmail === acc.email
                    ? t('common.loading')
                    : `${t('landing.launchAs')} ${acc.name.split(' ')[0]}`}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Course Discovery */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <div className="mb-6">
          <h2 className="font-display text-2xl font-bold text-slate-900">
            {t('landing.catalogTitle')}
          </h2>
          <p className="text-sm text-slate-600 mt-1">{t('landing.catalogDesc')}</p>
        </div>

        {loadingCourses ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-44 rounded-xl border border-slate-200 bg-white animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-5"
              >
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-medium text-indigo-700">{course.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{course.instructor_name}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {course.concept_count} {t('landing.conceptsUnit')}
                    </span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-slate-900">{course.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{course.description}</p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-mono tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                      {course.edge_count} {t('landing.edgesUnit')}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                      {course.total_duration} {t('landing.minutesUnit')}
                    </span>
                  </div>

                  <Link
                    to={`/learn/${course.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    {t('landing.viewCourse')}
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
