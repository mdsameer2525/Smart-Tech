import {
  CheckCircle2,
  Delete,
  HelpCircle,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  checkWordGuess,
  requestWordHint,
  submitGameCompletion,
  type ClientWordPuzzle,
  type DifficultyLevel,
  type GamificationProfile,
} from '../services/gamificationClient';

interface TechWordPuzzleGameProps {
  puzzles: ClientWordPuzzle[];
  isAuthenticated: boolean;
  onProfileUpdated: (profile: GamificationProfile) => void;
}

export function TechWordPuzzleGame({
  puzzles,
  isAuthenticated,
  onProfileUpdated,
}: TechWordPuzzleGameProps) {
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('easy');
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [slots, setSlots] = useState<string[]>([]);
  const [revealedHints, setRevealedHints] = useState<Record<number, string>>({});
  const [showTextHint, setShowTextHint] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    exactMatches: boolean[];
    presentLetters: boolean[];
    message: string;
    answer?: string;
  } | null>(null);
  const [solvedEntries, setSolvedEntries] = useState<
    Array<{ puzzleId: string; guess: string; hintsUsed: number }>
  >([]);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [savingResult, setSavingResult] = useState<{
    score: number;
    xpEarned: number;
    error?: string;
  } | null>(null);

  const filteredPuzzles = useMemo(
    () => puzzles.filter((p) => p.difficulty === difficulty),
    [puzzles, difficulty]
  );

  const currentPuzzle = filteredPuzzles[puzzleIdx];

  const resetPuzzleState = (target?: ClientWordPuzzle) => {
    const p = target ?? currentPuzzle;
    setSlots(p ? Array(p.length).fill('') : []);
    setRevealedHints({});
    setShowTextHint(false);
    setHintsUsed(0);
    setAttempts(0);
    setFeedback(null);
  };

  useEffect(() => {
    setPuzzleIdx(0);
    setSolvedEntries([]);
    setSavingResult(null);
    setStartedAt(Date.now());
    const first = puzzles.filter((p) => p.difficulty === difficulty)[0];
    resetPuzzleState(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, puzzles.length]);

  useEffect(() => {
    resetPuzzleState(currentPuzzle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzleIdx]);

  const handleLetterInput = (letter: string) => {
    if (!currentPuzzle || feedback?.correct) return;
    const clean = letter.toUpperCase().replace(/[^A-Z]/g, '');
    if (!clean) return;
    setSlots((prev) => {
      const next = [...prev];
      const emptyIdx = next.findIndex((c, i) => !c && !revealedHints[i]);
      if (emptyIdx >= 0) next[emptyIdx] = clean[0];
      return next;
    });
  };

  const handleBackspace = () => {
    if (!currentPuzzle || feedback?.correct) return;
    setSlots((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i] && !revealedHints[i]) {
          next[i] = '';
          break;
        }
      }
      return next;
    });
  };

  const handleRevealLetter = async () => {
    if (!currentPuzzle || feedback?.correct) return;
    try {
      const revealedIndices = Object.keys(revealedHints).map(Number);
      const res = await requestWordHint(currentPuzzle.id, revealedIndices);
      if (res.index >= 0 && res.letter) {
        setRevealedHints((prev) => ({ ...prev, [res.index]: res.letter! }));
        setSlots((prev) => {
          const next = [...prev];
          next[res.index] = res.letter!;
          return next;
        });
        setHintsUsed((h) => h + 1);
      }
      setShowTextHint(true);
    } catch {
      setShowTextHint(true);
    }
  };

  const handleSubmitGuess = async () => {
    if (!currentPuzzle || feedback?.correct) return;
    const guess = slots.join('');
    if (guess.length < currentPuzzle.length) {
      setFeedback({
        correct: false,
        exactMatches: [],
        presentLetters: [],
        message: `Fill all ${currentPuzzle.length} letters before checking.`,
      });
      return;
    }

    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    const shouldReveal = nextAttempts >= 4;

    const res = await checkWordGuess(currentPuzzle.id, guess, shouldReveal);
    if (res.correct) {
      const entry = { puzzleId: currentPuzzle.id, guess, hintsUsed };
      const nextSolved = [...solvedEntries.filter((e) => e.puzzleId !== currentPuzzle.id), entry];
      setSolvedEntries(nextSolved);
      setFeedback({
        correct: true,
        exactMatches: res.exactMatches,
        presentLetters: res.presentLetters,
        message: `Solved "${res.answer}"!`,
        answer: res.answer,
      });

      if (isAuthenticated) {
        try {
          const durationSeconds = Math.max(5, Math.round((Date.now() - startedAt) / 1000));
          const saved = await submitGameCompletion({
            gameId: 'tech_word_puzzle',
            difficulty,
            durationSeconds,
            solvedEntries: nextSolved,
          });
          setSavingResult({
            score: saved.result.score,
            xpEarned: saved.result.xpEarned,
          });
          onProfileUpdated(saved.profile);
        } catch (err) {
          setSavingResult({
            score: nextSolved.length * 100,
            xpEarned: 0,
            error: err instanceof Error ? err.message : undefined,
          });
        }
      } else {
        setSavingResult({ score: nextSolved.length * 100, xpEarned: 0 });
      }
    } else {
      setFeedback({
        correct: false,
        exactMatches: res.exactMatches,
        presentLetters: res.presentLetters,
        answer: res.answer,
        message: res.answer
          ? `Out of guesses — the term was ${res.answer}. Try the next word!`
          : `Not quite (Attempt ${nextAttempts}/4). Green = exact position, Amber = in word.`,
      });
    }
  };

  if (!currentPuzzle) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-600">
        No word puzzles loaded.
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">Tech Word Puzzle</h2>
          <p className="text-sm text-slate-600 mt-1">
            Decode computer science and STEM vocabulary from clues and letter pools.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(['easy', 'medium', 'hard'] as const).map((lvl) => (
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
              {lvl}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-indigo-700">{currentPuzzle.category}</span>
          <span className="font-mono text-slate-500">
            Puzzle {puzzleIdx + 1} / {filteredPuzzles.length} · Solved Streak: {solvedEntries.length}
          </span>
        </div>
        <p className="text-base font-semibold text-slate-900">{currentPuzzle.clue}</p>
        {showTextHint && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 shrink-0" />
            <span>Hint: {currentPuzzle.hint}</span>
          </p>
        )}
      </div>

      {/* Letter Boxes */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3 py-2">
        {slots.map((ch, idx) => {
          const isLockedHint = Boolean(revealedHints[idx]);
          const isExact = feedback?.exactMatches[idx];
          const isPresent = feedback?.presentLetters[idx];
          let boxCls = 'bg-white border-slate-300 text-slate-900';
          if (feedback?.correct || isExact) {
            boxCls = 'bg-emerald-50 border-emerald-500 text-emerald-900';
          } else if (isPresent) {
            boxCls = 'bg-amber-50 border-amber-400 text-amber-900';
          } else if (isLockedHint) {
            boxCls = 'bg-indigo-50 border-indigo-400 text-indigo-900';
          }
          return (
            <div
              key={idx}
              className={`w-11 h-12 sm:w-12 sm:h-14 rounded-xl border-2 flex items-center justify-center font-mono text-xl font-bold uppercase ${boxCls}`}
            >
              {ch}
            </div>
          );
        })}
      </div>

      {/* Direct keyboard input + Clickable Letter Pool */}
      <div className="space-y-4">
        <div className="flex flex-wrap justify-center gap-2">
          {currentPuzzle.letterPool.map((letter, idx) => (
            <button
              key={`${letter}-${idx}`}
              type="button"
              onClick={() => handleLetterInput(letter)}
              className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-indigo-100 border border-slate-200 font-mono font-bold text-slate-800 cursor-pointer transition-colors"
            >
              {letter}
            </button>
          ))}
          <button
            type="button"
            onClick={handleBackspace}
            aria-label="Backspace"
            className="px-3 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 inline-flex items-center gap-1 text-xs font-semibold cursor-pointer"
          >
            <Delete className="w-4 h-4" />
            Clear
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <input
            type="text"
            maxLength={currentPuzzle.length}
            value={slots.join('')}
            onChange={(e) => {
              const chars = e.target.value
                .toUpperCase()
                .replace(/[^A-Z]/g, '')
                .slice(0, currentPuzzle.length)
                .split('');
              const next = Array(currentPuzzle.length)
                .fill('')
                .map((_, i) => revealedHints[i] || chars[i] || '');
              setSlots(next);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleSubmitGuess();
            }}
            placeholder={`Type ${currentPuzzle.length}-letter term...`}
            aria-label="Type your word guess"
            className="px-3.5 py-2 text-sm font-mono uppercase border border-slate-300 rounded-lg w-52 focus:border-indigo-600"
          />

          <button
            type="button"
            onClick={handleSubmitGuess}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            Check Word
          </button>

          <button
            type="button"
            onClick={handleRevealLetter}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
            Hint (-15 pts)
          </button>

          <button
            type="button"
            onClick={() => setPuzzleIdx((i) => (i + 1) % filteredPuzzles.length)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Next Word
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
            feedback.correct
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-amber-50 border-amber-200 text-amber-950'
          }`}
        >
          <span className="text-sm font-semibold inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {feedback.message}
          </span>
          {savingResult && (
            <span className="text-xs font-mono font-semibold inline-flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-emerald-700" />
              Score: {savingResult.score}
              {savingResult.xpEarned ? ` · +${savingResult.xpEarned} XP` : ''}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
