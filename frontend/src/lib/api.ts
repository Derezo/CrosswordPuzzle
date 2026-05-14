import axios from 'axios';
import type {
  AuthResponse,
  DailyPuzzle,
  UserProgress,
  ValidationResult,
  Achievement,
  LeaderboardEntry,
  PuzzleCategory,
  CategoryStats,
  RevealLetterResponse,
} from '@/types';
import type {
  LoginResponse,
  RegisterResponse,
  MeResponse,
  LogoutResponse,
  UpdatePasswordResponse,
  UpdateProfileResponse,
  GetProfileResponse,
  DeleteAccountResponse,
  UpdateFavoriteCategoryResponse,
  TodayPuzzleResponse,
  SpecificPuzzleResponse,
  AutoSolveResponse,
  GenerateCategoryPuzzleResponse,
  RecentCategoryPuzzlesResponse,
  UserAchievementsResponse,
  AvailableAchievementsResponse,
  AchievementStatsResponse,
  Top100Response,
  UserRankResponse,
  SubmitSuggestionResponse,
  MySuggestionsResponse,
  AllSuggestionsResponse,
  CategoriesResponse,
  PopularCategoriesResponse,
  CategoryStatsResponse,
  ToggleFavoriteCategoryResponse,
  UserFavoriteCategoryResponse,
  UserFavoriteCategoriesResponse,
  CategoryWordsResponse,
  CategoryPuzzlesResponse,
} from '@/types/api';

// Fail loud on missing NEXT_PUBLIC_API_URL in production builds. The dev
// fallback to localhost stays in place to keep the developer onboarding
// experience seamless.
const envApiUrl = process.env.NEXT_PUBLIC_API_URL;
if (process.env.NODE_ENV === 'production' && (!envApiUrl || envApiUrl.length === 0)) {
  throw new Error(
    'NEXT_PUBLIC_API_URL is required in production builds. Set it in the deploy environment before running `next build`/`next start`.'
  );
}
const API_BASE_URL = envApiUrl || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Important: send/receive the auth_token HttpOnly cookie set by the Google
  // OAuth callback so /api/auth/me works after the OAuth redirect.
  withCredentials: true,
});

// Auth is carried by the HttpOnly `auth_token` cookie (set by the backend on
// login/register/OAuth) and ridden along by axios `withCredentials: true`. No
// client-side token handling required.

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<AuthResponse> => {
    const response = await api.post<RegisterResponse>('/auth/register', data);
    return response.data;
  },

  login: async (data: {
    email: string;
    password: string;
  }): Promise<AuthResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', data);
    return response.data;
  },

  getCurrentUser: async (): Promise<MeResponse> => {
    const response = await api.get<MeResponse>('/auth/me');
    return response.data;
  },

  logout: async (): Promise<LogoutResponse> => {
    const response = await api.post<LogoutResponse>('/auth/logout');
    return response.data;
  },

  updatePassword: async (data: {
    currentPassword: string;
    password: string;
    confirmPassword: string;
  }): Promise<UpdatePasswordResponse> => {
    const response = await api.put<UpdatePasswordResponse>('/auth/update-password', data);
    return response.data;
  },

  updateProfile: async (data: {
    firstName: string;
    lastName: string;
    email: string;
  }): Promise<UpdateProfileResponse> => {
    const response = await api.put<UpdateProfileResponse>('/auth/update-profile', data);
    return response.data;
  },

  getProfile: async (): Promise<GetProfileResponse> => {
    const response = await api.get<GetProfileResponse>('/auth/profile');
    return response.data;
  },

  deleteAccount: async (): Promise<DeleteAccountResponse> => {
    const response = await api.delete<DeleteAccountResponse>('/auth/delete-account');
    return response.data;
  },

  updateFavoriteCategory: async (
    categoryId: string | null
  ): Promise<UpdateFavoriteCategoryResponse> => {
    const response = await api.put<UpdateFavoriteCategoryResponse>(
      '/auth/update-favorite-category',
      { categoryId }
    );
    return response.data;
  },
};

// Puzzle API
export const puzzleAPI = {
  getTodaysPuzzle: async (): Promise<{
    puzzle: DailyPuzzle;
    progress: UserProgress;
  }> => {
    const response = await api.get<TodayPuzzleResponse>('/puzzle/today');
    return response.data;
  },

  validateAnswers: async (data: {
    answers: { [clueNumber: string]: string };
    puzzleDate: string;
  }): Promise<ValidationResult> => {
    const response = await api.post<ValidationResult>('/puzzle/validate', data);
    return response.data;
  },

  validateGridAnswers: async (data: {
    gridData: Array<Array<{ letter: string; activeDirection?: 'across' | 'down' }>>;
    puzzleDate: string;
  }): Promise<ValidationResult> => {
    const response = await api.post<ValidationResult>('/puzzle/validate-grid', data);
    return response.data;
  },

  getProgress: async (date: string): Promise<UserProgress> => {
    const response = await api.get<UserProgress>(`/puzzle/progress/${date}`);
    return response.data;
  },

  autoSolve: async (puzzleDate: string): Promise<AutoSolveResponse> => {
    const response = await api.post<AutoSolveResponse>('/puzzle/auto-solve', { puzzleDate });
    return response.data;
  },

  generateCategoryPuzzle: async (
    categoryName: string
  ): Promise<GenerateCategoryPuzzleResponse> => {
    const response = await api.post<GenerateCategoryPuzzleResponse>(
      '/puzzle/generate-category',
      { categoryName }
    );
    return response.data;
  },

  getRecentCategoryPuzzles: async (): Promise<RecentCategoryPuzzlesResponse> => {
    const response = await api.get<RecentCategoryPuzzlesResponse>('/puzzle/recent-category');
    return response.data;
  },

  getSpecificPuzzle: async (date: string): Promise<{
    puzzle: DailyPuzzle;
    progress: UserProgress;
  }> => {
    const response = await api.get<SpecificPuzzleResponse>(`/puzzle/specific/${date}`);
    return response.data;
  },

  revealLetter: async (data: {
    puzzleDate: string;
    clueNumber: number;
  }): Promise<RevealLetterResponse> => {
    const response = await api.post<RevealLetterResponse>('/puzzle/reveal-letter', data);
    return response.data;
  },
};

// Achievement API
export const achievementAPI = {
  getUserAchievements: async (): Promise<UserAchievementsResponse> => {
    const response = await api.get<UserAchievementsResponse>('/achievement/user');
    return response.data;
  },

  getAvailableAchievements: async (): Promise<{ achievements: Achievement[] }> => {
    const response = await api.get<AvailableAchievementsResponse>('/achievement/available');
    return response.data;
  },

  getAchievementStats: async (): Promise<AchievementStatsResponse> => {
    const response = await api.get<AchievementStatsResponse>('/achievement/stats');
    return response.data;
  },
};

// Leaderboard API
export const leaderboardAPI = {
  getTop100: async (): Promise<{
    leaderboard: LeaderboardEntry[];
    userRank?: LeaderboardEntry;
  }> => {
    const response = await api.get<Top100Response>('/leaderboard/top100');
    // Normalize null to undefined for the public contract
    return {
      leaderboard: response.data.leaderboard,
      userRank: response.data.userRank ?? undefined,
    };
  },

  getUserRank: async (): Promise<UserRankResponse> => {
    const response = await api.get<UserRankResponse>('/leaderboard/user-rank');
    return response.data;
  },
};

// Suggestion API
export const suggestionAPI = {
  submitSuggestion: async (data: {
    puzzleDate: string;
    clueNumber: number;
    originalClue: string;
    originalAnswer: string;
    suggestedClue?: string;
    suggestedAnswer?: string;
    comments?: string;
  }): Promise<SubmitSuggestionResponse> => {
    const response = await api.post<SubmitSuggestionResponse>('/suggestion/submit', data);
    return response.data;
  },

  getMySuggestions: async (): Promise<MySuggestionsResponse> => {
    const response = await api.get<MySuggestionsResponse>('/suggestion/my-suggestions');
    return response.data;
  },

  getAllSuggestions: async (params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<AllSuggestionsResponse> => {
    const response = await api.get<AllSuggestionsResponse>('/suggestion/all', { params });
    return response.data;
  },
};

// Categories API
export const categoriesAPI = {
  getCategories: async (params?: {
    sortBy?: 'wordCount' | 'favoritesCount' | 'name';
    order?: 'asc' | 'desc';
    limit?: number;
    search?: string;
    activeOnly?: boolean;
  }): Promise<{ data: PuzzleCategory[]; total: number }> => {
    const response = await api.get<CategoriesResponse>('/categories', { params });
    return { data: response.data.data, total: response.data.total };
  },

  getPopularCategories: async (
    limit: number = 10
  ): Promise<{ data: PuzzleCategory[] }> => {
    const response = await api.get<PopularCategoriesResponse>('/categories/popular', {
      params: { limit },
    });
    return { data: response.data.data };
  },

  getCategoryStats: async (): Promise<{ data: CategoryStats }> => {
    const response = await api.get<CategoryStatsResponse>('/categories/stats');
    return { data: response.data.data };
  },

  toggleFavoriteCategory: async (
    categoryId: string
  ): Promise<ToggleFavoriteCategoryResponse> => {
    const response = await api.put<ToggleFavoriteCategoryResponse>(
      `/categories/${categoryId}/favorite`
    );
    return response.data;
  },

  getUserFavoriteCategory: async (): Promise<UserFavoriteCategoryResponse> => {
    const response = await api.get<UserFavoriteCategoryResponse>('/categories/user/favorite');
    return response.data;
  },

  getUserFavoriteCategories: async (): Promise<UserFavoriteCategoriesResponse> => {
    const response = await api.get<UserFavoriteCategoriesResponse>(
      '/categories/user/favorites'
    );
    return response.data;
  },

  getCategoryWords: async (
    categoryId: string,
    limit?: number,
    offset?: number
  ): Promise<CategoryWordsResponse> => {
    const params = new URLSearchParams();
    if (limit) params.set('limit', limit.toString());
    if (offset) params.set('offset', offset.toString());

    const response = await api.get<CategoryWordsResponse>(
      `/categories/${categoryId}/words?${params}`
    );
    return response.data;
  },

  getCategoryPuzzles: async (categoryId: string): Promise<CategoryPuzzlesResponse> => {
    const response = await api.get<CategoryPuzzlesResponse>(
      `/categories/${categoryId}/puzzles`
    );
    return response.data;
  },
};

export default api;
