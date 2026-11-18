import {
  Atom,
  Box,
  Brain,
  Clock,
  Cpu,
  Database,
  GitBranch,
  Globe,
  Key,
  Layers,
  RotateCcw,
  Server,
  Shield,
  Terminal,
  Trophy,
  Wifi,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  submitGameCompletion,
  type DifficultyLevel,
  type GamificationProfile,
  type MemoryPairItem,
} from '../services/gamificationClient';

interface MemoryMasterGameProps {
  memoryPairs: MemoryPairItem[];
  isAuthenticated: boolean;
  onProfileUpdated: (profile: GamificationProfile) => void;
}

interface CardTile {
  uid: string;
  pairId: string;
  side: 'term' | 'match';
  label: string;
  iconKey?: string;
}

function renderTechIcon(iconKey?: string) {
  const cls = 'w-5 h-5 text-indigo-700';
  switch (iconKey) {
    case 'cpu':
      return <Cpu className={cls} />;
    case 'shield':
      return <Shield className={cls} />;
    case 'database':
      return <Database className={cls} />;
    case 'globe':
      return <Globe className={cls} />;
    case 'terminal':
      return <Terminal className={cls} />;
    case 'git-branch':
      return <GitBranch className={cls} />;
    case 'server':
      return <Server className={cls} />;
    case 'wifi':
      return <Wifi className={cls} />;
    case 'key':
      return <Key className={cls} />;
    case 'brain':
      return <Brain className={cls} />;
    case 'box':
      return <Box className={cls} />;
    case 'atom':
      return <Atom className={cls} />;
    default:
      return <Layers className={cls} />;
  }
}

export function MemoryMasterGame({
  memoryPairs,
  isAuthenticated,
  onProfileUpdated,
}: MemoryMasterGameProps) {
  const [mode, setMode] = useState<'terms' | 'programming' | 'icons'>('terms');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('easy');
  const [cards, setCards] = useState<CardTile[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matchedPairIds, setMatchedPairIds] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [lockingBoard, setLockingBoard] = useState(false);
  const [resultInfo, setResultInfo] = useState<{
    score: number;
    xpEarned: number;
    error?: string;
  } | null>(null);

  const pairCount = difficulty === 'hard' ? 12 : difficulty === 'medium' ? 8 : 6;

  const modePairs = useMemo(
    () => memoryPairs.filter((p) => p.mode === mode),
    [memoryPairs, mode]
  );

  const initBoard = (nextMode = mode, nextDiff = difficulty) => {
    const count = nextDiff === 'hard' ? 12 : nextDiff === 'medium' ? 8 : 6;
    const pool = memoryPairs
      .filter((p) => p.mode === nextMode)
      .slice(0, count);

    const tiles: CardTile[] = [];
    for (const pair of pool) {
      tiles.push({
        uid: `${pair.id}-term`,
        pairId: pair.id,
        side: 'term',
        label: pair.term,
        iconKey: pair.iconKey,
      });
      tiles.push({
        uid: `${pair.id}-match`,
        pairId: pair.id,
        side: 'match',
        label: pair.match,
      });
    }

    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }

    setCards(tiles);
    setFlippedIndices([]);
    setMatchedPairIds([]);
    setMoves(0);
    setElapsedSeconds(0);
    setRunning(true);
    setCompleted(false);
    setLockingBoard(false);
    setResultInfo(null);
  };

  useEffect(() => {
    initBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, difficulty, memoryPairs.length]);

  useEffect(() => {
    if (!running || completed) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, completed]);

  const finalizeVictory = async (finalMatched: string[], finalMoves: number) => {
    setCompleted(true);
    setRunning(false);
    const localScore = Math.max(400, pairCount * 100 - Math.max(0, finalMoves - pairCount) * 15);

    if (!isAuthenticated) {
      setResultInfo({ score: localScore, xpEarned: 0 });
      return;
    }

    try {
      const res = await submitGameCompletion({
        gameId: 'memory_master',
        mode,
        difficulty,
        moves: finalMoves,
        durationSeconds: Math.max(3, elapsedSeconds),
        matchedPairIds: finalMatched,
      });
      setResultInfo({ score: res.result.score, xpEarned: res.result.xpEarned });
      onProfileUpdated(res.profile);
    } catch (err) {
      setResultInfo({
        score: localScore,
        xpEarned: 0,
        error: err instanceof Error ? err.message : 'Unable to save Memory Master score.',
      });
    }
  };

  const handleCardClick = (index: number) => {
    if (lockingBoard || completed) return;
    const card = cards[index];
    if (!card) return;
    if (flippedIndices.includes(index) || matchedPairIds.includes(card.pairId)) return;

    const nextFlipped = [...flippedIndices, index];
    setFlippedIndices(nextFlipped);

    if (nextFlipped.length === 2) {
      const nextMoves = moves + 1;
      setMoves(nextMoves);
      const first = cards[nextFlipped[0]];
      const second = cards[nextFlipped[1]];

      if (first.pairId === second.pairId && first.side !== second.side) {
        const nextMatched = [...matchedPairIds, first.pairId];
        setMatchedPairIds(nextMatched);
        setFlippedIndices([]);
        if (nextMatched.length === pairCount) {
          void finalizeVictory(nextMatched, nextMoves);
        }
      } else {
        setLockingBoard(true);
        window.setTimeout(() => {
          setFlippedIndices([]);
          setLockingBoard(false);
        }, 700);
      }
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">Memory Master</h2>
          <p className="text-sm text-slate-600 mt-1">
            Flip cards to match technical terms with definitions, programming concepts, and hardware/network icons.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
          <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 font-semibold">
            Pairs: {matchedPairIds.length}/{pairCount}
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 font-semibold">
            Moves: {moves}
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 font-semibold">
            <Clock className="w-3.5 h-3.5" />
            {elapsedSeconds}s
          </span>
        </div>
      </div>

      {/* Mode & Difficulty selectors */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'terms', label: 'Terms & Definitions' },
              { id: 'programming', label: 'Programming Concepts' },
              { id: 'icons', label: 'Technology Icons' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                mode === m.id
                  ? 'bg-indigo-700 text-white border-indigo-700'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              {m.label}
            </button>
          ))}
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
              {lvl} ({lvl === 'hard' ? '6x4' : lvl === 'medium' ? '4x4' : '4x3'})
            </button>
          ))}
          <button
            type="button"
            onClick={() => initBoard()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Shuffle
          </button>
        </div>
      </div>

      {completed && resultInfo && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-emerald-700" />
            <div>
              <p className="text-sm font-bold text-emerald-950">
                Board Cleared in {moves} moves ({elapsedSeconds}s)!
              </p>
              <p className="text-xs text-emerald-800">
                Score: {resultInfo.score}
                {resultInfo.xpEarned ? ` · +${resultInfo.xpEarned} XP Earned` : ''}
              </p>
            </div>
          </div>

          {difficulty !== 'hard' && (
            <button
              type="button"
              onClick={() => setDifficulty(difficulty === 'easy' ? 'medium' : 'hard')}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
            >
              Advance to {difficulty === 'easy' ? 'Medium (4x4)' : 'Hard (6x4)'}
            </button>
          )}
        </div>
      )}

      {modePairs.length === 0 ? (
        <p className="text-sm text-slate-500">Loading memory deck...</p>
      ) : (
        <div
          className={`grid gap-3 ${
            difficulty === 'hard'
              ? 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-6'
              : 'grid-cols-2 sm:grid-cols-4'
          }`}
        >
          {cards.map((card, i) => {
            const isMatched = matchedPairIds.includes(card.pairId);
            const isFlipped = isMatched || flippedIndices.includes(i);

            return (
              <button
                key={card.uid}
                type="button"
                disabled={isMatched || lockingBoard}
                onClick={() => handleCardClick(i)}
                aria-label={isFlipped ? card.label : `Face down memory card ${i + 1}`}
                className={`min-h-[96px] p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer disabled:cursor-default ${
                  isMatched
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : isFlipped
                      ? 'bg-indigo-50 border-indigo-400 text-slate-900 shadow-xs'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {!isFlipped ? (
                  <span className="font-mono text-xs tracking-widest uppercase text-slate-400">
                    Smart-Tech
                  </span>
                ) : (
                  <>
                    {card.side === 'term' && card.iconKey && renderTechIcon(card.iconKey)}
                    <span
                      className={
                        card.side === 'term'
                          ? 'font-display text-sm font-bold leading-tight'
                          : 'text-xs font-medium leading-snug text-slate-700'
                      }
                    >
                      {card.label}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
