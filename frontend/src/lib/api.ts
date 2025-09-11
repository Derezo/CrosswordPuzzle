import axios from 'axios';
import { AuthResponse, DailyPuzzle, UserProgress, ValidationResult, Achievement, LeaderboardEntry, PuzzleCategory, CategoryStats } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
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
    const response = await api.post('/auth/register', data);
    return response.data as any
  },

  login: async (data: {
    email: string;
    password: string;
  }): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', data);
    return response.data as any
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data as any
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    localStorage.removeItem('token');
    return response.data as any
  },

  updatePassword: async (data: {
    currentPassword: string;
    password: string;
    confirmPassword: string;
  }) => {
    const response = await api.put('/auth/update-password', data);
    return response.data as any
  },

  updateProfile: async (data: {
    firstName: string;
    lastName: string;
    email: string;
  }) => {
    const response = await api.put('/auth/update-profile', data);
    return response.data as any
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data as any
  },

  deleteAccount: async () => {
    const response = await api.delete('/auth/delete-account');
    localStorage.removeItem('token');
    return response.data as any
  },

  updateFavoriteCategory: async (categoryId: string | null) => {
    const response = await api.put('/auth/update-favorite-category', { categoryId });
    return response.data as any
  },
};

// Puzzle API
export const puzzleAPI = {
  getTodaysPuzzle: async (): Promise<{
    puzzle: DailyPuzzle;
    progress: UserProgress;
  }> => {
    const response = await api.get('/puzzle/today');
    return response.data as any;
  },

  validateAnswers: async (data: {
    answers: { [clueNumber: string]: string };
    puzzleDate: string;
  }): Promise<ValidationResult> => {
    const response = await api.post('/puzzle/validate', data);
    return response.data as any;
  },

  validateGridAnswers: async (data: {
    gridData: Array<Array<{letter: string, activeDirection?: 'across' | 'down'}>>;
    puzzleDate: string;
  }): Promise<ValidationResult> => {
    const response = await api.post('/puzzle/validate-grid', data);
    return response.data as any;
  },

  getProgress: async (date: string): Promise<UserProgress> => {
    const response = await api.get(`/puzzle/progress/${date}`);
    return response.data as any;
  },

  autoSolve: async (puzzleDate: string): Promise<{
    answers: { [clueNumber: string]: string };
    completedClues: number[];
    isCompleted: boolean;
    autoSolved: boolean;
  }> => {
    const response = await api.post('/puzzle/auto-solve', { puzzleDate });
    return response.data as any;
  },

  generateCategoryPuzzle: async (categoryName: string): Promise<{
    success: boolean;
    message: string;
    puzzleDate: string;
    wordCount: number;
  }> => {
    const response = await api.post('/puzzle/generate-category', { categoryName });
    return response.data as any
  },

  getRecentCategoryPuzzles: async (): Promise<{
    recentPuzzles: Array<{
      puzzleDate: string;
      categoryName: string;
      wordCount: number;
    }>;
  }> => {
    const response = await api.get('/puzzle/recent-category');
    return response.data as any
  },

  getSpecificPuzzle: async (date: string): Promise<{
    puzzle: DailyPuzzle;
    progress: UserProgress;
  }> => {
    const response = await api.get(`/puzzle/specific/${date}`);
    return response.data as any
  },
};

// Achievement API
export const achievementAPI = {
  getUserAchievements: async () => {
    const response = await api.get('/achievement/user');
    return response.data as any
  },

  getAvailableAchievements: async (): Promise<{ achievements: Achievement[] }> => {
    const response = await api.get('/achievement/available');
    return response.data as any
  },

  getAchievementStats: async () => {
    const response = await api.get('/achievement/stats');
    return response.data as any
  },
};

// Leaderboard API
export const leaderboardAPI = {
  getTop100: async (): Promise<{
    leaderboard: LeaderboardEntry[];
    userRank?: LeaderboardEntry;
  }> => {
    const response = await api.get('/leaderboard/top100');
    return response.data as any
  },

  getUserRank: async () => {
    const response = await api.get('/leaderboard/user-rank');
    return response.data as any
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
  }) => {
    const response = await api.post('/suggestion/submit', data);
    return response.data as any
  },

  getMySuggestions: async () => {
    const response = await api.get('/suggestion/my-suggestions');
    return response.data as any
  },

  getAllSuggestions: async (params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await api.get('/suggestion/all', { params });
    return response.data as any
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
    const response = await api.get('/categories', { params });
    return response.data as any
  },

  getPopularCategories: async (limit: number = 10): Promise<{ data: PuzzleCategory[] }> => {
    const response = await api.get('/categories/popular', { params: { limit } });
    return response.data as any
  },

  getCategoryStats: async (): Promise<{ data: CategoryStats }> => {
    const response = await api.get('/categories/stats');
    return response.data as any
  },

  toggleFavoriteCategory: async (categoryId: string): Promise<{
    isFavorite: boolean;
    categoryId: string | null;
    message: string;
  }> => {
    const response = await api.put(`/categories/${categoryId}/favorite`);
    return response.data as any
  },

  getUserFavoriteCategory: async (): Promise<{
    data: { favoriteCategory: PuzzleCategory | null };
  }> => {
    const response = await api.get('/categories/user/favorite');
    return response.data as any
  },

  getUserFavoriteCategories: async (): Promise<{
    data: { 
      favoriteCategories: PuzzleCategory[];
      favoriteIds: string[];
    };
  }> => {
    const response = await api.get('/categories/user/favorites');
    return response.data as any
  },

  getCategoryWords: async (categoryId: string, limit?: number, offset?: number): Promise<{
    success: boolean;
    data: {
      category: string;
      totalWords: number;
      words: Array<{
        word: string;
        clue: string;
        isCommon: boolean;
        length: number;
      }>;
      pagination: {
        offset: number;
        limit: number;
        hasMore: boolean;
      };
    };
  }> => {
    const params = new URLSearchParams();
    if (limit) params.set('limit', limit.toString());
    if (offset) params.set('offset', offset.toString());
    
    const response = await api.get(`/categories/${categoryId}/words?${params}`);
    return response.data as any
  },

  getCategoryPuzzles: async (categoryId: string): Promise<{
    success: boolean;
    data: {
      category: string;
      puzzles: Array<{
        date: string;
        size: string;
        acrossClues: number;
        downClues: number;
        totalClues: number;
        createdAt: string;
        displayName: string;
      }>;
    };
  }> => {
    const response = await api.get(`/categories/${categoryId}/puzzles`);
    return response.data as any
  },
};

export default api;