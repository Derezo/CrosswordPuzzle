export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  points: number;
  favoriteCategoryId?: string;
  favoriteCategory?: PuzzleCategory;
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
  gridData?: unknown[][]; // Saved grid state
  completedClues: number[];
  // Per-clue boolean from the most recent Check & Save (or auto-solve). True =
  // word was validated correct; false = word was fully filled but wrong.
  // Missing entries mean the word hasn't been checked yet.
  validatedClues?: { [clueNumber: number]: boolean };
  // Cells that were exposed via the per-clue reveal-letter hint. Locked from
  // editing. Map of "row,col" -> the clueNumber the hint came from.
  revealedCells?: { [cellKey: string]: number };
  // True once any reveal happens. Suppresses achievement awards on this
  // puzzle (mirrors auto-solve).
  usedHints?: boolean;
  isCompleted: boolean;
  completedAt?: string;
  solveTime?: number;
  firstViewedAt?: string;
}

export interface RevealLetterResponse {
  row: number;
  col: number;
  letter: string;
  clueNumber: number;
  revealedCells: { [cellKey: string]: number };
  usedHints: true;
  dailyRevealCount: number;
  dailyCap: number;
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
  metadata?: unknown;
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
  // Persisted union of every clue ever checked (correct or incorrect). Survives
  // reload so red X / green ✓ pills stay accurate.
  validatedClues: { [clueNumber: number]: boolean };
  newCompletedClues: number[];
  completedClues: number[];
  isCompleted: boolean;
  solveTime?: number;
  newAchievements?: UserAchievement[];
  solvedClues: { [clueNumber: string]: string }; // For UI display only
  validatedGrid: unknown[][];  // The validated grid data
}

export interface PuzzleCategory {
  id: string;
  name: string;
  description?: string;
  wordCount: number;
  favoritesCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface CategoryStats {
  totalCategories: number;
  totalWords: number;
  totalFavorites: number;
  topCategory?: {
    name: string;
    wordCount: number;
  };
  mostPopular?: {
    name: string;
    favoritesCount: number;
  };
}