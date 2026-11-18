import {
  Edit3,
  GitBranch,
  HelpCircle,
  Plus,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { ApiError, apiRequest } from '../services/api';

interface CourseItem {
  id: number;
  title: string;
  description: string;
  category: string;
  status: string;
  concept_count: number;
  edge_count: number;
  enrolled_count: number;
  is_owner?: boolean;
}

interface ConceptItem {
  id: number;
  course_id: number;
  title: string;
  description: string;
  lesson_content: string;
  video_url: string;
  estimated_duration: number;
  mastery_threshold: number;
  question_count: number;
}

interface EditableQuestion {
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
}

export function InstructorDashboard() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useDocumentMeta({
    title: `${t('instructor.dashboardTitle')} — Smart-Tech`,
    description: t('instructor.dashboardSubtitle'),
    canonicalPath: '/instructor',
  });

  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [concepts, setConcepts] = useState<ConceptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingConcepts, setLoadingConcepts] = useState(false);

  // Create Course state
  const [showNewCourse, setShowNewCourse] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [newCourseCat, setNewCourseCat] = useState('Computer Science');
  const [creatingCourse, setCreatingCourse] = useState(false);

  // Edit Course state
  const [editingCourse, setEditingCourse] = useState<CourseItem | null>(null);
  const [editCourseTitle, setEditCourseTitle] = useState('');
  const [editCourseDesc, setEditCourseDesc] = useState('');
  const [editCourseCat, setEditCourseCat] = useState('');
  const [savingCourseEdit, setSavingCourseEdit] = useState(false);

  // Delete confirmations (inline, never window.confirm)
  const [confirmDeleteCourseId, setConfirmDeleteCourseId] = useState<number | null>(null);
  const [deletingCourseId, setDeletingCourseId] = useState<number | null>(null);
  const [confirmDeleteConceptId, setConfirmDeleteConceptId] = useState<number | null>(null);
  const [deletingConceptId, setDeletingConceptId] = useState<number | null>(null);

  // Concept Modal state
  const [editingConcept, setEditingConcept] = useState<ConceptItem | null>(null);
  const [showConceptModal, setShowConceptModal] = useState(false);
  const [cTitle, setCTitle] = useState('');
  const [cDesc, setCDesc] = useState('');
  const [cLesson, setCLesson] = useState('');
  const [cVideo, setCVideo] = useState('');
  const [cDuration, setCDuration] = useState(20);
  const [cThreshold, setCThreshold] = useState(70);
  const [savingConcept, setSavingConcept] = useState(false);

  // Quiz Editor Modal state
  const [quizConcept, setQuizConcept] = useState<ConceptItem | null>(null);
  const [quizThreshold, setQuizThreshold] = useState(70);
  const [quizQuestions, setQuizQuestions] = useState<EditableQuestion[]>([]);
  const [loadingQuizId, setLoadingQuizId] = useState<number | null>(null);
  const [savingQuiz, setSavingQuiz] = useState(false);

  const [statusBanner, setStatusBanner] = useState('');
  const [errorBanner, setErrorBanner] = useState('');

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setErrorBanner('');
    try {
      const res = await apiRequest<{ courses: CourseItem[] }>('/courses');
      const owned = res.courses.filter((c) => c.is_owner !== false);
      setCourses(owned);
      setSelectedCourseId((prev) =>
        prev && owned.some((c) => c.id === prev) ? prev : owned[0]?.id ?? null
      );
    } catch (err) {
      setErrorBanner(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadConcepts = useCallback(async (cid: number) => {
    setLoadingConcepts(true);
    try {
      const res = await apiRequest<{ concepts: ConceptItem[] }>(`/courses/${cid}/concepts`);
      setConcepts(res.concepts);
    } catch (err) {
      setErrorBanner(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setLoadingConcepts(false);
    }
  }, [t]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'instructor') {
      navigate('/auth', { replace: true });
      return;
    }
    loadCourses();
  }, [user, authLoading, navigate, loadCourses]);

  useEffect(() => {
    if (selectedCourseId) {
      loadConcepts(selectedCourseId);
    } else {
      setConcepts([]);
    }
  }, [selectedCourseId, loadConcepts]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creatingCourse) return;
    setCreatingCourse(true);
    setErrorBanner('');
    setStatusBanner('');
    try {
      const res = await apiRequest<{ course: { id: number } }>('/courses', {
        method: 'POST',
        body: JSON.stringify({
          title: newCourseTitle,
          description: newCourseDesc,
          category: newCourseCat,
        }),
      });
      setNewCourseTitle('');
      setNewCourseDesc('');
      setShowNewCourse(false);
      await loadCourses();
      setSelectedCourseId(res.course.id);
    } catch (err) {
      setErrorBanner(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setCreatingCourse(false);
    }
  };

  const openEditCourse = (course: CourseItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCourse(course);
    setEditCourseTitle(course.title);
    setEditCourseDesc(course.description);
    setEditCourseCat(course.category);
  };

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse || savingCourseEdit) return;
    setSavingCourseEdit(true);
    setErrorBanner('');
    setStatusBanner('');
    try {
      await apiRequest(`/courses/${editingCourse.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editCourseTitle,
          description: editCourseDesc,
          category: editCourseCat,
        }),
      });
      setEditingCourse(null);
      await loadCourses();
      setStatusBanner(t('instructor.courseUpdated'));
    } catch (err) {
      setErrorBanner(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setSavingCourseEdit(false);
    }
  };

  const handleDeleteCourse = async (courseId: number) => {
    if (deletingCourseId !== null) return;
    setDeletingCourseId(courseId);
    setErrorBanner('');
    setStatusBanner('');
    try {
      await apiRequest(`/courses/${courseId}`, { method: 'DELETE' });
      setConfirmDeleteCourseId(null);
      await loadCourses();
      setStatusBanner(t('instructor.courseDeleted'));
    } catch (err) {
      setErrorBanner(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setDeletingCourseId(null);
    }
  };

  const openAddConcept = () => {
    setEditingConcept(null);
    setCTitle('');
    setCDesc('');
    setCLesson('');
    setCVideo('');
    setCDuration(20);
    setCThreshold(70);
    setShowConceptModal(true);
  };

  const openEditConcept = (c: ConceptItem) => {
    setEditingConcept(c);
    setCTitle(c.title);
    setCDesc(c.description);
    setCLesson(c.lesson_content);
    setCVideo(c.video_url || '');
    setCDuration(c.estimated_duration);
    setCThreshold(c.mastery_threshold);
    setShowConceptModal(true);
  };

  const handleSaveConcept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId || savingConcept) return;
    setSavingConcept(true);
    setErrorBanner('');
    setStatusBanner('');
    try {
      if (editingConcept) {
        await apiRequest(`/concepts/${editingConcept.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: cTitle,
            description: cDesc,
            lesson_content: cLesson,
            video_url: cVideo,
            estimated_duration: Number(cDuration),
            mastery_threshold: Number(cThreshold),
          }),
        });
      } else {
        await apiRequest(`/courses/${selectedCourseId}/concepts`, {
          method: 'POST',
          body: JSON.stringify({
            title: cTitle,
            description: cDesc,
            lesson_content: cLesson,
            video_url: cVideo,
            estimated_duration: Number(cDuration),
            mastery_threshold: Number(cThreshold),
          }),
        });
      }
      setShowConceptModal(false);
      await Promise.all([loadConcepts(selectedCourseId), loadCourses()]);
      setStatusBanner('Concept saved.');
    } catch (err) {
      setErrorBanner(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setSavingConcept(false);
    }
  };

  const handleDeleteConcept = async (conceptId: number) => {
    if (!selectedCourseId || deletingConceptId !== null) return;
    setDeletingConceptId(conceptId);
    setErrorBanner('');
    try {
      await apiRequest(`/concepts/${conceptId}`, { method: 'DELETE' });
      setConfirmDeleteConceptId(null);
      await Promise.all([loadConcepts(selectedCourseId), loadCourses()]);
    } catch (err) {
      setErrorBanner(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setDeletingConceptId(null);
    }
  };

  const openQuizEditor = async (c: ConceptItem) => {
    if (loadingQuizId !== null) return;
    setLoadingQuizId(c.id);
    setErrorBanner('');
    try {
      const res = await apiRequest<{
        quiz: { mastery_threshold: number };
        questions: EditableQuestion[];
      }>(`/concepts/${c.id}/quiz`);
      setQuizConcept(c);
      setQuizThreshold(res.quiz.mastery_threshold);
      setQuizQuestions(
        res.questions.map((q) => ({
          question: q.question,
          options: q.options,
          correct_answer: q.correct_answer ?? 0,
          explanation: q.explanation || '',
        }))
      );
    } catch (err) {
      setErrorBanner(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setLoadingQuizId(null);
    }
  };

  const handleSaveQuiz = async () => {
    if (!quizConcept || !selectedCourseId || savingQuiz) return;
    setSavingQuiz(true);
    setErrorBanner('');
    setStatusBanner('');
    try {
      await apiRequest(`/concepts/${quizConcept.id}/quiz`, {
        method: 'PUT',
        body: JSON.stringify({
          mastery_threshold: Number(quizThreshold),
          questions: quizQuestions,
        }),
      });
      setQuizConcept(null);
      await loadConcepts(selectedCourseId);
      setStatusBanner('Quiz updated.');
    } catch (err) {
      setErrorBanner(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setSavingQuiz(false);
    }
  };

  const selectedCourse = courses.find((c) => c.id === selectedCourseId) ?? null;

  if (loading || authLoading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="h-64 bg-white border border-slate-200 rounded-xl animate-pulse" />
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            {t('instructor.dashboardTitle')}
          </h1>
          <p className="text-sm text-slate-600 mt-1">{t('instructor.dashboardSubtitle')}</p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewCourse((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          {t('instructor.createCourse')}
        </button>
      </div>

      {statusBanner && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-900 flex items-center justify-between">
          <span>{statusBanner}</span>
          <button type="button" onClick={() => setStatusBanner('')} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {errorBanner && (
        <div
          role="alert"
          className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-900 flex items-center justify-between gap-3"
        >
          <span>{errorBanner}</span>
          <button type="button" onClick={() => setErrorBanner('')} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* New Course Drawer */}
      {showNewCourse && (
        <form
          onSubmit={handleCreateCourse}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <h2 className="font-display text-lg font-bold text-slate-900">
            {t('instructor.createCourse')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('instructor.courseTitle')}
              </label>
              <input
                type="text"
                required
                minLength={3}
                value={newCourseTitle}
                onChange={(e) => setNewCourseTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('instructor.courseCategory')}
              </label>
              <input
                type="text"
                value={newCourseCat}
                onChange={(e) => setNewCourseCat(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('instructor.courseDesc')}
            </label>
            <textarea
              rows={2}
              value={newCourseDesc}
              onChange={(e) => setNewCourseDesc(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNewCourse(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={creatingCourse}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer disabled:opacity-50"
            >
              {creatingCourse ? t('common.loading') : t('instructor.saveCourse')}
            </button>
          </div>
        </form>
      )}

      {/* Course Selector Cards */}
      {courses.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-600">
          {t('instructor.noCourses')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((course) => {
            const isSelected = course.id === selectedCourseId;
            return (
              <div
                key={course.id}
                onClick={() => setSelectedCourseId(course.id)}
                className={`p-5 rounded-xl border transition-colors cursor-pointer flex flex-col justify-between gap-4 ${
                  isSelected
                    ? 'bg-indigo-50/40 border-indigo-600'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-indigo-700">{course.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {course.concept_count} {t('landing.conceptsUnit')}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {course.edge_count} {t('landing.edgesUnit')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => openEditCourse(course, e)}
                        title={t('instructor.editCourse')}
                        className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-md cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                      {confirmDeleteCourseId === course.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={deletingCourseId === course.id}
                            onClick={() => handleDeleteCourse(course.id)}
                            className="px-2 py-1 text-[11px] font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded cursor-pointer disabled:opacity-50"
                          >
                            {deletingCourseId === course.id ? '...' : t('common.confirm')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteCourseId(null)}
                            className="px-2 py-1 text-[11px] font-medium text-slate-600 bg-slate-100 rounded cursor-pointer"
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteCourseId(course.id)}
                          title={t('instructor.deleteCourse')}
                          className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-md cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                  <h2 className="font-display text-lg font-bold text-slate-900">{course.title}</h2>
                  <p className="text-xs text-slate-600 line-clamp-2">{course.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-mono tabular-nums text-slate-600">
                    <Users className="w-3.5 h-3.5" aria-hidden="true" />
                    {course.enrolled_count} {t('landing.learnersUnit')}
                  </span>

                  <Link
                    to={`/instructor/course/${course.id}/graph`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg whitespace-nowrap shrink-0"
                  >
                    <GitBranch className="w-3.5 h-3.5" aria-hidden="true" />
                    {t('instructor.openGraphEditor')}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Course Concept Manager */}
      {selectedCourse && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900">
                {selectedCourse.title} — {t('instructor.manageConcepts')}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/instructor/course/${selectedCourse.id}/graph`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg"
              >
                <GitBranch className="w-3.5 h-3.5" aria-hidden="true" />
                {t('instructor.openGraphEditor')}
              </Link>
              <button
                type="button"
                onClick={openAddConcept}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                {t('instructor.addConcept')}
              </button>
            </div>
          </div>

          {loadingConcepts ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {concepts.map((c) => (
                <div
                  key={c.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                      <span className="font-semibold text-slate-700">{c.estimated_duration}m</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {t('courseLearn.thresholdLabel', { threshold: c.mastery_threshold })}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{c.question_count} MCQs</span>
                    </div>
                    <h3 className="font-display font-semibold text-slate-900">{c.title}</h3>
                    <p className="text-xs text-slate-600">{c.description}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditConcept(c)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                      {t('instructor.editConcept')}
                    </button>
                    <button
                      type="button"
                      disabled={loadingQuizId === c.id}
                      onClick={() => openQuizEditor(c)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg cursor-pointer disabled:opacity-50"
                    >
                      <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
                      {loadingQuizId === c.id ? t('common.loading') : t('instructor.editQuiz')}
                    </button>

                    {confirmDeleteConceptId === c.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={deletingConceptId === c.id}
                          onClick={() => handleDeleteConcept(c.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer disabled:opacity-50"
                        >
                          {deletingConceptId === c.id
                            ? t('common.loading')
                            : t('instructor.confirmArchiveConcept')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteConceptId(null)}
                          className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg cursor-pointer"
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteConceptId(c.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        {t('instructor.deleteConcept')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Edit Course Modal */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleUpdateCourse}
            className="bg-white border border-slate-200 rounded-xl w-full max-w-lg p-6 space-y-4 my-8"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-slate-900">
                {t('instructor.editCourse')}
              </h3>
              <button
                type="button"
                onClick={() => setEditingCourse(null)}
                className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('instructor.courseTitle')}
              </label>
              <input
                type="text"
                required
                minLength={3}
                value={editCourseTitle}
                onChange={(e) => setEditCourseTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('instructor.courseCategory')}
              </label>
              <input
                type="text"
                required
                value={editCourseCat}
                onChange={(e) => setEditCourseCat(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('instructor.courseDesc')}
              </label>
              <textarea
                rows={3}
                value={editCourseDesc}
                onChange={(e) => setEditCourseDesc(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingCourse(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={savingCourseEdit}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer disabled:opacity-50"
              >
                {savingCourseEdit ? t('common.loading') : t('instructor.updateCourse')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add / Edit Concept Modal */}
      {showConceptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveConcept}
            className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl p-6 space-y-4 my-8"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-slate-900">
                {editingConcept ? t('instructor.editConcept') : t('instructor.addConcept')}
              </h3>
              <button
                type="button"
                onClick={() => setShowConceptModal(false)}
                className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('instructor.conceptTitle')}
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={cTitle}
                  onChange={(e) => setCTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('instructor.durationMinutes')}
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={240}
                    value={cDuration}
                    onChange={(e) => setCDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('instructor.masteryThreshold')}
                  </label>
                  <input
                    type="number"
                    min={40}
                    max={100}
                    value={cThreshold}
                    onChange={(e) => setCThreshold(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('instructor.conceptDesc')}
              </label>
              <input
                type="text"
                value={cDesc}
                onChange={(e) => setCDesc(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('instructor.lessonContent')}
              </label>
              <textarea
                rows={5}
                value={cLesson}
                onChange={(e) => setCLesson(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('instructor.videoUrl')}
              </label>
              <input
                type="url"
                value={cVideo}
                onChange={(e) => setCVideo(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConceptModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={savingConcept}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer disabled:opacity-50"
              >
                {savingConcept ? t('common.loading') : t('instructor.saveConcept')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quiz Editor Modal */}
      {quizConcept && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-3xl p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  {quizConcept.title} — {t('instructor.editQuiz')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setQuizConcept(null)}
                className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-w-xs">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('instructor.masteryThreshold')}
              </label>
              <input
                type="number"
                min={40}
                max={100}
                value={quizThreshold}
                onChange={(e) => setQuizThreshold(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-700">
                  {t('instructor.quizQuestions')}
                </h4>
                <button
                  type="button"
                  onClick={() =>
                    setQuizQuestions((prev) => [
                      ...prev,
                      {
                        question: '',
                        options: ['', '', '', ''],
                        correct_answer: 0,
                        explanation: '',
                      },
                    ])
                  }
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-lg cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t('instructor.addQuestion')}
                </button>
              </div>

              {quizQuestions.map((q, qIdx) => (
                <div
                  key={qIdx}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-600">Q{qIdx + 1}</span>
                    {quizQuestions.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setQuizQuestions((prev) => prev.filter((_, i) => i !== qIdx))
                        }
                        className="text-xs text-rose-600 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder={t('instructor.questionPrompt')}
                    value={q.question}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuizQuestions((prev) =>
                        prev.map((item, i) => (i === qIdx ? { ...item, question: val } : item))
                      );
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${qIdx}`}
                          checked={q.correct_answer === oIdx}
                          onChange={() =>
                            setQuizQuestions((prev) =>
                              prev.map((item, i) =>
                                i === qIdx ? { ...item, correct_answer: oIdx } : item
                              )
                            )
                          }
                          title={t('instructor.correctOption')}
                        />
                        <input
                          type="text"
                          value={opt}
                          placeholder={`Option ${oIdx + 1}`}
                          onChange={(e) => {
                            const val = e.target.value;
                            setQuizQuestions((prev) =>
                              prev.map((item, i) =>
                                i === qIdx
                                  ? {
                                      ...item,
                                      options: item.options.map((o, oi) => (oi === oIdx ? val : o)),
                                    }
                                  : item
                              )
                            );
                          }}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                        />
                      </div>
                    ))}
                  </div>

                  <input
                    type="text"
                    placeholder={t('instructor.explanation')}
                    value={q.explanation}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuizQuestions((prev) =>
                        prev.map((item, i) => (i === qIdx ? { ...item, explanation: val } : item))
                      );
                    }}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setQuizConcept(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={savingQuiz}
                onClick={handleSaveQuiz}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer disabled:opacity-50"
              >
                {savingQuiz ? t('common.loading') : t('instructor.saveQuiz')}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
