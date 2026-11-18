import {
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  RotateCcw,
  Sparkles,
  Trophy,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  checkQuizAnswer,
  submitGameCompletion,
  type ClientQuizQuestion,
  type DifficultyLevel,
  type GamificationProfile,
} from '../services/gamificationClient';

interface BrainBattleGameProps {
  questions: ClientQuizQuestion[];
  dailyQuestions: ClientQuizQuestion[];
  categories: string[];
  dailyDate: string;
  dailyCompletedToday: boolean;
  isAuthenticated: boolean;
  initialDaily?: boolean;
  onProfileUpdated: (profile: GamificationProfile) => void;
  onRefreshLeaderboard: () => void;
}

interface AnswerRecord {
  questionId: string;
  selectedIndex: number;
  correctIndex: number;
  correct: boolean;
  explanation: string;
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function BrainBattleGame({
  questions,
  dailyQuestions,
  categories,
  dailyDate,
  dailyCompletedToday,
  isAuthenticated,
  initialDaily = false,
  onProfileUpdated,
  onRefreshLeaderboard,
}: BrainBattleGameProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [difficulty, setDifficulty] = useState<DifficultyLevel | 'all'>('all');
  const [isDailyMode, setIsDailyMode] = useState(initialDaily);

  const [sessionQuestions, setSessionQuestions] = useState<ClientQuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(25);
  const [phase, setPhase] = useState<'setup' | 'playing' | 'summary'>('setup');
  const [checking, setChecking] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<AnswerRecord | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [startedAt, setStartedAt] = useState<number>(Date.now());
  const [submitState, setSubmitState] = useState<{
    saving: boolean;
    error: string;
    verifiedScore?: number;
    maxScore?: number;
    xpEarned?: number;
    newBadges?: string[];
  }>({ saving: false, error: '' });

  const filteredCount = useMemo(() => {
    if (isDailyMode) return dailyQuestions.length;
    return questions.filter((q) => {
      const catOk = selectedCategory === 'ALL' || q.category === selectedCategory;
      const diffOk = difficulty === 'all' || q.difficulty === difficulty;
      return catOk && diffOk;
    }).length;
  }, [questions, dailyQuestions, selectedCategory, difficulty, isDailyMode]);

  const startMatch = (dailyOverride?: boolean) => {
    const useDaily = dailyOverride !== undefined ? dailyOverride : isDailyMode;
    setIsDailyMode(useDaily);

    const pool = useDaily
      ? [...dailyQuestions]
      : shuffleArray(
          questions.filter((q) => {
            const catOk = selectedCategory === 'ALL' || q.category === selectedCategory;
            const diffOk = difficulty === 'all' || q.difficulty === difficulty;
            return catOk && diffOk;
          })
        ).slice(0, 6);

    setSessionQuestions(pool);
    setCurrentIdx(0);
    setAnswers([]);
    setCurrentFeedback(null);
    setTimeLeft(useDaily ? 25 : difficulty === 'hard' ? 20 : 25);
    setStartedAt(Date.now());
    setSubmitState({ saving: false, error: '' });
    setPhase('playing');
  };

  useEffect(() => {
    if (initialDaily) {
      startMatch(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDaily]);

  // Countdown timer per active unanswered question
  useEffect(() => {
    if (phase !== 'playing' || currentFeedback !== null || checking) return;
    if (timeLeft <= 0) {
      const q = sessionQuestions[currentIdx];
      if (!q) return;
      void handleSelectOption(-1);
      return;
    }
    const timer = window.setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLeft, currentFeedback, checking, currentIdx]);

  const handleSelectOption = async (optionIdx: number) => {
    const q = sessionQuestions[currentIdx];
    if (!q || currentFeedback || checking) return;
    setChecking(true);
    try {
      const res = await checkQuizAnswer('brain_battle', q.id, optionIdx);
      const record: AnswerRecord = {
        questionId: q.id,
        selectedIndex: optionIdx,
        correctIndex: res.correctIndex,
        correct: res.correct,
        explanation: res.explanation,
      };
      setCurrentFeedback(record);
      setAnswers((prev) => [...prev, record]);
    } catch {
      setCurrentFeedback({
        questionId: q.id,
        selectedIndex: optionIdx,
        correctIndex: 0,
        correct: false,
        explanation: 'Could not verify this answer with the server.',
      });
    } finally {
      setChecking(false);
    }
  };

  const finishMatch = async (allAnswers: AnswerRecord[]) => {
    setPhase('summary');
    const durationSeconds = Math.max(5, Math.round((Date.now() - startedAt) / 1000));
    const localCorrect = allAnswers.filter((a) => a.correct).length;
    const localEstimated = localCorrect * 100 + (isDailyMode ? 50 : 0);

    if (!isAuthenticated) {
      setSubmitState({
        saving: false,
        error: '',
        verifiedScore: localEstimated,
        maxScore: allAnswers.length * 100 + (isDailyMode ? 50 : 0),
        xpEarned: 0,
        newBadges: [],
      });
      return;
    }

    setSubmitState({ saving: true, error: '' });
    try {
      const resolvedDiff: DifficultyLevel =
        difficulty === 'all' ? 'medium' : difficulty;
      const res = await submitGameCompletion({
        gameId: 'brain_battle',
        category: isDailyMode ? 'Daily Challenge' : selectedCategory,
        difficulty: resolvedDiff,
        durationSeconds,
        isDailyChallenge: isDailyMode,
        answers: allAnswers.map((a) => ({
          questionId: a.questionId,
          selectedIndex: a.selectedIndex,
        })),
      });
      setSubmitState({
        saving: false,
        error: '',
        verifiedScore: res.result.score,
        maxScore: res.result.maxScore,
        xpEarned: res.result.xpEarned,
        newBadges: res.result.newBadges,
      });
      onProfileUpdated(res.profile);
      onRefreshLeaderboard();
    } catch (err) {
      setSubmitState({
        saving: false,
        error: err instanceof Error ? err.message : 'Unable to save Brain Battle score.',
        verifiedScore: localEstimated,
        maxScore: allAnswers.length * 100,
      });
    }
  };

  const handleNextQuestion = () => {
    if (currentIdx + 1 < sessionQuestions.length) {
      setCurrentIdx((i) => i + 1);
      setCurrentFeedback(null);
      setTimeLeft(difficulty === 'hard' ? 20 : 25);
    } else {
      void finishMatch(answers);
    }
  };

  if (phase === 'setup') {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900">Brain Battle</h2>
            <p className="text-sm text-slate-600 mt-1">
              Timed randomized knowledge battles across 8 STEM & computing categories with instant explanations.
            </p>
          </div>
          <button
            type="button"
            disabled={dailyCompletedToday && isAuthenticated}
            onClick={() => startMatch(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <Calendar className="w-4 h-4" />
            {dailyCompletedToday && isAuthenticated
              ? `Daily Challenge Completed (${dailyDate})`
              : `Play Daily Challenge (${dailyDate})`}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsDailyMode(false);
                  setSelectedCategory('ALL');
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                  !isDailyMode && selectedCategory === 'ALL'
                    ? 'bg-indigo-700 text-white border-indigo-700'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                All 8 Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setIsDailyMode(false);
                    setSelectedCategory(cat);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                    !isDailyMode && selectedCategory === cat
                      ? 'bg-indigo-700 text-white border-indigo-700'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Difficulty Level
            </label>
            <div className="flex flex-wrap gap-2">
              {(['all', 'easy', 'medium', 'hard'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => {
                    setIsDailyMode(false);
                    setDifficulty(lvl);
                  }}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border capitalize cursor-pointer ${
                    !isDailyMode && difficulty === lvl
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {lvl === 'all' ? 'Mixed Levels' : lvl}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 pt-2">
              {filteredCount} verified questions ready · Speed bonus for answers under 12s.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <span className="text-xs text-slate-500">
            Randomized question order · Instant explanation after every answer
          </span>
          <button
            type="button"
            disabled={filteredCount === 0}
            onClick={() => startMatch(false)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <Flame className="w-4 h-4" />
            Start Brain Battle
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'summary') {
    const correctCount = answers.filter((a) => a.correct).length;
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900">
                Brain Battle Complete
              </h2>
              <p className="text-sm text-slate-600">
                {correctCount} of {answers.length} correct ·{' '}
                {isDailyMode ? 'Daily Challenge' : selectedCategory}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase font-semibold">Verified Score</p>
              <p className="font-display text-2xl font-bold font-mono tabular-nums text-indigo-700">
                {submitState.verifiedScore ?? 0}{' '}
                <span className="text-xs font-normal text-slate-500">
                  / {submitState.maxScore ?? answers.length * 100}
                </span>
              </p>
            </div>
            {submitState.xpEarned ? (
              <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                +{submitState.xpEarned} XP Earned
              </div>
            ) : null}
          </div>
        </div>

        {submitState.error && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
            {submitState.error}
          </div>
        )}

        {!isAuthenticated && (
          <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-900">
            Guest match finished! Sign in to save XP, unlock achievement badges, and claim your Brain Battle Leaderboard rank.
          </div>
        )}

        {submitState.newBadges && submitState.newBadges.length > 0 && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center gap-3">
            <Award className="w-5 h-5 text-emerald-700" />
            <span className="text-xs font-semibold text-emerald-900">
              Unlocked Badges: {submitState.newBadges.join(', ')}
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => startMatch(false)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Play Again
          </button>
          <button
            type="button"
            onClick={() => setPhase('setup')}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
          >
            Change Category / Difficulty
          </button>
        </div>
      </div>
    );
  }

  const question = sessionQuestions[currentIdx];
  if (!question) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold px-2.5 py-1 rounded bg-indigo-50 text-indigo-700">
            {question.category}
          </span>
          <span className="font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700 capitalize">
            {question.difficulty}
          </span>
          {isDailyMode && (
            <span className="font-semibold px-2.5 py-1 rounded bg-amber-100 text-amber-800 inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Daily Challenge
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
          <span className="text-slate-600">
            Question {currentIdx + 1} / {sessionQuestions.length}
          </span>
          <span
            className={`inline-flex items-center gap-1 font-semibold px-2.5 py-1 rounded ${
              timeLeft <= 5
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-slate-100 text-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            {timeLeft}s
          </span>
        </div>
      </div>

      <h3 className="font-display text-lg sm:text-xl font-bold text-slate-900 leading-snug">
        {question.prompt}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {question.options.map((opt, idx) => {
          const revealed = currentFeedback !== null;
          const isSelected = currentFeedback?.selectedIndex === idx;
          const isRight = currentFeedback?.correctIndex === idx;

          let cardStyle =
            'bg-white border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-slate-800';
          if (revealed) {
            if (isRight) {
              cardStyle = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold';
            } else if (isSelected && !isRight) {
              cardStyle = 'bg-rose-50 border-rose-400 text-rose-950';
            } else {
              cardStyle = 'bg-slate-50 border-slate-200 text-slate-500';
            }
          }

          return (
            <button
              key={idx}
              type="button"
              disabled={revealed || checking}
              onClick={() => handleSelectOption(idx)}
              className={`text-left p-4 rounded-xl border text-sm transition-colors cursor-pointer disabled:cursor-default flex items-start gap-3 ${cardStyle}`}
            >
              <span className="font-mono text-xs font-bold mt-0.5 shrink-0">
                {String.fromCharCode(65 + idx)}.
              </span>
              <span className="flex-1">{opt}</span>
            </button>
          );
        })}
      </div>

      {currentFeedback && (
        <div
          className={`p-4 rounded-xl border space-y-3 ${
            currentFeedback.correct
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-amber-50 border-amber-200 text-amber-950'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold text-sm">
            {currentFeedback.correct ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Correct Answer!</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-rose-700" />
                <span>
                  {currentFeedback.selectedIndex === -1
                    ? 'Time expired!'
                    : 'Not quite — review the explanation:'}
                </span>
              </>
            )}
          </div>
          <p className="text-sm leading-relaxed">{currentFeedback.explanation}</p>
          <div className="pt-1">
            <button
              type="button"
              onClick={handleNextQuestion}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
            >
              {currentIdx + 1 < sessionQuestions.length ? 'Next Question' : 'View Final Score'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
