import {
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  Box,
  CheckCheck,
  Flame,
  Gamepad2,
  Lock,
  PlayCircle,
  Sparkles,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { NotificationItem, type NotificationRecord } from '../components/NotificationItem';
import { useAuth } from '../context/AuthContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { ApiError, apiRequest } from '../services/api';
import {
  fetchGamificationProfile,
  type GamificationProfile,
} from '../services/gamificationClient';

interface EnrolledCourse {
  course_id: number;
  title: string;
  description: string;
  category: string;
  instructor_name: string;
  masteredCount: number;
  totalCount: number;
  unlockedCount: number;
  lockedCount: number;
  progressPercentage: number;
}

interface CatalogCourse {
  id: number;
  title: string;
  description: string;
  category: string;
  instructor_name: string;
  concept_count: number;
  total_duration: number;
  is_enrolled?: boolean;
}

export function LearnerDashboard() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useDocumentMeta({
    title: `${t('learner.dashboardTitle')} — Smart-Tech`,
    description: t('learner.dashboardSubtitle'),
    canonicalPath: '/learner',
  });

  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [catalogCourses, setCatalogCourses] = useState<CatalogCourse[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [gamification, setGamification] = useState<GamificationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [enrollingId, setEnrollingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [enrRes, catRes, notifRes, gamRes] = await Promise.all([
        apiRequest<{ courses: EnrolledCourse[] }>('/learner/courses'),
        apiRequest<{ courses: CatalogCourse[] }>('/courses'),
        apiRequest<{ notifications: NotificationRecord[]; unreadCount: number }>('/notifications'),
        fetchGamificationProfile().catch(() => null),
      ]);
      setEnrolledCourses(enrRes.courses);
      setCatalogCourses(catRes.courses);
      setNotifications(notifRes.notifications);
      setUnreadCount(notifRes.unreadCount);
      setGamification(gamRes?.profile ?? null);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }
    loadData();
  }, [user, authLoading, navigate, loadData]);

  const handleEnroll = async (courseId: number) => {
    setEnrollingId(courseId);
    setErrorMsg('');
    try {
      await apiRequest(`/courses/${courseId}/enroll`, { method: 'POST' });
      await loadData();
      navigate(`/learn/${courseId}`);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setEnrollingId(null);
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_status: 1 } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : t('common.error'));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiRequest('/notifications/read-all', { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, read_status: 1 })));
      setUnreadCount(0);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : t('common.error'));
    }
  };

  if (loading || authLoading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-48 bg-white border border-slate-200 rounded-xl animate-pulse" />
          <div className="h-48 bg-white border border-slate-200 rounded-xl animate-pulse" />
        </div>
      </main>
    );
  }

  const enrolledIds = new Set(enrolledCourses.map((c) => c.course_id));
  const discoverable = catalogCourses.filter((c) => !enrolledIds.has(c.id));

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
          {t('learner.dashboardTitle')}
        </h1>
        <p className="text-sm text-slate-600 mt-1">{t('learner.dashboardSubtitle')}</p>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-900 flex flex-wrap items-center justify-between gap-3"
        >
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={loadData}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {/* Interactive Practice & 3D Lab Progress Summary */}
      {gamification && (
        <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-700">
              <Sparkles className="w-4 h-4" />
              <span>Interactive Practice & 3D Labs</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="font-mono font-bold text-slate-900">
                Level {gamification.level} · {gamification.xp} XP
              </span>
              <span className="inline-flex items-center gap-1 text-amber-800 font-semibold">
                <Flame className="w-4 h-4" />
                {gamification.currentStreak}d Streak
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-800 font-semibold">
                <Award className="w-4 h-4" />
                {gamification.badges.filter((b) => b.unlocked).length} Badges
              </span>
              <span className="text-slate-600">
                {gamification.exploreProgress.filter((e) => e.completed).length}/5 3D Labs Mastered
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              to="/games"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg"
            >
              <Gamepad2 className="w-4 h-4" />
              Open Game Zone
            </Link>
            <Link
              to="/explore"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              <Box className="w-4 h-4" />
              Open 3D Explore
            </Link>
          </div>
        </section>
      )}

      {/* Enrolled Courses */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-slate-900">
          {t('learner.enrolledCourses')}
        </h2>

        {enrolledCourses.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-2">
            <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="font-medium text-slate-800">{t('learner.noEnrollments')}</p>
            <p className="text-sm text-slate-500">{t('learner.noEnrollmentsHint')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {enrolledCourses.map((course) => (
              <div
                key={course.course_id}
                className="bg-white border border-slate-200 hover:border-indigo-300 rounded-xl p-6 flex flex-col justify-between gap-5 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-medium text-indigo-700">{course.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{course.instructor_name}</span>
                  </div>

                  <h3 className="font-display text-xl font-bold text-slate-900">{course.title}</h3>
                  <p className="text-sm text-slate-600 line-clamp-2">{course.description}</p>

                  {/* Progress Bar */}
                  <div className="pt-2 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">
                        {t('learner.masteredOf', {
                          mastered: course.masteredCount,
                          total: course.totalCount,
                        })}
                      </span>
                      <span className="font-mono tabular-nums font-semibold text-indigo-700">
                        {course.progressPercentage}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-700 rounded-full transition-all duration-300"
                        style={{ width: `${course.progressPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
                    <span className="inline-flex items-center gap-1 text-indigo-700 font-medium">
                      <PlayCircle className="w-3.5 h-3.5" aria-hidden="true" />
                      {t('learner.availableCount', { count: course.unlockedCount })}
                    </span>
                    <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                      <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                      {t('learner.lockedCount', { count: course.lockedCount })}
                    </span>
                  </div>

                  <Link
                    to={`/learn/${course.course_id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    {t('learner.continueLearning')}
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Notifications */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-indigo-700" aria-hidden="true" />
            <h2 className="font-display text-xl font-bold text-slate-900">
              {t('learner.notificationsTitle')}
            </h2>
            {unreadCount > 0 && (
              <span className="text-xs font-mono tabular-nums font-semibold text-indigo-700">
                ({unreadCount})
              </span>
            )}
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />
              {t('learner.markAllRead')}
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-500">
            {t('learner.noNotifications')}
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <NotificationItem key={notif.id} notif={notif} onMarkRead={handleMarkRead} />
            ))}
          </div>
        )}
      </section>

      {/* Discover More Courses */}
      {discoverable.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-slate-900">
            {t('learner.discoverCourses')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {discoverable.map((course) => (
              <div
                key={course.id}
                className="bg-white border border-slate-200 hover:border-indigo-300 rounded-xl p-6 flex flex-col justify-between gap-4 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-medium text-indigo-700">{course.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {course.concept_count} {t('landing.conceptsUnit')}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {course.total_duration} {t('landing.minutesUnit')}
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-slate-900">{course.title}</h3>
                  <p className="text-sm text-slate-600">{course.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                  <Link
                    to={`/learn/${course.id}`}
                    className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900"
                  >
                    {t('landing.viewCourse')}
                  </Link>
                  <button
                    type="button"
                    disabled={enrollingId === course.id}
                    onClick={() => handleEnroll(course.id)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {enrollingId === course.id ? t('common.loading') : t('learner.enrollNow')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
