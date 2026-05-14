import type {
  User,
  DailyPuzzle,
  UserProgress,
  Achievement,
  UserAchievement,
  LeaderboardEntry,
  PuzzleCategory,
  CategoryStats,
  ValidationResult,
} from './index';

// ----- Auth -----

export interface RegisterResponse {
  message: string;
  token: string;
  user: User;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

export interface MeResponse {
  user: User;
}

export interface LogoutResponse {
  message: string;
}

export interface UpdatePasswordResponse {
  success: boolean;
  message: string;
}

export interface UpdateProfileResponse {
  success: boolean;
  message: string;
  user: User;
}

export interface DetailedProfile extends Omit<User, 'favoriteCategoryId' | 'favoriteCategory'> {
  favoriteCategoryId?: string | null;
  favoriteCategory?: PuzzleCategory | null;
  createdAt: string;
  hasPassword: boolean;
  isGoogleUser: boolean;
  stats: {
    totalPuzzlesPlayed: number;
    totalSuggestions: number;
    totalAchievements: number;
  };
}

export interface GetProfileResponse {
  success: boolean;
  user: DetailedProfile;
}

export interface DeleteAccountResponse {
  success: boolean;
  message: string;
}

export interface UpdateFavoriteCategoryResponse {
  success: boolean;
  message: string;
}

// ----- Puzzle -----

export interface TodayPuzzleResponse {
  puzzle: DailyPuzzle;
  progress: UserProgress;
}

export interface SpecificPuzzleResponse {
  puzzle: DailyPuzzle;
  progress: UserProgress;
}

export type ValidateAnswersResponse = ValidationResult;
export type ValidateGridAnswersResponse = ValidationResult;

export type GetProgressResponse = UserProgress;

export interface AutoSolveResponse {
  answers: { [clueNumber: string]: string };
  completedClues: number[];
  validatedClues?: { [clueNumber: number]: boolean };
  isCompleted: boolean;
  autoSolved: boolean;
  validatedGrid?: unknown[][];
  results?: { [clueNumber: number]: boolean };
}

export interface GenerateCategoryPuzzleResponse {
  success: boolean;
  message: string;
  puzzleDate: string;
  wordCount: number;
}

export interface RecentCategoryPuzzleEntry {
  puzzleDate: string;
  categoryName: string;
  wordCount: number;
}

export interface RecentCategoryPuzzlesResponse {
  recentPuzzles: RecentCategoryPuzzleEntry[];
}

// ----- Achievement -----

export interface UserAchievementsResponse {
  achievements: UserAchievement[];
}

export interface AvailableAchievementsResponse {
  achievements: Achievement[];
}

export interface AchievementStatsResponse {
  totalEarned: number;
  totalAvailable: number;
  totalPoints: number;
  completionPercentage: number;
  recentAchievements: Array<{
    id: string;
    name: string;
    points: number;
    icon: string;
    earnedAt: string;
  }>;
}

// ----- Leaderboard -----

export interface Top100Response {
  leaderboard: LeaderboardEntry[];
  userRank?: LeaderboardEntry | null;
}

export interface UserRankResponse {
  userRank: LeaderboardEntry;
  usersAround: LeaderboardEntry[];
}

// ----- Suggestion -----

export interface SubmitSuggestionResponse {
  message: string;
  suggestion: {
    id: string;
    clueNumber: number;
    status: string;
    createdAt: string;
  };
}

export interface SuggestionEntry {
  id: string;
  puzzleId: string;
  puzzleDate: string;
  clueNumber: number;
  originalClue: string;
  originalAnswer: string;
  suggestedClue: string | null;
  suggestedAnswer: string | null;
  comments: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface MySuggestionsResponse {
  suggestions: SuggestionEntry[];
}

export interface AllSuggestionEntry extends SuggestionEntry {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  puzzle: {
    id: string;
    date: string;
    rows: number;
    cols: number;
    createdAt: string;
  };
}

export interface AllSuggestionsResponse {
  suggestions: AllSuggestionEntry[];
  total: number;
  limit: number;
  offset: number;
}

// ----- Categories -----

export interface CategoriesResponse {
  success: boolean;
  data: PuzzleCategory[];
  total: number;
}

export interface PopularCategoriesResponse {
  success: boolean;
  data: PuzzleCategory[];
}

export interface CategoryStatsResponse {
  success: boolean;
  data: CategoryStats;
}

export interface ToggleFavoriteCategoryResponse {
  isFavorite: boolean;
  categoryId: string | null;
  message: string;
}

export interface UserFavoriteCategoryResponse {
  data: { favoriteCategory: PuzzleCategory | null };
}

export interface UserFavoriteCategoriesResponse {
  data: {
    favoriteCategories: PuzzleCategory[];
    favoriteIds: string[];
  };
}

export interface CategoryWordEntry {
  word: string;
  clue: string;
  isCommon: boolean;
  length: number;
}

export interface CategoryWordsResponse {
  success: boolean;
  data: {
    category: string;
    totalWords: number;
    words: CategoryWordEntry[];
    pagination: {
      offset: number;
      limit: number;
      hasMore: boolean;
    };
  };
}

export interface CategoryPuzzleEntry {
  date: string;
  size: string;
  acrossClues: number;
  downClues: number;
  totalClues: number;
  createdAt: string;
  displayName: string;
}

export interface CategoryPuzzlesResponse {
  success: boolean;
  data: {
    category: string;
    puzzles: CategoryPuzzleEntry[];
  };
}
