import type Database from 'better-sqlite3';
import {
  BADGE_DEFINITIONS,
  BRAIN_BATTLE_QUESTIONS,
  CODE_QUEST_CHALLENGES,
  CYBER_SCENARIOS,
  EXPLORE_SCENES_META,
  MEMORY_PAIRS_POOL,
  TECH_WORD_PUZZLES,
  type DifficultyLevel,
  type ExploreSceneId,
} from '../data/gameBank.ts';

export type GameId =
  | 'brain_battle'
  | 'code_quest'
  | 'cyber_detective'
  | 'memory_master'
  | 'tech_word_puzzle';

export interface GamificationRow {
  user_id: number;
  xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  challenges_completed: number;
  updated_at: string;
}

export function getUtcDateString(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function getPreviousUtcDateString(dateStr: string): string {
  const dt = new Date(`${dateStr}T00:00:00.000Z`);
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

export function computeLevelFromXp(xp: number): {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
} {
  const safeXp = Math.max(0, Math.floor(xp));
  const xpPerLevel = 250;
  return {
    level: Math.floor(safeXp / xpPerLevel) + 1,
    xpIntoLevel: safeXp % xpPerLevel,
    xpForNextLevel: xpPerLevel,
  };
}

export function ensureUserGamificationRow(db: Database.Database, userId: number): GamificationRow {
  db.prepare(
    `INSERT OR IGNORE INTO user_gamification
      (user_id, xp, level, current_streak, longest_streak, last_activity_date, challenges_completed)
     VALUES (?, 0, 1, 0, 0, NULL, 0)`
  ).run(userId);

  return db
    .prepare('SELECT * FROM user_gamification WHERE user_id = ?')
    .get(userId) as GamificationRow;
}

function unlockBadgeIfMissing(
  db: Database.Database,
  userId: number,
  badgeKey: string,
  newlyUnlocked: string[]
): void {
  const res = db
    .prepare('INSERT OR IGNORE INTO user_badges (user_id, badge_key) VALUES (?, ?)')
    .run(userId, badgeKey);
  if (res.changes > 0) {
    newlyUnlocked.push(badgeKey);
  }
}

export function applyActivityXpAndStreak(
  db: Database.Database,
  userId: number,
  xpGained: number,
  options?: { incrementChallengeCount?: boolean }
): { row: GamificationRow; newlyUnlocked: string[] } {
  const current = ensureUserGamificationRow(db, userId);
  const today = getUtcDateString();
  const yesterday = getPreviousUtcDateString(today);

  let nextStreak = current.current_streak;
  if (current.last_activity_date === today) {
    nextStreak = Math.max(1, current.current_streak);
  } else if (current.last_activity_date === yesterday) {
    nextStreak = current.current_streak + 1;
  } else {
    nextStreak = 1;
  }

  const nextLongest = Math.max(current.longest_streak, nextStreak);
  const nextXp = current.xp + Math.max(0, Math.floor(xpGained));
  const { level: nextLevel } = computeLevelFromXp(nextXp);
  const nextChallenges =
    current.challenges_completed + (options?.incrementChallengeCount ? 1 : 0);

  db.prepare(
    `UPDATE user_gamification
     SET xp = ?, level = ?, current_streak = ?, longest_streak = ?,
         last_activity_date = ?, challenges_completed = ?, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ?`
  ).run(nextXp, nextLevel, nextStreak, nextLongest, today, nextChallenges, userId);

  const newlyUnlocked: string[] = [];
  if (nextStreak >= 3) {
    unlockBadgeIfMissing(db, userId, 'streak_3', newlyUnlocked);
  }
  if (nextXp >= 500) {
    unlockBadgeIfMissing(db, userId, 'xp_500', newlyUnlocked);
  }

  const updated = db
    .prepare('SELECT * FROM user_gamification WHERE user_id = ?')
    .get(userId) as GamificationRow;

  return { row: updated, newlyUnlocked };
}

export function getDifficultyMultiplier(difficulty: DifficultyLevel): number {
  if (difficulty === 'hard') return 1.5;
  if (difficulty === 'medium') return 1.25;
  return 1.0;
}

export function getDailyBrainBattleSelection(dateStr = getUtcDateString()) {
  // Deterministic daily subset of 5 questions across categories
  const seed = dateStr
    .split('')
    .reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 9973, 17);
  const pool = [...BRAIN_BATTLE_QUESTIONS];
  const selected = [];
  let idx = seed % pool.length;
  while (selected.length < 5 && pool.length > 0) {
    idx = (idx + 7) % pool.length;
    selected.push(pool.splice(idx, 1)[0]);
  }
  return selected;
}

export function checkQuestionAnswer(
  gameId: 'brain_battle' | 'code_quest' | 'cyber_detective',
  questionId: string,
  selectedIndex: number
): { found: boolean; correct: boolean; correctIndex: number; explanation: string } {
  let item:
    | { id: string; correctIndex: number; explanation: string }
    | undefined;

  if (gameId === 'brain_battle') {
    item = BRAIN_BATTLE_QUESTIONS.find((q) => q.id === questionId);
  } else if (gameId === 'code_quest') {
    item = CODE_QUEST_CHALLENGES.find((q) => q.id === questionId);
  } else {
    item = CYBER_SCENARIOS.find((q) => q.id === questionId);
  }

  if (!item) {
    return { found: false, correct: false, correctIndex: -1, explanation: '' };
  }

  return {
    found: true,
    correct: selectedIndex === item.correctIndex,
    correctIndex: item.correctIndex,
    explanation: item.explanation,
  };
}

export interface QuizSubmissionResult {
  score: number;
  maxScore: number;
  correctCount: number;
  totalQuestions: number;
  accuracyPct: number;
  xpEarned: number;
  newBadges: string[];
  feedback: Array<{
    questionId: string;
    selectedIndex: number;
    correctIndex: number;
    correct: boolean;
    explanation: string;
  }>;
}

export function verifyAndRecordQuizSession(
  db: Database.Database,
  userId: number,
  params: {
    gameId: 'brain_battle' | 'code_quest' | 'cyber_detective';
    category: string;
    difficulty: DifficultyLevel;
    durationSeconds: number;
    isDailyChallenge: boolean;
    answers: Array<{ questionId: string; selectedIndex: number }>;
  }
): QuizSubmissionResult {
  const { gameId, category, difficulty, durationSeconds, isDailyChallenge, answers } = params;
  const today = getUtcDateString();

  if (gameId === 'brain_battle' && isDailyChallenge) {
    const alreadyDone = db
      .prepare(
        `SELECT id FROM game_scores
         WHERE user_id = ? AND game_id = 'brain_battle' AND is_daily_challenge = 1 AND daily_date = ?`
      )
      .get(userId, today);
    if (alreadyDone) {
      throw new Error('DAILY_ALREADY_COMPLETED');
    }
  }

  const seenIds = new Set<string>();
  const feedback: QuizSubmissionResult['feedback'] = [];
  let correctCount = 0;

  for (const ans of answers) {
    if (!ans || typeof ans.questionId !== 'string' || seenIds.has(ans.questionId)) {
      continue;
    }
    seenIds.add(ans.questionId);
    const selectedIndex = Number.isInteger(ans.selectedIndex) ? ans.selectedIndex : -1;
    const checked = checkQuestionAnswer(gameId, ans.questionId, selectedIndex);
    if (!checked.found) continue;
    if (checked.correct) correctCount += 1;
    feedback.push({
      questionId: ans.questionId,
      selectedIndex,
      correctIndex: checked.correctIndex,
      correct: checked.correct,
      explanation: checked.explanation,
    });
  }

  if (feedback.length === 0) {
    throw new Error('NO_VALID_ANSWERS');
  }

  const totalQuestions = feedback.length;
  const accuracyPct = Math.round((correctCount / totalQuestions) * 100);
  const multiplier = getDifficultyMultiplier(difficulty);
  const baseMax = totalQuestions * 100;
  const maxScore = Math.round(baseMax * multiplier) + (isDailyChallenge ? 50 : 0);

  const safeDuration = Math.max(1, Math.min(3600, Math.floor(durationSeconds || 30)));
  const avgSecPerQ = safeDuration / totalQuestions;
  const speedBonus = correctCount > 0 && avgSecPerQ <= 12 ? correctCount * 15 : 0;
  const dailyBonus = isDailyChallenge && correctCount > 0 ? 50 : 0;
  const rawScore = Math.round(correctCount * 100 * multiplier) + speedBonus + dailyBonus;
  const score = Math.min(maxScore, rawScore);

  const xpBase = Math.round(correctCount * 15 * multiplier) + (accuracyPct >= 70 ? 20 : 5);
  const xpEarned = xpBase + (isDailyChallenge && correctCount > 0 ? 30 : 0);

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO game_scores
        (user_id, game_id, category, difficulty, score, max_score, xp_earned, duration_seconds, is_daily_challenge, daily_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      userId,
      gameId,
      category || 'All',
      difficulty,
      score,
      maxScore,
      xpEarned,
      safeDuration,
      isDailyChallenge ? 1 : 0,
      isDailyChallenge ? today : null
    );

    const { newlyUnlocked } = applyActivityXpAndStreak(db, userId, xpEarned, {
      incrementChallengeCount: accuracyPct >= 60,
    });

    if (accuracyPct >= 60) {
      unlockBadgeIfMissing(db, userId, 'first_win', newlyUnlocked);
    }
    if (gameId === 'brain_battle' && isDailyChallenge && accuracyPct >= 60) {
      unlockBadgeIfMissing(db, userId, 'daily_champion', newlyUnlocked);
    }
    if (gameId === 'code_quest' && accuracyPct >= 75) {
      unlockBadgeIfMissing(db, userId, 'code_master', newlyUnlocked);
    }
    if (gameId === 'cyber_detective' && accuracyPct >= 75) {
      unlockBadgeIfMissing(db, userId, 'cyber_guardian', newlyUnlocked);
    }

    return newlyUnlocked;
  });

  const newBadges = tx();
  return {
    score,
    maxScore,
    correctCount,
    totalQuestions,
    accuracyPct,
    xpEarned,
    newBadges,
    feedback,
  };
}

export function verifyAndRecordMemoryMaster(
  db: Database.Database,
  userId: number,
  params: {
    mode: 'terms' | 'programming' | 'icons';
    difficulty: DifficultyLevel;
    moves: number;
    durationSeconds: number;
    matchedPairIds: string[];
  }
): { score: number; maxScore: number; xpEarned: number; newBadges: string[] } {
  const expectedPairs =
    params.difficulty === 'hard' ? 12 : params.difficulty === 'medium' ? 8 : 6;
  const uniqueIds = Array.from(new Set(params.matchedPairIds || []));
  const validPairIds = new Set(
    MEMORY_PAIRS_POOL.filter((item) => item.mode === params.mode).map((i) => i.id)
  );
  const verifiedMatches = uniqueIds.filter((id) => validPairIds.has(id));

  if (verifiedMatches.length < expectedPairs) {
    throw new Error('INCOMPLETE_MEMORY_BOARD');
  }

  const moves = Math.max(expectedPairs, Math.floor(params.moves || expectedPairs));
  const durationSeconds = Math.max(3, Math.min(3600, Math.floor(params.durationSeconds || 20)));
  const maxScore = expectedPairs * 100;
  const extraMoves = Math.max(0, moves - expectedPairs);
  const score = Math.max(Math.round(maxScore * 0.4), maxScore - extraMoves * 15);
  const xpEarned =
    (params.difficulty === 'hard' ? 75 : params.difficulty === 'medium' ? 50 : 35) +
    (extraMoves <= expectedPairs ? 15 : 0);

  const newBadges = db.transaction(() => {
    db.prepare(
      `INSERT INTO game_scores
        (user_id, game_id, category, difficulty, score, max_score, xp_earned, duration_seconds)
       VALUES (?, 'memory_master', ?, ?, ?, ?, ?, ?)`
    ).run(userId, params.mode, params.difficulty, score, maxScore, xpEarned, durationSeconds);

    const { newlyUnlocked } = applyActivityXpAndStreak(db, userId, xpEarned, {
      incrementChallengeCount: true,
    });
    unlockBadgeIfMissing(db, userId, 'memory_ace', newlyUnlocked);
    return newlyUnlocked;
  })();

  return { score, maxScore, xpEarned, newBadges };
}

export function verifyAndRecordWordPuzzle(
  db: Database.Database,
  userId: number,
  params: {
    difficulty: DifficultyLevel;
    durationSeconds: number;
    solvedEntries: Array<{ puzzleId: string; guess: string; hintsUsed?: number }>;
  }
): {
  solvedCount: number;
  totalAttempted: number;
  score: number;
  maxScore: number;
  xpEarned: number;
  newBadges: string[];
} {
  const seen = new Set<string>();
  let solvedCount = 0;
  let totalHints = 0;

  for (const entry of params.solvedEntries || []) {
    if (!entry || typeof entry.puzzleId !== 'string' || seen.has(entry.puzzleId)) continue;
    seen.add(entry.puzzleId);
    const puzzle = TECH_WORD_PUZZLES.find((p) => p.id === entry.puzzleId);
    if (!puzzle) continue;
    if (String(entry.guess || '').trim().toUpperCase() === puzzle.word) {
      solvedCount += 1;
      totalHints += Math.max(0, Math.min(5, Math.floor(entry.hintsUsed || 0)));
    }
  }

  if (solvedCount === 0) {
    throw new Error('NO_WORDS_SOLVED');
  }

  const multiplier = getDifficultyMultiplier(params.difficulty);
  const maxScore = Math.round(solvedCount * 100 * multiplier);
  const score = Math.max(solvedCount * 40, maxScore - totalHints * 15);
  const xpEarned = Math.max(15, Math.round(solvedCount * 22 * multiplier) - totalHints * 3);
  const safeDuration = Math.max(3, Math.min(3600, Math.floor(params.durationSeconds || 30)));

  const newBadges = db.transaction(() => {
    db.prepare(
      `INSERT INTO game_scores
        (user_id, game_id, category, difficulty, score, max_score, xp_earned, duration_seconds)
       VALUES (?, 'tech_word_puzzle', 'Vocabulary', ?, ?, ?, ?, ?)`
    ).run(userId, params.difficulty, score, maxScore, xpEarned, safeDuration);

    const { newlyUnlocked } = applyActivityXpAndStreak(db, userId, xpEarned, {
      incrementChallengeCount: true,
    });
    unlockBadgeIfMissing(db, userId, 'word_wizard', newlyUnlocked);
    return newlyUnlocked;
  })();

  return {
    solvedCount,
    totalAttempted: seen.size,
    score,
    maxScore,
    xpEarned,
    newBadges,
  };
}

export function recordExploreProgress(
  db: Database.Database,
  userId: number,
  sceneId: ExploreSceneId,
  inspectedPartIds: string[]
): {
  sceneId: ExploreSceneId;
  inspectedParts: string[];
  completed: boolean;
  xpEarned: number;
  newBadges: string[];
} {
  const meta = EXPLORE_SCENES_META.find((s) => s.id === sceneId);
  if (!meta) {
    throw new Error('INVALID_SCENE');
  }

  const cleanIncoming = Array.from(
    new Set(
      (inspectedPartIds || [])
        .filter((p): p is string => typeof p === 'string' && p.trim().length > 0 && p.length <= 80)
        .map((p) => p.trim())
    )
  ).slice(0, 30);

  return db.transaction(() => {
    const existing = db
      .prepare('SELECT * FROM explore_progress WHERE user_id = ? AND scene_id = ?')
      .get(userId, sceneId) as
      | {
          id: number;
          inspected_parts_json: string;
          completed: number;
          xp_awarded: number;
        }
      | undefined;

    let mergedParts: string[] = [];
    if (existing) {
      try {
        const parsed = JSON.parse(existing.inspected_parts_json);
        if (Array.isArray(parsed)) mergedParts = parsed.filter((x) => typeof x === 'string');
      } catch {
        mergedParts = [];
      }
    }

    mergedParts = Array.from(new Set([...mergedParts, ...cleanIncoming])).slice(0, 30);
    const shouldComplete = mergedParts.length >= meta.minPartsRequired;
    const wasCompleted = existing?.completed === 1;
    let xpEarned = 0;
    const newBadges: string[] = [];

    if (shouldComplete && !wasCompleted) {
      xpEarned = meta.xpReward;
    }

    if (existing) {
      db.prepare(
        `UPDATE explore_progress
         SET inspected_parts_json = ?, completed = ?, xp_awarded = xp_awarded + ?, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ? AND scene_id = ?`
      ).run(
        JSON.stringify(mergedParts),
        shouldComplete || wasCompleted ? 1 : 0,
        xpEarned,
        userId,
        sceneId
      );
    } else {
      db.prepare(
        `INSERT INTO explore_progress (user_id, scene_id, inspected_parts_json, completed, xp_awarded)
         VALUES (?, ?, ?, ?, ?)`
      ).run(userId, sceneId, JSON.stringify(mergedParts), shouldComplete ? 1 : 0, xpEarned);
    }

    if (xpEarned > 0) {
      const { newlyUnlocked } = applyActivityXpAndStreak(db, userId, xpEarned, {
        incrementChallengeCount: true,
      });
      newBadges.push(...newlyUnlocked);
      unlockBadgeIfMissing(db, userId, 'explorer_initiate', newBadges);

      const completedCountRow = db
        .prepare('SELECT COUNT(*) AS cnt FROM explore_progress WHERE user_id = ? AND completed = 1')
        .get(userId) as { cnt: number };
      if (completedCountRow.cnt >= EXPLORE_SCENES_META.length) {
        unlockBadgeIfMissing(db, userId, 'lab_scientist_3d', newBadges);
      }
    }

    return {
      sceneId,
      inspectedParts: mergedParts,
      completed: shouldComplete || wasCompleted,
      xpEarned,
      newBadges,
    };
  })();
}

export function getUserGamificationProfile(db: Database.Database, userId: number) {
  const row = ensureUserGamificationRow(db, userId);
  const levelInfo = computeLevelFromXp(row.xp);
  const today = getUtcDateString();

  const unlockedBadgesRows = db
    .prepare('SELECT badge_key, unlocked_at FROM user_badges WHERE user_id = ? ORDER BY unlocked_at DESC')
    .all(userId) as Array<{ badge_key: string; unlocked_at: string }>;

  const unlockedMap = new Map(unlockedBadgesRows.map((b) => [b.badge_key, b.unlocked_at]));

  const badges = BADGE_DEFINITIONS.map((def) => ({
    ...def,
    unlocked: unlockedMap.has(def.key),
    unlockedAt: unlockedMap.get(def.key) ?? null,
  }));

  const personalBests = db
    .prepare(
      `SELECT game_id, MAX(score) AS best_score, COUNT(*) AS attempts, MAX(played_at) AS last_played_at
       FROM game_scores
       WHERE user_id = ?
       GROUP BY game_id`
    )
    .all(userId) as Array<{
    game_id: GameId;
    best_score: number;
    attempts: number;
    last_played_at: string;
  }>;

  const recentScores = db
    .prepare(
      `SELECT id, game_id, category, difficulty, score, max_score, xp_earned, duration_seconds, is_daily_challenge, played_at
       FROM game_scores
       WHERE user_id = ?
       ORDER BY played_at DESC, id DESC
       LIMIT 10`
    )
    .all(userId);

  const exploreRows = db
    .prepare(
      `SELECT scene_id, inspected_parts_json, completed, xp_awarded, updated_at
       FROM explore_progress
       WHERE user_id = ?`
    )
    .all(userId) as Array<{
    scene_id: ExploreSceneId;
    inspected_parts_json: string;
    completed: number;
    xp_awarded: number;
    updated_at: string;
  }>;

  const exploreProgress = EXPLORE_SCENES_META.map((meta) => {
    const rec = exploreRows.find((r) => r.scene_id === meta.id);
    let inspectedParts: string[] = [];
    if (rec) {
      try {
        const parsed = JSON.parse(rec.inspected_parts_json);
        if (Array.isArray(parsed)) inspectedParts = parsed.filter((x) => typeof x === 'string');
      } catch {
        inspectedParts = [];
      }
    }
    return {
      sceneId: meta.id,
      title: meta.title,
      category: meta.category,
      minPartsRequired: meta.minPartsRequired,
      xpReward: meta.xpReward,
      inspectedParts,
      completed: rec?.completed === 1,
      xpAwarded: rec?.xp_awarded ?? 0,
    };
  });

  const dailyDoneRow = db
    .prepare(
      `SELECT id FROM game_scores
       WHERE user_id = ? AND game_id = 'brain_battle' AND is_daily_challenge = 1 AND daily_date = ?`
    )
    .get(userId, today);

  return {
    xp: row.xp,
    level: levelInfo.level,
    xpIntoLevel: levelInfo.xpIntoLevel,
    xpForNextLevel: levelInfo.xpForNextLevel,
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    lastActivityDate: row.last_activity_date,
    challengesCompleted: row.challenges_completed,
    dailyChallengeCompletedToday: Boolean(dailyDoneRow),
    badges,
    personalBests,
    recentScores,
    exploreProgress,
  };
}

export function getLeaderboard(db: Database.Database) {
  const brainBattleTop = db
    .prepare(
      `SELECT u.id AS user_id, u.name, u.role,
              MAX(gs.score) AS best_score,
              COUNT(gs.id) AS games_played,
              COALESCE(ug.xp, 0) AS xp,
              COALESCE(ug.level, 1) AS level,
              COALESCE(ug.current_streak, 0) AS current_streak
       FROM game_scores gs
       JOIN users u ON u.id = gs.user_id
       LEFT JOIN user_gamification ug ON ug.user_id = u.id
       WHERE gs.game_id = 'brain_battle'
       GROUP BY u.id
       ORDER BY best_score DESC, xp DESC
       LIMIT 10`
    )
    .all();

  const xpTop = db
    .prepare(
      `SELECT u.id AS user_id, u.name, u.role,
              ug.xp, ug.level, ug.current_streak, ug.challenges_completed
       FROM user_gamification ug
       JOIN users u ON u.id = ug.user_id
       WHERE ug.xp > 0
       ORDER BY ug.xp DESC, ug.current_streak DESC
       LIMIT 10`
    )
    .all();

  return { brainBattleTop, xpTop };
}
