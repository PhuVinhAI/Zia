/**
 * API Client - Kết nối với Bot API
 */
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:10000/api';
const API_KEY = process.env.NEXT_PUBLIC_BOT_API_KEY || '';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    ...(API_KEY && { Authorization: `Bearer ${API_KEY}` }),
  },
});

// Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Stats types
export interface StatsOverview {
  users: number;
  messages: number;
  memories: number;
  tasks: number;
  messagesLast24h: number;
  tasksByStatus: Record<string, number>;
  uptime: number;
  timestamp: string;
}

export interface MessageStats {
  date: string;
  role: string;
  count: number;
}

export interface ActiveThread {
  thread_id: string;
  message_count: number;
  last_activity: number;
}

// User types
export interface User {
  userId: string;
  name: string | null;
  role: 'admin' | 'user' | 'blocked';
  createdAt: Date;
}

// Task types
export interface Task {
  id: number;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  targetUserId: string | null;
  targetThreadId: string | null;
  payload: string;
  context: string | null;
  scheduledAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  retryCount: number;
  maxRetries: number;
  lastError: string | null;
  result: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Memory types
export interface Memory {
  id: number;
  content: string;
  type: 'conversation' | 'fact' | 'person' | 'preference' | 'task' | 'note';
  userId: string | null;
  userName: string | null;
  importance: number;
  createdAt: Date;
  lastAccessedAt: Date | null;
  accessCount: number;
  metadata: string | null;
}

// History types
export interface HistoryEntry {
  id: number;
  threadId: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

export interface Thread {
  thread_id: string;
  message_count: number;
  first_message: number;
  last_message: number;
}

// Settings type (partial)
export interface BotSettings {
  adminUserId: string;
  bot: {
    name: string;
    prefix: string;
    requirePrefix: boolean;
    rateLimitMs: number;
    maxTokenHistory: number;
    selfListen: boolean;
    logging: boolean;
    useStreaming: boolean;
    useCharacter: boolean;
    maxToolDepth: number;
    showToolCalls: boolean;
    allowNSFW: boolean;
    sleepMode: {
      enabled: boolean;
      sleepHour: number;
      wakeHour: number;
    };
  };
  modules: Record<string, boolean>;
  [key: string]: unknown;
}

// API functions
export const statsApi = {
  getOverview: () => api.get<ApiResponse<StatsOverview>>('/stats/overview'),
  getMessages: (days = 7) => api.get<ApiResponse<MessageStats[]>>(`/stats/messages?days=${days}`),
  getActiveThreads: (limit = 10) =>
    api.get<ApiResponse<ActiveThread[]>>(`/stats/active-threads?limit=${limit}`),
};

export const usersApiClient = {
  list: (params?: { page?: number; limit?: number; search?: string; role?: string }) =>
    api.get<PaginatedResponse<User>>('/users', { params }),
  get: (id: string) => api.get<ApiResponse<User>>(`/users/${id}`),
  update: (id: string, data: Partial<User>) => api.patch<ApiResponse<User>>(`/users/${id}`, data),
  block: (id: string) => api.post<ApiResponse<void>>(`/users/${id}/block`),
  unblock: (id: string) => api.post<ApiResponse<void>>(`/users/${id}/unblock`),
};

export const tasksApiClient = {
  list: (params?: { page?: number; limit?: number; status?: string; type?: string }) =>
    api.get<PaginatedResponse<Task>>('/tasks', { params }),
  get: (id: number) => api.get<ApiResponse<Task>>(`/tasks/${id}`),
  create: (data: { type: string; targetUserId?: string; targetThreadId?: string; payload: object; context?: string }) =>
    api.post<ApiResponse<Task>>('/tasks', data),
  cancel: (id: number) => api.post<ApiResponse<void>>(`/tasks/${id}/cancel`),
  retry: (id: number) => api.post<ApiResponse<void>>(`/tasks/${id}/retry`),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/tasks/${id}`),
};

export const memoriesApiClient = {
  list: (params?: { page?: number; limit?: number; type?: string; userId?: string; search?: string }) =>
    api.get<PaginatedResponse<Memory>>('/memories', { params }),
  getStats: () => api.get<ApiResponse<{ type: string; count: number }[]>>('/memories/stats'),
  get: (id: number) => api.get<ApiResponse<Memory>>(`/memories/${id}`),
  create: (data: Partial<Memory>) => api.post<ApiResponse<Memory>>('/memories', data),
  update: (id: number, data: Partial<Memory>) => api.patch<ApiResponse<Memory>>(`/memories/${id}`, data),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/memories/${id}`),
};

export const historyApiClient = {
  list: (params?: { page?: number; limit?: number; threadId?: string; role?: string }) =>
    api.get<PaginatedResponse<HistoryEntry>>('/history', { params }),
  getThreads: (limit = 50) => api.get<ApiResponse<Thread[]>>(`/history/threads?limit=${limit}`),
  getThread: (threadId: string, limit = 100) =>
    api.get<ApiResponse<HistoryEntry[]>>(`/history/thread/${threadId}?limit=${limit}`),
  deleteThread: (threadId: string) => api.delete<ApiResponse<void>>(`/history/thread/${threadId}`),
  deleteOld: (days = 30) => api.delete<ApiResponse<{ deleted: number }>>(`/history/old?days=${days}`),
};

export const settingsApiClient = {
  get: () => api.get<ApiResponse<BotSettings>>('/settings'),
  getSection: (key: string) => api.get<ApiResponse<unknown>>(`/settings/${key}`),
  update: (data: BotSettings) => api.put<ApiResponse<void>>('/settings', data),
  updateSection: (key: string, data: unknown) => api.patch<ApiResponse<unknown>>(`/settings/${key}`, data),
  reload: () => api.post<ApiResponse<void>>('/settings/reload'),
};

export const logsApiClient = {
  listFolders: () => api.get<ApiResponse<{ name: string; path: string }[]>>('/logs'),
  listFiles: (folder: string) =>
    api.get<ApiResponse<{ name: string; size: number; modified: string }[]>>(`/logs/${folder}`),
  getFile: (folder: string, file: string, lines = 100) =>
    api.get<ApiResponse<{ lines: string[]; totalLines: number; hasMore: boolean }>>(
      `/logs/${folder}/${file}?lines=${lines}`,
    ),
  getUnauthorized: () => api.get<ApiResponse<unknown[]>>('/logs/file/unauthorized'),
  deleteFolder: (folder: string) => api.delete<ApiResponse<void>>(`/logs/${folder}`),
};
