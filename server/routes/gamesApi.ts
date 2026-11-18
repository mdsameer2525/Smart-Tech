import type Database from 'better-sqlite3';
import { Router } from 'express';
import {
  BADGE_DEFINITIONS,
  BRAIN_BATTLE_CATEGORIES,
  BRAIN_BATTLE_QUESTIONS,
  CODE_QUEST_CHALLENGES,
  CYBER_SCENARIOS,
  EXPLORE_SCENES_META,
  MEMORY_PAIRS_POOL,
  TECH_WORD_PUZZLES,
  type DifficultyLevel,
  type ExploreSceneId,
} from '../data/gameBank.ts';
import {
  optionalAuth,
  requireAuth,
  type AuthenticatedRequest,
} from '../middleware/auth.ts';
import {
  checkQuestionAnswer,
  getDailyBrainBattleSelection,
  getLeaderboard,
  getUserGamificationProfile,
  getUtcDateString,
  recordExploreProgress,
  verifyAndRecordMemoryMaster,
  verifyAndRecordQuizSession,
  verifyAndRecordWordPuzzle,
} from '../services/gamificationService.ts';

function buildLetterPool(word: string): string[] {
  const letters = word.toUpperCase().split('');
  const extras = 'AEIORSTNLCPDM';
  let seed = word.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  while (letters.length < Math.min(12, word.length + 4)) {
    seed = (seed * 13 + 7) % extras.length;
    letters.push(extras[seed]);
  }
  // Deterministic shuffle per word so refresh order stays clean
  return letters.sort((a, b) => ((a.charCodeAt(0) * 17 + seed) % 29) - ((b.charCodeAt(0) * 17 + seed) % 29));
}

export function createGamesApiRouter(db: Database.Database): Router {
  const router = Router();

  // Sanitized Game Zone & 3D Explore catalog (no secret answer keys exposed)
  router.get('/games/bank', (_req, res) => {
    const today = getUtcDateString();
    const daily = getDailyBrainBattleSelection(today);

    res.json({
      dailyDate: today,
      categories: BRAIN_BATTLE_CATEGORIES,
      brainBattle: BRAIN_BATTLE_QUESTIONS.map((q) => ({
        id: q.id,
        category: q.category,
        difficulty: q.difficulty,
        prompt: q.prompt,
        options: q.options,
      })),
      dailyChallenge: daily.map((q) => ({
        id: q.id,
        category: q.category,
        difficulty: q.difficulty,
        prompt: q.prompt,
        options: q.options,
      })),
      codeQuest: CODE_QUEST_CHALLENGES.map((c) => ({
        id: c.id,
        language: c.language,
        challengeType: c.challengeType,
        difficulty: c.difficulty,
        title: c.title,
        code: c.code,
        prompt: c.prompt,
        options: c.options,
      })),
      cyberDetective: CYBER_SCENARIOS.map((s) => ({
        id: s.id,
        category: s.category,
        difficulty: s.difficulty,
        title: s.title,
        artifactLabel: s.artifactLabel,
        artifactContent: s.artifactContent,
        prompt: s.prompt,
        options: s.options,
      })),
      memoryPairs: MEMORY_PAIRS_POOL,
      wordPuzzles: TECH_WORD_PUZZLES.map((w) => ({
        id: w.id,
        length: w.word.length,
        category: w.category,
        difficulty: w.difficulty,
        clue: w.clue,
        hint: w.hint,
        letterPool: buildLetterPool(w.word),
      })),
      badgeDefinitions: BADGE_DEFINITIONS,
      exploreScenes: EXPLORE_SCENES_META,
    });
  });

  // Instant per-question explanation check (works for both guests & authenticated learners)
  router.post('/games/check-answer', optionalAuth, (req, res) => {
    const { gameId, questionId, selectedIndex } = req.body ?? {};
    if (
      gameId !== 'brain_battle' &&
      gameId !== 'code_quest' &&
      gameId !== 'cyber_detective'
    ) {
      res.status(400).json({ error: 'Unsupported quiz game identifier.' });
      return;
    }
    if (typeof questionId !== 'string' || !questionId.trim()) {
      res.status(400).json({ error: 'Valid questionId is required.' });
      return;
    }
    const idx = Number(selectedIndex);
    if (!Number.isInteger(idx) || idx < -1 || idx > 3) {
      res.status(400).json({ error: 'selectedIndex must be an integer between -1 and 3.' });
      return;
    }

    const result = checkQuestionAnswer(gameId, questionId.trim(), idx);
    if (!result.found) {
      res.status(404).json({ error: 'Challenge question not found.' });
      return;
    }

    res.json({
      correct: result.correct,
      correctIndex: result.correctIndex,
      explanation: result.explanation,
    });
  });

  // Tech Word Puzzle guess checker
  router.post('/games/check-word', optionalAuth, (req, res) => {
    const { puzzleId, guess, revealAnswer } = req.body ?? {};
    if (typeof puzzleId !== 'string' || typeof guess !== 'string') {
      res.status(400).json({ error: 'puzzleId and guess are required.' });
      return;
    }
    const puzzle = TECH_WORD_PUZZLES.find((p) => p.id === puzzleId);
    if (!puzzle) {
      res.status(404).json({ error: 'Word puzzle not found.' });
      return;
    }

    const cleanGuess = guess.trim().toUpperCase().replace(/[^A-Z]/g, '');
    const target = puzzle.word;
    const correct = cleanGuess === target;

    const exactMatches: boolean[] = [];
    const presentLetters: boolean[] = [];
    for (let i = 0; i < target.length; i++) {
      const ch = cleanGuess[i] || '';
      const isExact = ch === target[i];
      exactMatches.push(isExact);
      presentLetters.push(!isExact && ch !== '' && target.includes(ch));
    }

    res.json({
      correct,
      exactMatches,
      presentLetters,
      answer: correct || revealAnswer ? target : undefined,
      hint: puzzle.hint,
    });
  });

  // Tech Word Puzzle reveal one letter hint
  router.post('/games/word-hint', optionalAuth, (req, res) => {
    const { puzzleId, revealedIndices } = req.body ?? {};
    if (typeof puzzleId !== 'string') {
      res.status(400).json({ error: 'puzzleId is required.' });
      return;
    }
    const puzzle = TECH_WORD_PUZZLES.find((p) => p.id === puzzleId);
    if (!puzzle) {
      res.status(404).json({ error: 'Word puzzle not found.' });
      return;
    }

    const already = new Set<number>(
      Array.isArray(revealedIndices)
        ? revealedIndices.filter((n) => Number.isInteger(n) && n >= 0 && n < puzzle.word.length)
        : []
    );

    let chosenIndex = -1;
    for (let i = 0; i < puzzle.word.length; i++) {
      if (!already.has(i)) {
        chosenIndex = i;
        break;
      }
    }

    res.json({
      index: chosenIndex,
      letter: chosenIndex >= 0 ? puzzle.word[chosenIndex] : null,
      hint: puzzle.hint,
    });
  });

  // Verified server-side completion & XP/Badge recording
  router.post('/games/complete', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const { gameId, difficulty, category, durationSeconds, isDailyChallenge } = req.body ?? {};
    const safeDiff: DifficultyLevel =
      difficulty === 'hard' || difficulty === 'medium' ? difficulty : 'easy';

    try {
      if (
        gameId === 'brain_battle' ||
        gameId === 'code_quest' ||
        gameId === 'cyber_detective'
      ) {
        const { answers } = req.body ?? {};
        if (!Array.isArray(answers) || answers.length === 0 || answers.length > 25) {
          res.status(400).json({ error: 'Valid answers array is required.' });
          return;
        }
        const result = verifyAndRecordQuizSession(db, user.id, {
          gameId,
          category: typeof category === 'string' ? category.slice(0, 60) : 'All',
          difficulty: safeDiff,
          durationSeconds: Number(durationSeconds) || 30,
          isDailyChallenge: Boolean(isDailyChallenge),
          answers,
        });
        const profile = getUserGamificationProfile(db, user.id);
        res.status(201).json({ result, profile });
        return;
      }

      if (gameId === 'memory_master') {
        const { mode, moves, matchedPairIds } = req.body ?? {};
        const safeMode =
          mode === 'programming' || mode === 'icons' ? mode : 'terms';
        if (!Array.isArray(matchedPairIds)) {
          res.status(400).json({ error: 'matchedPairIds array is required.' });
          return;
        }
        const result = verifyAndRecordMemoryMaster(db, user.id, {
          mode: safeMode,
          difficulty: safeDiff,
          moves: Number(moves) || 6,
          durationSeconds: Number(durationSeconds) || 30,
          matchedPairIds,
        });
        const profile = getUserGamificationProfile(db, user.id);
        res.status(201).json({ result, profile });
        return;
      }

      if (gameId === 'tech_word_puzzle') {
        const { solvedEntries } = req.body ?? {};
        if (!Array.isArray(solvedEntries) || solvedEntries.length === 0) {
          res.status(400).json({ error: 'At least one solved word entry is required.' });
          return;
        }
        const result = verifyAndRecordWordPuzzle(db, user.id, {
          difficulty: safeDiff,
          durationSeconds: Number(durationSeconds) || 30,
          solvedEntries,
        });
        const profile = getUserGamificationProfile(db, user.id);
        res.status(201).json({ result, profile });
        return;
      }

      res.status(400).json({ error: 'Unknown gameId.' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'DAILY_ALREADY_COMPLETED') {
        res.status(409).json({
          error: 'Today’s Daily Challenge has already been completed. Try a category match or return tomorrow!',
        });
        return;
      }
      if (msg === 'NO_VALID_ANSWERS' || msg === 'INCOMPLETE_MEMORY_BOARD' || msg === 'NO_WORDS_SOLVED') {
        res.status(400).json({ error: 'Could not verify completed game requirements.' });
        return;
      }
      throw err;
    }
  });

  router.get('/games/leaderboard', (_req, res) => {
    const leaderboard = getLeaderboard(db);
    res.json(leaderboard);
  });

  router.get('/gamification/profile', requireAuth, (req: AuthenticatedRequest, res) => {
    const profile = getUserGamificationProfile(db, req.user!.id);
    res.json({ profile });
  });

  router.post('/explore/complete', requireAuth, (req: AuthenticatedRequest, res) => {
    const { sceneId, inspectedPartIds } = req.body ?? {};
    const validScene = EXPLORE_SCENES_META.some((s) => s.id === sceneId);
    if (!validScene) {
      res.status(400).json({ error: 'Invalid 3D Explore scene identifier.' });
      return;
    }
    if (!Array.isArray(inspectedPartIds)) {
      res.status(400).json({ error: 'inspectedPartIds must be an array.' });
      return;
    }

    const progress = recordExploreProgress(
      db,
      req.user!.id,
      sceneId as ExploreSceneId,
      inspectedPartIds
    );
    const profile = getUserGamificationProfile(db, req.user!.id);
    res.json({ progress, profile });
  });

  return router;
}
