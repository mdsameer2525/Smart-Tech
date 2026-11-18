import Database from 'better-sqlite3';
import fs from 'fs';
import type { Server } from 'http';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../server/app.ts';
import { seedDatabaseIfEmpty } from '../server/database/seed.ts';

let server: Server;
let baseUrl = '';
let db: Database.Database;
let learnerToken = '';

beforeAll(async () => {
  db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  const schema = fs.readFileSync(path.resolve(process.cwd(), 'server/database/schema.sql'), 'utf-8');
  db.exec(schema);
  seedDatabaseIfEmpty(db);

  const app = createApp(db);
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        baseUrl = `http://127.0.0.1:${addr.port}`;
      }
      resolve();
    });
  });

  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'aarav@smarttech.edu', password: 'demo123' }),
  });
  const loginJson = (await loginRes.json()) as { token: string };
  learnerToken = loginJson.token;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  db.close();
});

describe('Game Zone & 3D Explore Gamification API', () => {
  it('returns sanitized challenge banks covering all 8 Brain Battle categories and 5 Code Quest languages without leaking answers', async () => {
    const res = await fetch(`${baseUrl}/api/games/bank`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      categories: string[];
      brainBattle: Array<Record<string, unknown>>;
      codeQuest: Array<{ language: string }>;
      cyberDetective: Array<Record<string, unknown>>;
      wordPuzzles: Array<Record<string, unknown>>;
      exploreScenes: Array<{ id: string }>;
    };

    expect(body.categories).toHaveLength(8);
    expect(body.brainBattle.length).toBeGreaterThanOrEqual(48);
    expect('correctIndex' in body.brainBattle[0]).toBe(false);

    const langs = new Set(body.codeQuest.map((c) => c.language));
    expect(langs.has('C')).toBe(true);
    expect(langs.has('C++')).toBe(true);
    expect(langs.has('Python')).toBe(true);
    expect(langs.has('Java')).toBe(true);
    expect(langs.has('JavaScript')).toBe(true);

    expect('word' in body.wordPuzzles[0]).toBe(false);
    expect(body.exploreScenes).toHaveLength(5);
  });

  it('checks single quiz answers immediately and awards server-verified XP, badges, and daily challenge guard', async () => {
    const checkRes = await fetch(`${baseUrl}/api/games/check-answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: 'brain_battle',
        questionId: 'bb-gk-e1',
        selectedIndex: 1,
      }),
    });
    expect(checkRes.status).toBe(200);
    const checkData = (await checkRes.json()) as { correct: boolean; explanation: string };
    expect(checkData.correct).toBe(true);
    expect(checkData.explanation.length).toBeGreaterThan(10);

    // Submit daily Brain Battle with one right answer and one wrong answer
    const bankRes = await fetch(`${baseUrl}/api/games/bank`);
    const bank = (await bankRes.json()) as {
      dailyChallenge: Array<{ id: string }>;
    };

    const answers = bank.dailyChallenge.map((q) => ({
      questionId: q.id,
      selectedIndex: 0,
    }));

    const completeRes = await fetch(`${baseUrl}/api/games/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${learnerToken}`,
      },
      body: JSON.stringify({
        gameId: 'brain_battle',
        category: 'Daily Challenge',
        difficulty: 'medium',
        durationSeconds: 30,
        isDailyChallenge: true,
        answers,
      }),
    });
    expect(completeRes.status).toBe(201);
    const completed = (await completeRes.json()) as {
      result: { xpEarned: number; totalQuestions: number };
      profile: { xp: number; dailyChallengeCompletedToday: boolean };
    };
    expect(completed.result.totalQuestions).toBe(5);
    expect(completed.result.xpEarned).toBeGreaterThan(0);
    expect(completed.profile.dailyChallengeCompletedToday).toBe(true);

    // Reject duplicate Daily Challenge submission on the same UTC day
    const dupRes = await fetch(`${baseUrl}/api/games/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${learnerToken}`,
      },
      body: JSON.stringify({
        gameId: 'brain_battle',
        difficulty: 'medium',
        durationSeconds: 20,
        isDailyChallenge: true,
        answers,
      }),
    });
    expect(dupRes.status).toBe(409);
  });

  it('verifies Tech Word Puzzle guesses server-side and tracks 3D Explore completion XP', async () => {
    const wordCheck = await fetch(`${baseUrl}/api/games/check-word`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ puzzleId: 'wp-e1', guess: 'CACHE' }),
    });
    expect(wordCheck.status).toBe(200);
    const wordData = (await wordCheck.json()) as { correct: boolean; answer?: string };
    expect(wordData.correct).toBe(true);
    expect(wordData.answer).toBe('CACHE');

    const saveWord = await fetch(`${baseUrl}/api/games/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${learnerToken}`,
      },
      body: JSON.stringify({
        gameId: 'tech_word_puzzle',
        difficulty: 'easy',
        durationSeconds: 25,
        solvedEntries: [{ puzzleId: 'wp-e1', guess: 'CACHE', hintsUsed: 0 }],
      }),
    });
    expect(saveWord.status).toBe(201);

    const exploreRes = await fetch(`${baseUrl}/api/explore/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${learnerToken}`,
      },
      body: JSON.stringify({
        sceneId: 'solar_system',
        inspectedPartIds: ['sun', 'mercury', 'earth', 'saturn'],
      }),
    });
    expect(exploreRes.status).toBe(200);
    const exploreBody = (await exploreRes.json()) as {
      progress: { completed: boolean; xpEarned: number; newBadges: string[] };
    };
    expect(exploreBody.progress.completed).toBe(true);
    expect(exploreBody.progress.xpEarned).toBe(75);
    expect(exploreBody.progress.newBadges).toContain('explorer_initiate');
  });

  it('exposes privacy-safe leaderboard without leaking user emails', async () => {
    const lbRes = await fetch(`${baseUrl}/api/games/leaderboard`);
    expect(lbRes.status).toBe(200);
    const lbText = await lbRes.text();
    expect(lbText).not.toContain('aarav@smarttech.edu');
    expect(lbText).not.toContain('password_hash');
  });
});
