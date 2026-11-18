import {
  Award,
  Brain,
  Code2,
  Flame,
  Gamepad2,
  Layers,
  Lock,
  Puzzle,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BrainBattleGame } from '../games/BrainBattleGame';
import { CodeQuestGame } from '../games/CodeQuestGame';
import { CyberDetectiveGame } from '../games/CyberDetectiveGame';
import { MemoryMasterGame } from '../games/MemoryMasterGame';
import { TechWordPuzzleGame } from '../games/TechWordPuzzleGame';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import {
  fetchGameBank,
  fetchGamificationProfile,
  fetchLeaderboard,
  type GameBankResponse,
  type GameId,
  type GamificationProfile,
  type LeaderboardResponse,
} from '../services/gamificationClient';

const GAME_CARDS: Array<{
  id: GameId;
  title: string;
  category: string;
  difficulties: string;
  description: string;
}> = [
  {
    id: 'brain_battle',
    title: 'Brain Battle',
    category: 'Quiz & Daily Challenge',
    difficulties: 'Easy · Medium · Hard',
    description:
      'Timed randomized quizzes across 8 domains with instant explanations, daily challenges, and live leaderboard rankings.',
  },
  {
    id: 'code_quest',
    title: 'Code Quest',
    category: 'Programming & Logic',
    difficulties: 'Easy -> Hard Progression',
    description:
      'Predict output, spot subtle bugs, complete missing lines, and solve logic puzzles across C, C++, Python, Java, and JavaScript.',
  },
  {
    id: 'cyber_detective',
    title: 'Cyber Detective',
    category: 'Cybersecurity Defense',
    difficulties: 'Easy · Medium · Hard',
    description:
      'Inspect phishing headers, smishing alerts, password flaws, and network rules with defensive explanations after every answer.',
  },
  {
    id: 'memory_master',
    title: 'Memory Master',
    category: 'Visual & Recall',
    difficulties: '4x3 · 4x4 · 6x4 Grids',
    description:
      'Flip-card memory challenges matching technical terms, programming concepts, and computing icons against the clock.',
  },
  {
    id: 'tech_word_puzzle',
    title: 'Tech Word Puzzle',
    category: 'Vocabulary & Clues',
    difficulties: 'Easy · Medium · Hard',
    description:
      'Solve computer terminology letter puzzles using technical clues, smart letter pools, and hint reveals.',
  },
];

function renderGameIcon(id: GameId) {
  const cls = 'w-5 h-5';
  switch (id) {
    case 'brain_battle':
      return <Brain className={cls} />;
    case 'code_quest':
      return <Code2 className={cls} />;
    case 'cyber_detective':
      return <ShieldCheck className={cls} />;
    case 'memory_master':
      return <Layers className={cls} />;
    case 'tech_word_puzzle':
      return <Puzzle className={cls} />;
  }
}

export function GameZonePage() {
  const { user } = useAuth();

  useDocumentMeta({
    title: 'Game Zone — Smart-Tech',
    description:
      'Play interactive STEM learning games including Brain Battle, Code Quest, Cyber Detective, Memory Master, and Tech Word Puzzle to earn XP and badges.',
    canonicalPath: '/games',
  });

  const [bank, setBank] = useState<GameBankResponse | null>(null);
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [activeTab, setActiveTab] = useState<'games' | 'leaderboard' | 'badges'>('games');
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [launchDaily, setLaunchDaily] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [bankRes, lbRes] = await Promise.all([fetchGameBank(), fetchLeaderboard()]);
      setBank(bankRes);
      setLeaderboard(lbRes);
      if (user) {
        const profRes = await fetchGamificationProfile();
        setProfile(profRes.profile);
      } else {
        setProfile(null);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load Game Zone data.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const refreshLeaderboard = useCallback(() => {
    void fetchLeaderboard()
      .then((res) => setLeaderboard(res))
      .catch(() => {});
  }, []);

  const gameCategories = useMemo(
    () => Array.from(new Set(GAME_CARDS.map((g) => g.category))),
    []
  );

  const visibleGames = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return GAME_CARDS.filter((g) => {
      const catOk = selectedCategory === 'ALL' || g.category === selectedCategory;
      const queryOk =
        !q ||
        g.title.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q);
      return catOk && queryOk;
    });
  }, [searchQuery, selectedCategory]);

  const bestScoreMap = useMemo(() => {
    const map = new Map<GameId, { best: number; attempts: number }>();
    for (const row of profile?.personalBests || []) {
      map.set(row.game_id, { best: row.best_score, attempts: row.attempts });
    }
    return map;
  }, [profile]);

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="h-10 w-72 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-52 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header & Gamification Summary Strip */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-700">
              <Gamepad2 className="w-4 h-4" />
              <span>Interactive Learning Arcade</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
              Smart-Tech Game Zone
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl">
              Reinforce programming, cybersecurity, AI, and foundational STEM skills through five playable learning challenges.
            </p>
          </div>

          {user && profile ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
              <div className="px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-200">
                <p className="text-xs font-semibold text-indigo-700">Total XP</p>
                <p className="font-display text-xl font-bold font-mono text-slate-900">
                  {profile.xp}
                </p>
                <p className="text-[11px] text-indigo-700">Level {profile.level}</p>
              </div>
              <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-xs font-semibold text-amber-800 inline-flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" /> Streak
                </p>
                <p className="font-display text-xl font-bold font-mono text-slate-900">
                  {profile.currentStreak}d
                </p>
                <p className="text-[11px] text-amber-800">Best: {profile.longestStreak}d</p>
              </div>
              <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <p className="text-xs font-semibold text-emerald-800 inline-flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" /> Badges
                </p>
                <p className="font-display text-xl font-bold font-mono text-slate-900">
                  {profile.badges.filter((b) => b.unlocked).length}/{profile.badges.length}
                </p>
                <p className="text-[11px] text-emerald-800">Unlocked</p>
              </div>
              <div className="px-4 py-3 rounded-xl bg-slate-100 border border-slate-200">
                <p className="text-xs font-semibold text-slate-700">Completed</p>
                <p className="font-display text-xl font-bold font-mono text-slate-900">
                  {profile.challengesCompleted}
                </p>
                <p className="text-[11px] text-slate-600">Verified runs</p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4 max-w-md">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-900">Playing in Guest Mode</p>
                <p className="text-xs text-slate-600">
                  Sign in to persist XP, streaks, achievement badges, and leaderboard rankings.
                </p>
              </div>
              <Link
                to="/auth"
                className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg whitespace-nowrap"
              >
                Sign In to Save XP
              </Link>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('games');
              }}
              className={`px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer ${
                activeTab === 'games'
                  ? 'bg-indigo-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Playable Games (5)
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('leaderboard');
                setActiveGame(null);
              }}
              className={`px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer inline-flex items-center gap-1.5 ${
                activeTab === 'leaderboard'
                  ? 'bg-indigo-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              Leaderboard
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('badges');
                setActiveGame(null);
              }}
              className={`px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer inline-flex items-center gap-1.5 ${
                activeTab === 'badges'
                  ? 'bg-indigo-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              Achievement Badges
            </button>
          </div>

          {bank && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('games');
                setActiveGame('brain_battle');
                setLaunchDaily(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {profile?.dailyChallengeCompletedToday
                ? `Daily Challenge Completed (${bank.dailyDate})`
                : `Launch Today's Daily Challenge`}
            </button>
          )}
        </div>
      </section>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-900">
          {errorMsg}
        </div>
      )}

      {/* Active Game Workspace */}
      {activeTab === 'games' && activeGame && bank && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setActiveGame(null);
                setLaunchDaily(false);
              }}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              ← Back to All 5 Games
            </button>
          </div>

          {activeGame === 'brain_battle' && (
            <BrainBattleGame
              questions={bank.brainBattle}
              dailyQuestions={bank.dailyChallenge}
              categories={bank.categories}
              dailyDate={bank.dailyDate}
              dailyCompletedToday={Boolean(profile?.dailyChallengeCompletedToday)}
              isAuthenticated={Boolean(user)}
              initialDaily={launchDaily}
              onProfileUpdated={setProfile}
              onRefreshLeaderboard={refreshLeaderboard}
            />
          )}
          {activeGame === 'code_quest' && (
            <CodeQuestGame
              challenges={bank.codeQuest}
              isAuthenticated={Boolean(user)}
              onProfileUpdated={setProfile}
            />
          )}
          {activeGame === 'cyber_detective' && (
            <CyberDetectiveGame
              scenarios={bank.cyberDetective}
              isAuthenticated={Boolean(user)}
              onProfileUpdated={setProfile}
            />
          )}
          {activeGame === 'memory_master' && (
            <MemoryMasterGame
              memoryPairs={bank.memoryPairs}
              isAuthenticated={Boolean(user)}
              onProfileUpdated={setProfile}
            />
          )}
          {activeGame === 'tech_word_puzzle' && (
            <TechWordPuzzleGame
              puzzles={bank.wordPuzzles}
              isAuthenticated={Boolean(user)}
              onProfileUpdated={setProfile}
            />
          )}
        </section>
      )}

      {/* Games Discovery Grid */}
      {activeTab === 'games' && !activeGame && (
        <section className="space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                  selectedCategory === 'ALL'
                    ? 'bg-indigo-700 text-white border-indigo-700'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                All Categories
              </button>
              {gameCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-indigo-700 text-white border-indigo-700'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search games..."
                aria-label="Search games"
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:border-indigo-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleGames.map((game) => {
              const stats = bestScoreMap.get(game.id);
              return (
                <article
                  key={game.id}
                  className="bg-white border border-slate-200 hover:border-indigo-300 rounded-xl p-6 flex flex-col justify-between gap-5 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                        {renderGameIcon(game.id)}
                      </div>
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700">
                        {game.difficulties}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-indigo-700">{game.category}</p>
                      <h2 className="font-display text-xl font-bold text-slate-900 mt-0.5">
                        {game.title}
                      </h2>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{game.description}</p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div className="text-xs font-mono text-slate-600">
                      {stats ? (
                        <span>
                          Best: <strong className="text-slate-900">{stats.best}</strong> ·{' '}
                          {stats.attempts} runs
                        </span>
                      ) : (
                        <span>Not played yet</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setLaunchDaily(false);
                        setActiveGame(game.id);
                      }}
                      className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
                    >
                      Play Game
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Leaderboard Tab */}
      {activeTab === 'leaderboard' && leaderboard && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-600" />
              <h2 className="font-display text-lg font-bold text-slate-900">
                Brain Battle High Scores
              </h2>
            </div>

            {leaderboard.brainBattleTop.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">
                No verified Brain Battle matches recorded yet. Sign in and play to claim Rank #1!
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {leaderboard.brainBattleTop.map((row, i) => (
                  <div key={row.user_id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-slate-100 font-mono text-xs font-bold flex items-center justify-center text-slate-700">
                        #{i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{row.name}</p>
                        <p className="text-xs text-slate-500 capitalize">
                          {row.role} · Level {row.level} · {row.games_played} matches
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-sm font-bold text-indigo-700">
                      {row.best_score} pts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-700" />
              <h2 className="font-display text-lg font-bold text-slate-900">
                Overall Smart-Tech XP Leaders
              </h2>
            </div>

            {leaderboard.xpTop.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">
                Complete any Game Zone match or 3D Explore Lab while signed in to appear here.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {leaderboard.xpTop.map((row, i) => (
                  <div key={row.user_id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-slate-100 font-mono text-xs font-bold flex items-center justify-center text-slate-700">
                        #{i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{row.name}</p>
                        <p className="text-xs text-slate-500">
                          Level {row.level} · {row.current_streak}d streak · {row.challenges_completed} completed
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-sm font-bold text-emerald-700">
                      {row.xp} XP
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Achievement Badges Tab */}
      {activeTab === 'badges' && bank && (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {(profile?.badges ||
            bank.badgeDefinitions.map((b) => ({
              ...b,
              unlocked: false,
              unlockedAt: null,
            }))).map((badge) => (
            <div
              key={badge.key}
              className={`rounded-xl border p-5 space-y-2.5 ${
                badge.unlocked
                  ? 'bg-emerald-50/70 border-emerald-300'
                  : 'bg-white border-slate-200 opacity-85'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
                  {badge.category}
                </span>
                {badge.unlocked ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800">
                    <Award className="w-4 h-4" /> Unlocked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                    <Lock className="w-3.5 h-3.5" /> Locked
                  </span>
                )}
              </div>
              <h3 className="font-display text-base font-bold text-slate-900">{badge.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{badge.description}</p>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
