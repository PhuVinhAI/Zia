/**
 * API Client - Kết nối với Bot API qua Next.js API Routes
 * Credentials được giữ server-side, không expose ra client
 */
import axios from 'axios';

// Gọi qua internal API route - credentials được xử lý server-side
const API_URL = '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
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

// Settings types
export interface SleepModeSettings {
  enabled: boolean;
  sleepHour: number;
  wakeHour: number;
  checkIntervalMs: number;
}

export interface MaintenanceModeSettings {
  enabled: boolean;
  message: string;
}

export interface CloudDebugSettings {
  enabled: boolean;
  prefix: string;
}

export interface BotConfig {
  name: string;
  prefix: string;
  requirePrefix: boolean;
  rateLimitMs: number;
  maxTokenHistory: number;
  maxInputTokens: number;
  selfListen: boolean;
  logging: boolean;
  useStreaming: boolean;
  useCharacter: boolean;
  fileLogging: boolean;
  maxToolDepth: number;
  showToolCalls: boolean;
  allowNSFW: boolean;
  cloudDebug: CloudDebugSettings;
  sleepMode: SleepModeSettings;
  maintenanceMode: MaintenanceModeSettings;
}

export interface GeminiConfig {
  temperature: number;
  topP: number;
  maxOutputTokens: number;
  thinkingBudget: number;
  models: string[];
  rateLimitMinuteMs: number;
  rateLimitDayMs: number;
}

export interface GroqModelsConfig {
  primary: string;
  fallback: string;
  primaryMaxTokens: number;
  fallbackMaxTokens: number;
  temperature: number;
  topP: number;
}

export interface BufferConfig {
  delayMs: number;
  typingRefreshMs: number;
}

export interface HistoryConfig {
  maxTrimAttempts: number;
  maxContextTokens: number;
  estimatedCharsPerToken: number;
}

export interface MemoryConfig {
  decayHalfLifeDays: number;
  accessBoostFactor: number;
  embeddingModel: string;
}

export interface CloudBackupConfig {
  enabled: boolean;
  throttleMs: number;
  restoreDelayMs: number;
  initialBackupDelayMs: number;
}

export interface BackgroundAgentConfig {
  pollIntervalMs: number;
  maxToolIterations: number;
  groupBatchSize: number;
  batchDelayMinMs: number;
  batchDelayMaxMs: number;
  groqEnabled: boolean;
  allowedTools: string[];
}

export interface BotSettings {
  adminUserId: string;
  bot: BotConfig;
  modules: Record<string, boolean>;
  gemini: GeminiConfig;
  groqModels: GroqModelsConfig;
  buffer: BufferConfig;
  history: HistoryConfig;
  memory: MemoryConfig;
  cloudBackup: CloudBackupConfig;
  backgroundAgent: BackgroundAgentConfig;
  allowedUserIds: string[];
  [key: string]: unknown;
}

// API functions
export const statsApi = {
  getOverview: () => api.get<ApiResponse<StatsOverview>>('/stats/overview'),
  getMessages: (days = 7) => api.get<ApiResponse<MessageStats[]>>(`/stats/messages?days=${days}`),
  getActiveThreads: (limit = 10) =>
    api.get<ApiResponse<ActiveThread[]>>(`/stats/active-threads?limit=${limit}`),
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
  list: (params?: { page?: number; limit?: number; userId?: string; search?: string }) =>
    api.get<PaginatedResponse<Memory>>('/memories', { params }),
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
  getDownloadUrl: (folder: string, file: string) => `/api/logs/download/${folder}/${file}`,
};

// Backup types
export interface BackupFile {
  name: string;
  size: number;
  createdAt: string;
  modifiedAt: string;
}

export interface DatabaseInfo {
  path: string;
  size: number;
  modifiedAt: string;
  tables: Record<string, number>;
}

export const backupApiClient = {
  list: () => api.get<ApiResponse<BackupFile[]>>('/backup'),
  create: () => api.post<ApiResponse<BackupFile>>('/backup'),
  restore: (name: string) => api.post<ApiResponse<{ restoredFrom: string; preRestoreBackup: string }>>(`/backup/restore/${name}`),
  delete: (name: string) => api.delete<ApiResponse<{ deleted: string }>>(`/backup/${name}`),
  getInfo: () => api.get<ApiResponse<DatabaseInfo>>('/backup/info'),
  getDownloadUrl: (name: string) => `/api/backup/download/${name}`,
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ApiResponse<BackupFile>>('/backup/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  resetDatabase: () => api.delete<ApiResponse<{ message: string; preDeleteBackup: string }>>('/backup/database'),
};
