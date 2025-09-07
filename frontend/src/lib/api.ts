import axios from 'axios';
import { AuthResponse, DailyPuzzle, UserProgress, ValidationResult, Achievement, LeaderboardEntry } from '@/types';

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

export default api;