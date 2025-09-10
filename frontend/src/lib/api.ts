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
  if (token) {
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
    return response.data;
  },

  login: async (data: {
    email: string;
    password: string;
  }): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    localStorage.removeItem('token');
    return response.data;
  },
};

// Puzzle API
export const puzzleAPI = {
  getTodaysPuzzle: async (): Promise<{
    puzzle: DailyPuzzle;
    progress: UserProgress;
  }> => {
    const response = await api.get('/puzzle/today');
    return response.data;
  },

  validateAnswers: async (data: {
    answers: { [clueNumber: string]: string };
    puzzleDate: string;
  }): Promise<ValidationResult> => {
    const response = await api.post('/puzzle/validate', data);
    return response.data;
  },

  validateGridAnswers: async (data: {
    gridData: Array<Array<{letter: string, activeDirection?: 'across' | 'down'}>>;
    puzzleDate: string;
  }): Promise<ValidationResult> => {
    const response = await api.post('/puzzle/validate-grid', data);
    return response.data;
  },

  getProgress: async (date: string): Promise<UserProgress> => {
    const response = await api.get(`/puzzle/progress/${date}`);
    return response.data;
  },

  autoSolve: async (puzzleDate: string): Promise<{
    answers: { [clueNumber: string]: string };
    completedClues: number[];
    isCompleted: boolean;
    autoSolved: boolean;
  }> => {
    const response = await api.post('/puzzle/auto-solve', { puzzleDate });
    return response.data;
  },

  generateCategoryPuzzle: async (categoryName: string): Promise<{
    success: boolean;
    message: string;
    puzzleDate: string;
    wordCount: number;
  }> => {
    const response = await api.post('/puzzle/generate-category', { categoryName });
    return response.data;
  },

  getRecentCategoryPuzzles: async (): Promise<{
    recentPuzzles: Array<{
      puzzleDate: string;
      categoryName: string;
      wordCount: number;
    }>;
  }> => {
    const response = await api.get('/puzzle/recent-category');
    return response.data;
  },

  getSpecificPuzzle: async (date: string): Promise<{
    puzzle: DailyPuzzle;
    progress: UserProgress;
  }> => {
    const response = await api.get(`/puzzle/specific/${date}`);
    return response.data;
  },
};

// Achievement API
export const achievementAPI = {
  getUserAchievements: async () => {
    const response = await api.get('/achievement/user');
    return response.data;
  },

  getAvailableAchievements: async (): Promise<{ achievements: Achievement[] }> => {
    const response = await api.get('/achievement/available');
    return response.data;
  },

  getAchievementStats: async () => {
    const response = await api.get('/achievement/stats');
    return response.data;
  },
};

// Leaderboard API
export const leaderboardAPI = {
  getTop100: async (): Promise<{
    leaderboard: LeaderboardEntry[];
    userRank?: LeaderboardEntry;
  }> => {
    const response = await api.get('/leaderboard/top100');
    return response.data;
  },

  getUserRank: async () => {
    const response = await api.get('/leaderboard/user-rank');
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
  }) => {
    const response = await api.post('/suggestion/submit', data);
    return response.data;
  },

  getMySuggestions: async () => {
    const response = await api.get('/suggestion/my-suggestions');
    return response.data;
  },

  getAllSuggestions: async (params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await api.get('/suggestion/all', { params });
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
    const response = await api.get('/categories', { params });
    return response.data;
  },

  getPopularCategories: async (limit: number = 10): Promise<{ data: PuzzleCategory[] }> => {
    const response = await api.get('/categories/popular', { params: { limit } });
    return response.data;
  },

  getCategoryStats: async (): Promise<{ data: CategoryStats }> => {
    const response = await api.get('/categories/stats');
    return response.data;
  },

  toggleFavoriteCategory: async (categoryId: string): Promise<{
    isFavorite: boolean;
    categoryId: string | null;
    message: string;
  }> => {
    const response = await api.put(`/categories/${categoryId}/favorite`);
    return response.data;
  },

  getUserFavoriteCategory: async (): Promise<{
    data: { favoriteCategory: PuzzleCategory | null };
  }> => {
    const response = await api.get('/categories/user/favorite');
    return response.data;
  },
};

export default api;