import {
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  checkQuizAnswer,
  submitGameCompletion,
  type ClientCyberScenario,
  type DifficultyLevel,
  type GamificationProfile,
} from '../services/gamificationClient';

interface CyberDetectiveGameProps {
  scenarios: ClientCyberScenario[];
  isAuthenticated: boolean;
  onProfileUpdated: (profile: GamificationProfile) => void;
}

const SCENARIO_CATS = [
  'ALL',
  'Phishing Awareness',
  'Suspicious Messages',
  'Password Security',
  'Security Mistakes',
  'Network Security',
] as const;

export function CyberDetectiveGame({
  scenarios,
  isAuthenticated,
  onProfileUpdated,
}: CyberDetectiveGameProps) {
  const [category, setCategory] = useState<(typeof SCENARIO_CATS)[number]>('ALL');
  const [difficulty, setDifficulty] = useState<DifficultyLevel | 'all'>('all');
  const [phase, setPhase] = useState<'setup' | 'playing' | 'summary'>('setup');
  const [sessionItems, setSessionItems] = useState<ClientCyberScenario[]>([]);
  const [idx, setIdx] = useState(0);
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
  const [resultSummary, setResultSummary] = useState<{
    score: number;
    xpEarned: number;
    error?: string;
  } | null>(null);

  const filtered = useMemo(() => {
    return scenarios.filter((s) => {
      const catOk = category === 'ALL' || s.category === category;
      const diffOk = difficulty === 'all' || s.difficulty === difficulty;
      return catOk && diffOk;
    });
  }, [scenarios, category, difficulty]);

  const startCase = () => {
    setSessionItems(filtered.slice(0, 5));
    setIdx(0);
    setFeedback(null);
    setAnswers([]);
    setResultSummary(null);
    setStartedAt(Date.now());
    setPhase('playing');
  };

  const handleInvestigate = async (optionIdx: number) => {
    const item = sessionItems[idx];
    if (!item || feedback || checking) return;
    setChecking(true);
    try {
      const res = await checkQuizAnswer('cyber_detective', item.id, optionIdx);
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
      setResultSummary({ score: correctCount * 100, xpEarned: 0 });
      return;
    }

    try {
      const durationSeconds = Math.max(5, Math.round((Date.now() - startedAt) / 1000));
      const res = await submitGameCompletion({
        gameId: 'cyber_detective',
        category: category === 'ALL' ? 'Defense Suite' : category,
        difficulty: difficulty === 'all' ? 'medium' : difficulty,
        durationSeconds,
        answers: answers.map((a) => ({
          questionId: a.questionId,
          selectedIndex: a.selectedIndex,
        })),
      });
      setResultSummary({ score: res.result.score, xpEarned: res.result.xpEarned });
      onProfileUpdated(res.profile);
    } catch (err) {
      setResultSummary({
        score: correctCount * 100,
        xpEarned: 0,
        error: err instanceof Error ? err.message : 'Unable to save case report.',
      });
    }
  };

  if (phase === 'setup') {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">Cyber Detective</h2>
          <p className="text-sm text-slate-600 mt-1">
            Inspect phishing emails, suspicious SMS lures, password hygiene, and network defense scenarios. Every scenario includes defensive guidance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Scenario Topic
            </span>
            <div className="flex flex-wrap gap-2">
              {SCENARIO_CATS.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                    category === cat
                      ? 'bg-indigo-700 text-white border-indigo-700'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {cat === 'ALL' ? 'All Defense Scenarios' : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Clearance Level
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
                  {lvl === 'all' ? 'All Levels' : lvl}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <span className="text-xs text-slate-500">
            {filtered.length} defensive security case files available
          </span>
          <button
            type="button"
            disabled={filtered.length === 0}
            onClick={startCase}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            Open Investigation
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
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900">
                Security Audit Complete
              </h2>
              <p className="text-sm text-slate-600">
                Correctly defended {correctCount} of {answers.length} scenarios
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-2xl font-bold text-indigo-700">
              {resultSummary?.score ?? 0} pts
            </span>
            {resultSummary?.xpEarned ? (
              <span className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                +{resultSummary.xpEarned} XP
              </span>
            ) : null}
          </div>
        </div>

        {resultSummary?.error && (
          <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
            {resultSummary.error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={startCase}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Run New Audit
          </button>
          <button
            type="button"
            onClick={() => setPhase('setup')}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
          >
            Switch Topic
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
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded bg-rose-50 text-rose-800 font-semibold inline-flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            {item.category}
          </span>
          <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 capitalize font-semibold">
            {item.difficulty}
          </span>
        </div>
        <span className="text-xs font-mono text-slate-500">
          Case {idx + 1} / {sessionItems.length}
        </span>
      </div>

      <h3 className="font-display text-lg font-bold text-slate-900">{item.title}</h3>

      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-1.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-700" />
          <span>{item.artifactLabel}</span>
        </div>
        <pre className="text-xs sm:text-sm font-mono text-slate-800 whitespace-pre-wrap bg-white/80 p-3 rounded-lg border border-amber-200/70">
          {item.artifactContent}
        </pre>
      </div>

      <p className="text-sm font-semibold text-slate-900">{item.prompt}</p>

      <div className="space-y-2.5">
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
              onClick={() => handleInvestigate(optionIdx)}
              className={`w-full text-left p-3.5 rounded-xl border text-sm transition-colors cursor-pointer disabled:cursor-default ${cls}`}
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
            <span>Defensive Analysis</span>
          </div>
          <p className="text-sm leading-relaxed">{feedback.explanation}</p>
          <button
            type="button"
            onClick={handleNext}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
          >
            {idx + 1 < sessionItems.length ? 'Next Case' : 'Finish Investigation'}
          </button>
        </div>
      )}
    </div>
  );
}
