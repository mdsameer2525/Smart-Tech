import { apiRequest } from './api';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type GameId =
  | 'brain_battle'
  | 'code_quest'
  | 'cyber_detective'
  | 'memory_master'
  | 'tech_word_puzzle';

export type ExploreSceneId =
  | 'solar_system'
  | 'human_anatomy'
  | 'computer_network'
  | 'chemistry_lab'
  | 'computer_architecture';

export interface ClientQuizQuestion {
  id: string;
  category: string;
  difficulty: DifficultyLevel;
  prompt: string;
  options: [string, string, string, string];
}

export interface ClientCodeQuestChallenge {
  id: string;
  language: 'C' | 'C++' | 'Python' | 'Java' | 'JavaScript';
  challengeType: 'Predict Output' | 'Find Error' | 'Complete Missing Code' | 'Logic Puzzle';
  difficulty: DifficultyLevel;
  title: string;
  code: string;
  prompt: string;
  options: [string, string, string, string];
}

export interface ClientCyberScenario {
  id: string;
  category:
    | 'Phishing Awareness'
    | 'Suspicious Messages'
    | 'Password Security'
    | 'Security Mistakes'
    | 'Network Security';
  difficulty: DifficultyLevel;
  title: string;
  artifactLabel: string;
  artifactContent: string;
  prompt: string;
  options: [string, string, string, string];
}

export interface MemoryPairItem {
  id: string;
  mode: 'terms' | 'programming' | 'icons';
  term: string;
  match: string;
  iconKey?: string;
}

export interface ClientWordPuzzle {
  id: string;
  length: number;
  category: string;
  difficulty: DifficultyLevel;
  clue: string;
  hint: string;
  letterPool: string[];
}

export interface BadgeStatus {
  key: string;
  title: string;
  description: string;
  category: 'Game Zone' | '3D Explore' | 'Mastery & Streak';
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface ExploreSceneMeta {
  id: ExploreSceneId;
  title: string;
  category: string;
  minPartsRequired: number;
  xpReward: number;
}

export interface GameBankResponse {
  dailyDate: string;
  categories: string[];
  brainBattle: ClientQuizQuestion[];
  dailyChallenge: ClientQuizQuestion[];
  codeQuest: ClientCodeQuestChallenge[];
  cyberDetective: ClientCyberScenario[];
  memoryPairs: MemoryPairItem[];
  wordPuzzles: ClientWordPuzzle[];
  badgeDefinitions: Array<{
    key: string;
    title: string;
    description: string;
    category: 'Game Zone' | '3D Explore' | 'Mastery & Streak';
  }>;
  exploreScenes: ExploreSceneMeta[];
}

export interface GamificationProfile {
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  challengesCompleted: number;
  dailyChallengeCompletedToday: boolean;
  badges: BadgeStatus[];
  personalBests: Array<{
    game_id: GameId;
    best_score: number;
    attempts: number;
    last_played_at: string;
  }>;
  recentScores: Array<{
    id: number;
    game_id: GameId;
    category: string;
    difficulty: DifficultyLevel;
    score: number;
    max_score: number;
    xp_earned: number;
    duration_seconds: number;
    is_daily_challenge: number;
    played_at: string;
  }>;
  exploreProgress: Array<{
    sceneId: ExploreSceneId;
    title: string;
    category: string;
    minPartsRequired: number;
    xpReward: number;
    inspectedParts: string[];
    completed: boolean;
    xpAwarded: number;
  }>;
}

export interface LeaderboardResponse {
  brainBattleTop: Array<{
    user_id: number;
    name: string;
    role: string;
    best_score: number;
    games_played: number;
    xp: number;
    level: number;
    current_streak: number;
  }>;
  xpTop: Array<{
    user_id: number;
    name: string;
    role: string;
    xp: number;
    level: number;
    current_streak: number;
    challenges_completed: number;
  }>;
}

export function fetchGameBank() {
  return apiRequest<GameBankResponse>('/games/bank');
}

export function checkQuizAnswer(
  gameId: 'brain_battle' | 'code_quest' | 'cyber_detective',
  questionId: string,
  selectedIndex: number
) {
  return apiRequest<{ correct: boolean; correctIndex: number; explanation: string }>(
    '/games/check-answer',
    {
      method: 'POST',
      body: JSON.stringify({ gameId, questionId, selectedIndex }),
    }
  );
}

export function checkWordGuess(puzzleId: string, guess: string, revealAnswer = false) {
  return apiRequest<{
    correct: boolean;
    exactMatches: boolean[];
    presentLetters: boolean[];
    answer?: string;
    hint: string;
  }>('/games/check-word', {
    method: 'POST',
    body: JSON.stringify({ puzzleId, guess, revealAnswer }),
  });
}

export function requestWordHint(puzzleId: string, revealedIndices: number[]) {
  return apiRequest<{ index: number; letter: string | null; hint: string }>('/games/word-hint', {
    method: 'POST',
    body: JSON.stringify({ puzzleId, revealedIndices }),
  });
}

export function submitGameCompletion(payload: Record<string, unknown>) {
  return apiRequest<{
    result: {
      score: number;
      maxScore: number;
      xpEarned: number;
      newBadges: string[];
      correctCount?: number;
      totalQuestions?: number;
      accuracyPct?: number;
    };
    profile: GamificationProfile;
  }>('/games/complete', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchLeaderboard() {
  return apiRequest<LeaderboardResponse>('/games/leaderboard');
}

export function fetchGamificationProfile() {
  return apiRequest<{ profile: GamificationProfile }>('/gamification/profile');
}

export function recordExploreCompletion(sceneId: ExploreSceneId, inspectedPartIds: string[]) {
  return apiRequest<{
    progress: {
      sceneId: ExploreSceneId;
      inspectedParts: string[];
      completed: boolean;
      xpEarned: number;
      newBadges: string[];
    };
    profile: GamificationProfile;
  }>('/explore/complete', {
    method: 'POST',
    body: JSON.stringify({ sceneId, inspectedPartIds }),
  });
}
