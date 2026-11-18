import { CheckCircle2, Code2, RotateCcw, Terminal, Trophy, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  checkQuizAnswer,
  submitGameCompletion,
  type ClientCodeQuestChallenge,
  type DifficultyLevel,
  type GamificationProfile,
} from '../services/gamificationClient';

interface CodeQuestGameProps {
  challenges: ClientCodeQuestChallenge[];
  isAuthenticated: boolean;
  onProfileUpdated: (profile: GamificationProfile) => void;
}

const LANGUAGES = ['ALL', 'C', 'C++', 'Python', 'Java', 'JavaScript'] as const;
const CHALLENGE_TYPES = [
  'ALL',
  'Predict Output',
  'Find Error',
  'Complete Missing Code',
  'Logic Puzzle',
] as const;

export function CodeQuestGame({
  challenges,
  isAuthenticated,
  onProfileUpdated,
}: CodeQuestGameProps) {
  const [language, setLanguage] = useState<(typeof LANGUAGES)[number]>('ALL');
  const [challengeType, setChallengeType] = useState<(typeof CHALLENGE_TYPES)[number]>('ALL');
  const [difficulty, setDifficulty] = useState<DifficultyLevel | 'all'>('all');

  const [sessionItems, setSessionItems] = useState<ClientCodeQuestChallenge[]>([]);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<'setup' | 'playing' | 'summary'>('setup');
  const [checking, setChecking] = useState(false);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [feedback, setFeedback] = useState<{
    questionId: string;
    selectedIndex: number;
    correctIndex: number;
    correct: boolean;
    explanation: string;
  } | null>(null);
  const [answers, setAnswers] = useState<
    Array<{ questionId: string; selectedIndex: number; correct: boolean }>
  >([]);
  const [summaryResult, setSummaryResult] = useState<{
    score: number;
    maxScore: number;
    xpEarned: number;
    error?: string;
  } | null>(null);

  const matchingPool = useMemo(() => {
    return challenges.filter((c) => {
      const langOk = language === 'ALL' || c.language === language;
      const typeOk = challengeType === 'ALL' || c.challengeType === challengeType;
      const diffOk = difficulty === 'all' || c.difficulty === difficulty;
      return langOk && typeOk && diffOk;
    });
  }, [challenges, language, challengeType, difficulty]);

  const startQuest = () => {
    const sorted = [...matchingPool].sort((a, b) => {
      const order = { easy: 0, medium: 1, hard: 2 };
      return order[a.difficulty] - order[b.difficulty];
    });
    setSessionItems(sorted.slice(0, 5));
    setIdx(0);
    setFeedback(null);
    setAnswers([]);
    setSummaryResult(null);
    setStartedAt(Date.now());
    setPhase('playing');
  };

  const handleChoose = async (optionIdx: number) => {
    const item = sessionItems[idx];
    if (!item || feedback || checking) return;
    setChecking(true);
    try {
      const res = await checkQuizAnswer('code_quest', item.id, optionIdx);
      setFeedback({
        questionId: item.id,
        selectedIndex: optionIdx,
        correctIndex: res.correctIndex,
        correct: res.correct,
        explanation: res.explanation,
      });
      setAnswers((prev) => [
        ...prev,
        { questionId: item.id, selectedIndex: optionIdx, correct: res.correct },
      ]);
    } finally {
      setChecking(false);
    }
  };

  const handleNext = async () => {
    if (idx + 1 < sessionItems.length) {
      setIdx((i) => i + 1);
      setFeedback(null);
      return;
    }

    setPhase('summary');
    const correctCount = answers.filter((a) => a.correct).length;
    if (!isAuthenticated) {
      setSummaryResult({
        score: correctCount * 100,
        maxScore: answers.length * 100,
        xpEarned: 0,
      });
      return;
    }

    try {
      const durationSeconds = Math.max(5, Math.round((Date.now() - startedAt) / 1000));
      const res = await submitGameCompletion({
        gameId: 'code_quest',
        category: language === 'ALL' ? 'Multi-Language' : language,
        difficulty: difficulty === 'all' ? 'medium' : difficulty,
        durationSeconds,
        answers: answers.map((a) => ({
          questionId: a.questionId,
          selectedIndex: a.selectedIndex,
        })),
      });
      setSummaryResult({
        score: res.result.score,
        maxScore: res.result.maxScore,
        xpEarned: res.result.xpEarned,
      });
      onProfileUpdated(res.profile);
    } catch (err) {
      setSummaryResult({
        score: correctCount * 100,
        maxScore: answers.length * 100,
        xpEarned: 0,
        error: err instanceof Error ? err.message : 'Unable to save Code Quest score.',
      });
    }
  };

  if (phase === 'setup') {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">Code Quest</h2>
          <p className="text-sm text-slate-600 mt-1">
            Safe, static code-reading and debugging challenges across C, C++, Python, Java, and JavaScript. Progress from Easy to Hard.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Programming Language
            </span>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                    language === lang
                      ? 'bg-indigo-700 text-white border-indigo-700'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {lang === 'ALL' ? 'All Languages' : lang}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Challenge Mode
              </span>
              <div className="flex flex-wrap gap-2">
                {CHALLENGE_TYPES.map((ct) => (
                  <button
                    key={ct}
                    type="button"
                    onClick={() => setChallengeType(ct)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                      challengeType === ct
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {ct === 'ALL' ? 'All Challenge Types' : ct}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Difficulty Progression
              </span>
              <div className="flex flex-wrap gap-2">
                {(['all', 'easy', 'medium', 'hard'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setDifficulty(lvl)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border capitalize cursor-pointer ${
                      difficulty === lvl
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {lvl === 'all' ? 'Progressive (Easy -> Hard)' : lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <span className="text-xs text-slate-500">
            {matchingPool.length} verified code-analysis challenges matched
          </span>
          <button
            type="button"
            disabled={matchingPool.length === 0}
            onClick={startQuest}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer disabled:opacity-50"
          >
            <Code2 className="w-4 h-4" />
            Launch Code Quest
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'summary') {
    const correctCount = answers.filter((a) => a.correct).length;
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900">Code Quest Complete</h2>
              <p className="text-sm text-slate-600">
                Solved {correctCount} of {answers.length} code challenges
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-slate-500 font-semibold uppercase">Score</p>
              <p className="font-mono text-2xl font-bold text-indigo-700">
                {summaryResult?.score ?? 0}
              </p>
            </div>
            {summaryResult?.xpEarned ? (
              <span className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                +{summaryResult.xpEarned} XP
              </span>
            ) : null}
          </div>
        </div>

        {summaryResult?.error && (
          <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
            {summaryResult.error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={startQuest}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retry Quest
          </button>
          <button
            type="button"
            onClick={() => setPhase('setup')}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
          >
            Choose Another Language
          </button>
        </div>
      </div>
    );
  }

  const item = sessionItems[idx];
  if (!item) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded bg-slate-900 text-white font-mono font-semibold">
            {item.language}
          </span>
          <span className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 font-semibold">
            {item.challengeType}
          </span>
          <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 capitalize font-semibold">
            {item.difficulty}
          </span>
        </div>
        <span className="text-xs font-mono text-slate-500">
          Challenge {idx + 1} / {sessionItems.length}
        </span>
      </div>

      <div className="space-y-3">
        <h3 className="font-display text-lg font-bold text-slate-900">{item.title}</h3>
        <div className="rounded-xl bg-slate-950 text-slate-100 p-4 overflow-x-auto border border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2 font-mono">
            <Terminal className="w-3.5 h-3.5" />
            <span>Static Inspection Sandbox ({item.language})</span>
          </div>
          <pre className="text-xs sm:text-sm font-mono leading-relaxed whitespace-pre-wrap">
            <code>{item.code}</code>
          </pre>
        </div>
        <p className="text-sm font-semibold text-slate-800 pt-1">{item.prompt}</p>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {item.options.map((opt, optionIdx) => {
          const revealed = feedback !== null;
          const isSelected = feedback?.selectedIndex === optionIdx;
          const isRight = feedback?.correctIndex === optionIdx;
          let cls = 'bg-white border-slate-200 hover:border-indigo-400 text-slate-800';
          if (revealed) {
            if (isRight) cls = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold';
            else if (isSelected) cls = 'bg-rose-50 border-rose-400 text-rose-950';
            else cls = 'bg-slate-50 border-slate-200 text-slate-500';
          }
          return (
            <button
              key={optionIdx}
              type="button"
              disabled={revealed || checking}
              onClick={() => handleChoose(optionIdx)}
              className={`text-left px-4 py-3 rounded-xl border text-sm font-mono transition-colors cursor-pointer disabled:cursor-default ${cls}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border space-y-2 ${
            feedback.correct
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-amber-50 border-amber-200 text-amber-950'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold text-sm">
            {feedback.correct ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-700" />
            )}
            <span>{feedback.correct ? 'Great catch!' : 'Explanation'}</span>
          </div>
          <p className="text-sm leading-relaxed">{feedback.explanation}</p>
          <button
            type="button"
            onClick={handleNext}
            className="mt-1 px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
          >
            {idx + 1 < sessionItems.length ? 'Next Challenge' : 'Complete Quest'}
          </button>
        </div>
      )}
    </div>
  );
}
