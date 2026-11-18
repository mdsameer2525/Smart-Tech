import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  History,
  Lock,
  PlayCircle,
  RotateCcw,
  Waypoints,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ConceptGraphCanvas } from '../graph/ConceptGraphCanvas';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { ApiError, apiRequest } from '../services/api';

function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

interface ConceptProgressItem {
  id: number;
  conceptId: number;
  title: string;
  description: string;
  lesson_content: string;
  video_url: string;
  estimated_duration: number;
  level: number;
  isMastered: boolean;
  isUnlocked: boolean;
  status: 'mastered' | 'unlocked' | 'locked';
  missingPrerequisiteIds: number[];
  missingPrerequisiteTitles: string[];
  needsPrerequisiteReview: boolean;
  lessonCompleted: boolean;
  bestScore: number;
  quizId: number | null;
  masteryThreshold: number;
}

interface CourseEdge {
  id: number;
  prerequisite_concept_id: number;
  dependent_concept_id: number;
}

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
}

interface QuizAttempt {
  id: number;
  score: number;
  passed: number;
  attempted_at: string;
}

interface QuizResult {
  score: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
  masteryThreshold: number;
  newlyUnlocked: Array<{ id: number; title: string }>;
  feedback: Array<{
    questionId: number;
    question: string;
    selectedOption: number;
    correctOption: number;
    isCorrect: boolean;
    explanation: string;
  }>;
}

interface LearningPathData {
  targetConceptId: number;
  targetTitle: string;
  alreadyMasteredTarget: boolean;
  completedPrerequisites: Array<{ conceptId: number; title: string }>;
  remainingSteps: Array<{
    conceptId: number;
    title: string;
    estimatedDuration: number;
    status: 'mastered' | 'unlocked' | 'locked';
    prerequisites: string[];
    stepNumber: number;
  }>;
  estimatedTotalMinutes: number;
  currentPositionConceptId: number | null;
  branchExplanation: string;
}

interface RetiredRecord {
  id: number;
  title: string;
  mastery_status: string;
  best_score: number;
  mastered_at: string | null;
}

export function CourseLearningPage() {
  const { courseId } = useParams();
  const parsedCid = Number(courseId);
  const cid = Number.isInteger(parsedCid) && parsedCid > 0 ? parsedCid : 0;
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [enrolled, setEnrolled] = useState(false);
  const [concepts, setConcepts] = useState<ConceptProgressItem[]>([]);
  const [edges, setEdges] = useState<CourseEdge[]>([]);
  const [masteredCount, setMasteredCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [retiredHistory, setRetiredHistory] = useState<RetiredRecord[]>([]);

  const [activeTab, setActiveTab] = useState<'graph' | 'path' | 'list'>('graph');
  const [selectedConceptId, setSelectedConceptId] = useState<number | null>(null);
  const [targetConceptId, setTargetConceptId] = useState<number | null>(null);
  const [learningPath, setLearningPath] = useState<LearningPathData | null>(null);

  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizThreshold, setQuizThreshold] = useState(70);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [completingLesson, setCompletingLesson] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [actionError, setActionError] = useState('');
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  useDocumentMeta({
    title: courseTitle ? `${courseTitle} — Smart-Tech` : 'Course — Smart-Tech',
    description: courseDesc || 'Interactive prerequisite concept graph and mastery quiz.',
    canonicalPath: cid ? `/learn/${cid}` : undefined,
  });

  const fetchCourseState = useCallback(async () => {
    if (!cid) {
      setLoadError(t('courseLearn.courseNotFoundHint'));
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError('');
    try {
      if (user) {
        const res = await apiRequest<{
          course: { title: string; description: string };
          enrolled: boolean;
          targetConceptId: number | null;
          concepts: ConceptProgressItem[];
          edges: CourseEdge[];
          masteredCount: number;
          totalCount: number;
          progressPercentage: number;
          retiredHistory: RetiredRecord[];
        }>(`/courses/${cid}/progress`);

        setCourseTitle(res.course.title);
        setCourseDesc(res.course.description);
        setEnrolled(res.enrolled);
        setConcepts(res.concepts);
        setEdges(res.edges);
        setMasteredCount(res.masteredCount);
        setTotalCount(res.totalCount);
        setProgressPercentage(res.progressPercentage);
        setRetiredHistory(res.retiredHistory || []);

        const firstUnlocked =
          res.concepts.find((c) => c.status === 'unlocked') ?? res.concepts[0] ?? null;
        setSelectedConceptId((prev) =>
          prev && res.concepts.some((c) => c.id === prev) ? prev : firstUnlocked?.id ?? null
        );

        const defaultTarget =
          res.targetConceptId && res.concepts.some((c) => c.id === res.targetConceptId)
            ? res.targetConceptId
            : res.concepts[res.concepts.length - 1]?.id ?? null;
        setTargetConceptId(defaultTarget);
      } else {
        const res = await apiRequest<{
          course: { title: string; description: string };
          concepts: Array<{
            id: number;
            title: string;
            description: string;
            lesson_content: string;
            video_url: string;
            estimated_duration: number;
          }>;
          edges: CourseEdge[];
        }>(`/courses/${cid}`);

        setCourseTitle(res.course.title);
        setCourseDesc(res.course.description);
        setEnrolled(false);
        const mapped: ConceptProgressItem[] = res.concepts.map((c, idx) => ({
          ...c,
          conceptId: c.id,
          level: idx,
          isMastered: false,
          isUnlocked: idx === 0,
          status: idx === 0 ? 'unlocked' : 'locked',
          missingPrerequisiteIds: [],
          missingPrerequisiteTitles: [],
          needsPrerequisiteReview: false,
          lessonCompleted: false,
          bestScore: 0,
          quizId: null,
          masteryThreshold: 70,
        }));
        setConcepts(mapped);
        setEdges(res.edges);
        setTotalCount(mapped.length);
        setSelectedConceptId((prev) =>
          prev && mapped.some((c) => c.id === prev) ? prev : mapped[0]?.id ?? null
        );
      }
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : t('courseLearn.courseNotFoundHint'));
    } finally {
      setLoading(false);
    }
  }, [cid, user, t]);

  useEffect(() => {
    fetchCourseState();
  }, [fetchCourseState]);

  const selectedConcept = useMemo(
    () => concepts.find((c) => c.id === selectedConceptId) ?? null,
    [concepts, selectedConceptId]
  );

  // Load quiz for selected concept when unlocked/mastered
  useEffect(() => {
    setQuizResult(null);
    setSelectedAnswers({});
    setActionMsg('');
    setActionError('');

    if (!user || !selectedConcept || !selectedConcept.isUnlocked) {
      setQuizQuestions([]);
      setQuizAttempts([]);
      return;
    }

    apiRequest<{
      quiz: { mastery_threshold: number };
      questions: QuizQuestion[];
      attempts: QuizAttempt[];
    }>(`/concepts/${selectedConcept.id}/quiz`)
      .then((res) => {
        setQuizQuestions(res.questions);
        setQuizThreshold(res.quiz.mastery_threshold);
        setQuizAttempts(res.attempts);
      })
      .catch(() => {
        setQuizQuestions([]);
        setQuizAttempts([]);
      });
  }, [user, selectedConcept?.id, selectedConcept?.isUnlocked]);

  // Load learning path when targetConceptId changes
  const fetchLearningPath = useCallback(
    async (targetId: number) => {
      if (!user) return;
      try {
        const res = await apiRequest<{ learningPath: LearningPathData }>(
          `/courses/${cid}/learning-path/${targetId}`
        );
        setLearningPath(res.learningPath);
      } catch {
        setLearningPath(null);
      }
    },
    [cid, user]
  );

  useEffect(() => {
    if (user && targetConceptId) {
      fetchLearningPath(targetConceptId);
    }
  }, [user, targetConceptId, fetchLearningPath, masteredCount]);

  const handleEnroll = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setEnrolling(true);
    setActionError('');
    try {
      await apiRequest(`/courses/${cid}/enroll`, { method: 'POST' });
      await fetchCourseState();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setEnrolling(false);
    }
  };

  const handleCompleteLesson = async () => {
    if (!selectedConcept || !user || completingLesson) return;
    setCompletingLesson(true);
    setActionError('');
    try {
      await apiRequest(`/lessons/${selectedConcept.id}/complete`, { method: 'PATCH' });
      setConcepts((prev) =>
        prev.map((c) => (c.id === selectedConcept.id ? { ...c, lessonCompleted: true } : c))
      );
      setActionMsg(t('courseLearn.lessonCompleted'));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setCompletingLesson(false);
    }
  };

  const answeredCount = useMemo(
    () => quizQuestions.filter((_, idx) => selectedAnswers[idx] !== undefined).length,
    [quizQuestions, selectedAnswers]
  );

  const handleSubmitQuiz = async () => {
    if (!selectedConcept?.quizId || !user || submittingQuiz) return;
    if (answeredCount < quizQuestions.length) {
      setActionError(t('courseLearn.unansweredWarning', { total: quizQuestions.length }));
      return;
    }
    setSubmittingQuiz(true);
    setActionError('');
    try {
      const answers = quizQuestions.map((_, idx) =>
        selectedAnswers[idx] !== undefined ? selectedAnswers[idx] : -1
      );
      const res = await apiRequest<QuizResult>(`/quizzes/${selectedConcept.quizId}/attempt`, {
        method: 'POST',
        body: JSON.stringify({ answers }),
      });
      setQuizResult(res);
      await fetchCourseState();
      if (targetConceptId) {
        await fetchLearningPath(targetConceptId);
      }
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const pathHighlightIds = useMemo(
    () => (learningPath ? learningPath.remainingSteps.map((s) => s.conceptId) : []),
    [learningPath]
  );

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="h-8 w-80 bg-slate-200 rounded animate-pulse" />
        <div className="h-[460px] bg-white border border-slate-200 rounded-xl animate-pulse" />
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4">
          <h1 className="font-display text-2xl font-bold text-slate-900">
            {t('courseLearn.courseNotFound')}
          </h1>
          <p className="text-sm text-slate-600">{loadError}</p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {t('notFound.backHome')}
            </Link>
            <button
              type="button"
              onClick={fetchCourseState}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              {t('common.retry')}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header & Progress Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <Link
              to={user?.role === 'instructor' ? '/instructor' : user ? '/learner' : '/'}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              {t('courseLearn.backToDashboard')}
            </Link>
            <h1 className="font-display text-2xl font-bold text-slate-900">{courseTitle}</h1>
            <p className="text-sm text-slate-600">{courseDesc}</p>
          </div>

          {!enrolled && (
            <button
              type="button"
              disabled={enrolling}
              onClick={handleEnroll}
              className="px-4 py-2.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            >
              {enrolling ? t('common.loading') : user ? t('learner.enrollNow') : t('nav.signIn')}
            </button>
          )}
        </div>

        {user && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">
                {t('learner.masteredOf', { mastered: masteredCount, total: totalCount })}
              </span>
              <span className="font-mono tabular-nums font-semibold text-indigo-700">
                {progressPercentage}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-700 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        {!enrolled && (
          <div className="p-3 rounded-lg bg-indigo-50/70 border border-indigo-200 text-xs text-indigo-900">
            {t('courseLearn.enrollPrompt')}
          </div>
        )}
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('graph')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'graph'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('courseLearn.tabGraph')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('path')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'path'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('courseLearn.tabPath')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'list'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('courseLearn.tabList')}
          </button>
        </div>

        {user && concepts.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <Waypoints className="w-4 h-4 text-indigo-700 shrink-0" aria-hidden="true" />
            <label htmlFor="target-select" className="font-medium text-slate-700 whitespace-nowrap">
              {t('learningPath.selectTarget')}:
            </label>
            <select
              id="target-select"
              value={targetConceptId ?? ''}
              onChange={(e) => setTargetConceptId(Number(e.target.value))}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              {concepts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tab 1: Interactive Graph + Selected Concept Study Deck */}
      {activeTab === 'graph' && (
        <div className="space-y-6">
          <ConceptGraphCanvas
            nodes={concepts}
            edges={edges}
            selectedNodeId={selectedConceptId}
            onSelectNode={(id) => setSelectedConceptId(id)}
            mode="learner"
            highlightedPathIds={pathHighlightIds}
          />
        </div>
      )}

      {/* Tab 2: Personalized Learning Path */}
      {activeTab === 'path' && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          {!user ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-sm text-slate-600">{t('courseLearn.enrollPrompt')}</p>
              <Link
                to="/auth"
                className="inline-block px-4 py-2 text-xs font-semibold text-white bg-indigo-700 rounded-lg"
              >
                {t('nav.signIn')}
              </Link>
            </div>
          ) : learningPath ? (
            <>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h2 className="font-display text-xl font-bold text-slate-900">
                    {t('learningPath.title')} → {learningPath.targetTitle}
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">{learningPath.branchExplanation}</p>
                </div>

                <div className="grid grid-cols-3 gap-4 shrink-0 text-center border border-slate-200 rounded-lg p-3 bg-slate-50">
                  <div>
                    <div className="text-xs text-slate-500">{t('learningPath.remainingCount')}</div>
                    <div className="font-mono tabular-nums text-lg font-bold text-slate-900">
                      {learningPath.remainingSteps.length}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">{t('learningPath.totalTime')}</div>
                    <div className="font-mono tabular-nums text-lg font-bold text-indigo-700">
                      {t('learningPath.minutes', { count: learningPath.estimatedTotalMinutes })}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">
                      {t('learningPath.alreadyMasteredCount')}
                    </div>
                    <div className="font-mono tabular-nums text-lg font-bold text-emerald-700">
                      {learningPath.completedPrerequisites.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Completed / Skipped Prerequisites */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-700">
                  {t('learningPath.completedPrereqs')}
                </h3>
                {learningPath.completedPrerequisites.length === 0 ? (
                  <p className="text-xs text-slate-500">{t('learningPath.noneCompleted')}</p>
                ) : (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-emerald-800">
                    {learningPath.completedPrerequisites.map((p) => (
                      <span key={p.conceptId} className="inline-flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                        {p.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Ordered Remaining Steps */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-700">
                  {t('learningPath.studyOrder')}
                </h3>

                {learningPath.remainingSteps.length === 0 ? (
                  <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 font-medium">
                    {t('learningPath.allDone')}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {learningPath.remainingSteps.map((step) => {
                      const isNext = step.conceptId === learningPath.currentPositionConceptId;
                      return (
                        <div
                          key={step.conceptId}
                          className={`p-4 rounded-lg border flex flex-wrap items-center justify-between gap-4 ${
                            isNext
                              ? 'bg-indigo-50/50 border-indigo-300'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex items-start gap-3.5">
                            <span className="w-7 h-7 rounded-md bg-slate-900 text-white font-mono tabular-nums text-xs font-semibold flex items-center justify-center shrink-0">
                              {step.stepNumber}
                            </span>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-slate-900">{step.title}</span>
                                {isNext && (
                                  <span className="text-xs font-semibold text-indigo-700">
                                    · {t('learningPath.nextStep')}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                                <span className="font-mono tabular-nums">
                                  {step.estimatedDuration} min
                                </span>
                                {step.prerequisites.length > 0 && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span>
                                      {t('learningPath.requires')}: {step.prerequisites.join(', ')}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedConceptId(step.conceptId);
                              setActiveTab('graph');
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                          >
                            {t('learningPath.openConcept')}
                            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </section>
      )}

      {/* Tab 3: All Topics Directory */}
      {activeTab === 'list' && (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {concepts.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setSelectedConceptId(c.id);
                setActiveTab('graph');
              }}
              className={`text-left p-4 rounded-xl border transition-colors cursor-pointer space-y-2 ${
                c.id === selectedConceptId
                  ? 'bg-indigo-50/50 border-indigo-600'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span
                  className={`inline-flex items-center gap-1 font-semibold ${
                    c.status === 'mastered'
                      ? 'text-emerald-700'
                      : c.status === 'unlocked'
                      ? 'text-indigo-700'
                      : 'text-amber-700'
                  }`}
                >
                  {c.status === 'mastered' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {c.status === 'unlocked' && <PlayCircle className="w-3.5 h-3.5" />}
                  {c.status === 'locked' && <Lock className="w-3.5 h-3.5" />}
                  {t(`status.${c.status}`)}
                </span>
                <span className="font-mono tabular-nums text-slate-500">
                  {c.estimated_duration}m
                </span>
              </div>
              <h3 className="font-display font-semibold text-slate-900">{c.title}</h3>
              <p className="text-xs text-slate-600 line-clamp-2">{c.description}</p>
            </button>
          ))}
        </section>
      )}

      {/* Concept Lesson & Quiz Workspace */}
      {selectedConcept ? (
        <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`inline-flex items-center gap-1 font-semibold ${
                    selectedConcept.status === 'mastered'
                      ? 'text-emerald-700'
                      : selectedConcept.status === 'unlocked'
                      ? 'text-indigo-700'
                      : 'text-amber-700'
                  }`}
                >
                  {selectedConcept.status === 'mastered' && <CheckCircle2 className="w-4 h-4" />}
                  {selectedConcept.status === 'unlocked' && <PlayCircle className="w-4 h-4" />}
                  {selectedConcept.status === 'locked' && <Lock className="w-4 h-4" />}
                  {t(`status.${selectedConcept.status}`)}
                </span>
                <span className="text-slate-400" aria-hidden="true">
                  ·
                </span>
                <span className="inline-flex items-center gap-1 text-slate-600 font-mono tabular-nums">
                  <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                  {t('courseLearn.estimatedTime', { minutes: selectedConcept.estimated_duration })}
                </span>
                {selectedConcept.bestScore > 0 && (
                  <>
                    <span className="text-slate-400" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-mono tabular-nums text-slate-700 font-medium">
                      {t('courseLearn.bestScore', { score: selectedConcept.bestScore })}
                    </span>
                  </>
                )}
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900">
                {selectedConcept.title}
              </h2>
              <p className="text-sm text-slate-600">{selectedConcept.description}</p>
            </div>
          </div>

          {selectedConcept.needsPrerequisiteReview && (
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <span>
                {t('courseLearn.needsReviewNote', {
                  missing: selectedConcept.missingPrerequisiteTitles.join(', '),
                })}
              </span>
            </div>
          )}

          {!selectedConcept.isUnlocked ? (
            <div className="p-6 rounded-xl bg-amber-50/70 border border-amber-200 space-y-4">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="space-y-1">
                  <h3 className="font-display font-semibold text-amber-950">
                    {t('status.locked')}
                  </h3>
                  <p className="text-sm text-amber-900">
                    {t('courseLearn.lockedExplain', {
                      concept: selectedConcept.title,
                      missing: selectedConcept.missingPrerequisiteTitles.join(', '),
                    })}
                  </p>
                </div>
              </div>

              {selectedConcept.missingPrerequisiteIds.length > 0 && (
                <div className="flex flex-wrap gap-2 pl-8">
                  {selectedConcept.missingPrerequisiteIds.map((mId, idx) => (
                    <button
                      key={mId}
                      type="button"
                      onClick={() => setSelectedConceptId(mId)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-white border border-amber-300 hover:bg-amber-100 rounded-lg cursor-pointer"
                    >
                      {selectedConcept.missingPrerequisiteTitles[idx]}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Lesson Content */}
              <div className="lg:col-span-6 space-y-5">
                <div className="space-y-2">
                  <h3 className="font-display text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-700" aria-hidden="true" />
                    {t('courseLearn.studyLesson')}
                  </h3>
                  <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                    {selectedConcept.lesson_content}
                  </div>
                </div>

                {selectedConcept.video_url && isSafeHttpUrl(selectedConcept.video_url) && (
                  <div className="p-4 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold text-slate-700">
                        {t('courseLearn.videoResource')}
                      </div>
                      <div className="text-xs text-slate-500 truncate max-w-xs">
                        {selectedConcept.video_url}
                      </div>
                    </div>
                    <a
                      href={selectedConcept.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg whitespace-nowrap shrink-0"
                    >
                      {t('courseLearn.openVideo')}
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                  </div>
                )}

                {user && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleCompleteLesson}
                      disabled={selectedConcept.lessonCompleted || completingLesson}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-60 ${
                        selectedConcept.lessonCompleted
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-default'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                      {completingLesson
                        ? t('common.loading')
                        : selectedConcept.lessonCompleted
                        ? t('courseLearn.lessonCompleted')
                        : t('courseLearn.markLessonComplete')}
                    </button>
                    <p className="text-xs text-slate-500">{t('courseLearn.lessonBeforeQuizHint')}</p>
                    {actionMsg && <p className="text-xs font-medium text-emerald-700">{actionMsg}</p>}
                    {actionError && <p className="text-xs font-medium text-rose-700">{actionError}</p>}
                  </div>
                )}
              </div>

              {/* Quiz Panel */}
              <div className="lg:col-span-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-lg font-semibold text-slate-900">
                    {t('courseLearn.quizTitle')}
                  </h3>
                  <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
                    {quizQuestions.length > 0 && user && (
                      <span className="text-slate-600">
                        {t('courseLearn.answeredProgress', {
                          answered: answeredCount,
                          total: quizQuestions.length,
                        })}
                      </span>
                    )}
                    <span className="font-semibold text-indigo-700">
                      {t('courseLearn.thresholdLabel', { threshold: quizThreshold })}
                    </span>
                  </div>
                </div>

                {!user ? (
                  <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-600">
                    {t('courseLearn.enrollPrompt')}
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {quizQuestions.map((q, qIdx) => {
                        const feedbackItem = quizResult?.feedback.find((f) => f.questionId === q.id);
                        return (
                          <div
                            key={q.id}
                            className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                          >
                            <p className="text-sm font-semibold text-slate-900">
                              {qIdx + 1}. {q.question}
                            </p>
                            <div className="space-y-2">
                              {q.options.map((opt, optIdx) => (
                                <label
                                  key={optIdx}
                                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                                    selectedAnswers[qIdx] === optIdx
                                      ? 'bg-indigo-50 border-indigo-400 text-slate-900'
                                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`q-${q.id}`}
                                    checked={selectedAnswers[qIdx] === optIdx}
                                    onChange={() =>
                                      setSelectedAnswers((prev) => ({ ...prev, [qIdx]: optIdx }))
                                    }
                                    className="mt-1 accent-indigo-700"
                                  />
                                  <span>{opt}</span>
                                </label>
                              ))}
                            </div>

                            {feedbackItem && (
                              <div
                                className={`p-3 rounded-lg text-xs ${
                                  feedbackItem.isCorrect
                                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-900 border border-rose-200'
                                }`}
                              >
                                <p className="font-semibold">
                                  {feedbackItem.isCorrect ? '✓ Correct' : '✕ Incorrect'}
                                </p>
                                {feedbackItem.explanation && (
                                  <p className="mt-1">{feedbackItem.explanation}</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {quizResult && (
                      <div
                        className={`p-4 rounded-xl border space-y-2 ${
                          quizResult.passed
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                            : 'bg-amber-50 border-amber-300 text-amber-950'
                        }`}
                      >
                        <div className="font-display font-bold text-base font-mono tabular-nums">
                          {t('courseLearn.scoreResult', {
                            score: quizResult.score,
                            correct: quizResult.correctCount,
                            total: quizResult.totalQuestions,
                          })}
                        </div>
                        <p className="text-sm">
                          {quizResult.passed
                            ? t('courseLearn.passedMsg')
                            : t('courseLearn.failedMsg', { threshold: quizResult.masteryThreshold })}
                        </p>

                        {quizResult.newlyUnlocked.length > 0 && (
                          <div className="pt-2">
                            <div className="text-xs font-semibold mb-1.5">
                              {t('courseLearn.newlyUnlocked')}:
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {quizResult.newlyUnlocked.map((u) => (
                                <button
                                  key={u.id}
                                  type="button"
                                  onClick={() => setSelectedConceptId(u.id)}
                                  className="px-3 py-1.5 text-xs font-semibold bg-white border border-emerald-300 rounded-lg hover:bg-emerald-100 cursor-pointer"
                                >
                                  {u.title} →
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={submittingQuiz || quizQuestions.length === 0}
                        onClick={handleSubmitQuiz}
                        className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {submittingQuiz
                          ? t('common.loading')
                          : quizResult
                          ? t('courseLearn.retryQuiz')
                          : t('courseLearn.submitQuiz')}
                      </button>

                      {quizResult && !quizResult.passed && (
                        <button
                          type="button"
                          onClick={() => {
                            setQuizResult(null);
                            setSelectedAnswers({});
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                          {t('courseLearn.retryQuiz')}
                        </button>
                      )}
                    </div>

                    {/* Attempt History */}
                    <div className="pt-4 border-t border-slate-100 space-y-2">
                      <h4 className="text-xs font-semibold text-slate-700">
                        {t('courseLearn.attemptHistory')}
                      </h4>
                      {quizAttempts.length === 0 ? (
                        <p className="text-xs text-slate-500">{t('courseLearn.noAttempts')}</p>
                      ) : (
                        <div className="space-y-1.5">
                          {quizAttempts.slice(0, 5).map((att) => (
                            <div
                              key={att.id}
                              className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 font-mono tabular-nums"
                            >
                              <span
                                className={
                                  att.passed
                                    ? 'font-semibold text-emerald-700'
                                    : 'font-semibold text-amber-700'
                                }
                              >
                                {att.score}% · {att.passed ? t('status.mastered') : t('status.inProgress')}
                              </span>
                              <span className="text-slate-500">
                                {new Date(att.attempted_at).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </section>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
          {t('courseLearn.selectConceptHint')}
        </div>
      )}

      {/* Preserved Historical Progress from Retired / Split Concepts */}
      {retiredHistory.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-700" aria-hidden="true" />
            <h3 className="font-display font-semibold text-slate-900">
              {t('courseLearn.preservedHistoryTitle')}
            </h3>
          </div>
          <p className="text-xs text-slate-600">{t('courseLearn.preservedHistoryDesc')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {retiredHistory.map((r) => (
              <div
                key={r.id}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-1"
              >
                <div className="font-semibold text-slate-900">{r.title}</div>
                <div className="text-slate-600 font-mono tabular-nums">
                  {t('status.retired')} · {t('courseLearn.bestScore', { score: r.best_score })} ·{' '}
                  {r.mastery_status === 'mastered' ? t('status.mastered') : t('status.inProgress')}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
