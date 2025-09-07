export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  points: number;
}

export interface PuzzleCell {
  letter: string | null;
  number?: number;
  isBlocked: boolean;
}

export interface CrosswordClue {
  number: number;
  clue: string;
  direction: 'across' | 'down';
  startRow: number;
  startCol: number;
  length: number;
}

export interface DailyPuzzle {
  id: string;
  date: string;
  grid: PuzzleCell[][];
  clues: CrosswordClue[];
  size: { rows: number; cols: number };
}

export interface UserProgress {
  answers: { [clueNumber: string]: string };
  completedClues: number[];
  isCompleted: boolean;
  completedAt?: string;
  solveTime?: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  points: number;
  icon: string;
  earned?: boolean;
  earnedAt?: string;
}

export interface UserAchievement {
  id: string;
  achievement: Achievement;
  earnedAt: string;
  metadata?: any;
}

export interface LeaderboardEntry {
  rank: number;
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
  points: number;
  isCurrentUser?: boolean;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface ValidationResult {
  results: { [clueNumber: number]: boolean };
  newCompletedClues: number[];
  isCompleted: boolean;
  solveTime?: number;
  newAchievements?: UserAchievement[];
}