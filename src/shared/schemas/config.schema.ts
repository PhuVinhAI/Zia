/**
 * Config Schema - Zod validation cho settings.json
 */
import { z } from 'zod';

// Cloud Debug schema
const CloudDebugSchema = z.object({
  enabled: z.boolean().default(false),
  prefix: z.string().default('#bot'),
});

// Bot config schema
export const BotConfigSchema = z.object({
  name: z.string().default('Trợ lý AI Zalo'),
  prefix: z.string().default('#bot'),
  requirePrefix: z.boolean().default(false),
  rateLimitMs: z.coerce.number().min(0).default(3000),
  maxTokenHistory: z.coerce.number().min(1000).default(300000),
  selfListen: z.boolean().default(true),
  logging: z.boolean().default(true),
  useStreaming: z.boolean().default(true),
  useCharacter: z.boolean().default(true),
  fileLogging: z.boolean().default(false),
  logFile: z.string().default('logs/bot.txt'),
  unauthorizedLogFile: z.string().default('logs/unauthorized.json'),
  maxToolDepth: z.coerce.number().min(1).max(50).default(10),
  showToolCalls: z.boolean().default(true),
  cloudDebug: CloudDebugSchema.optional().default({
    enabled: false,
    prefix: '#bot',
  }),
});

// Retry config schema
export const RetryConfigSchema = z.object({
  maxRetries: z.coerce.number().min(1).max(20).default(3),
  baseDelayMs: z.coerce.number().min(100).default(2000),
  retryableStatusCodes: z.array(z.number()).default([503, 429, 500, 502, 504]),
});

// History loader config schema
export const HistoryLoaderSchema = z.object({
  enabled: z.boolean().default(true),
  loadFromDb: z.boolean().default(true),
  defaultLimit: z.coerce.number().min(1).default(100),
  minDelayMs: z.coerce.number().min(100).default(2000),
  maxDelayMs: z.coerce.number().min(100).default(5000),
  pageTimeoutMs: z.coerce.number().min(1000).default(10000),
  loadUser: z.boolean().default(true),
  loadGroup: z.boolean().default(false),
});

// Buffer config schema
export const BufferConfigSchema = z.object({
  delayMs: z.coerce.number().min(100).default(2500),
  typingRefreshMs: z.coerce.number().min(100).default(3000),
});

// Fetch config schema
export const FetchConfigSchema = z.object({
  timeoutMs: z.coerce.number().min(1000).default(60000),
  maxRetries: z.coerce.number().min(1).default(3),
  retryDelayMs: z.coerce.number().min(100).default(2000),
  maxTextConvertSizeMB: z.coerce.number().min(1).default(20),
});

// Modules config schema
export const ModulesConfigSchema = z.object({
  system: z.boolean().default(true),
  academic: z.boolean().default(true),
  entertainment: z.boolean().default(true),
});

// Stickers config schema
export const StickersConfigSchema = z.object({
  keywords: z.array(z.string()).default([]),
});

// Full settings schema
export const SettingsSchema = z.object({
  bot: BotConfigSchema.optional().default({
    name: 'Trợ lý AI Zalo',
    prefix: '#bot',
    requirePrefix: false,
    rateLimitMs: 3000,
    maxTokenHistory: 300000,
    selfListen: true,
    logging: true,
    useStreaming: true,
    useCharacter: true,
    fileLogging: false,
    logFile: 'logs/bot.txt',
    unauthorizedLogFile: 'logs/unauthorized.json',
    maxToolDepth: 10,
    showToolCalls: true,
    cloudDebug: { enabled: false, prefix: '#bot' },
  }),
  retry: RetryConfigSchema.optional().default({
    maxRetries: 3,
    baseDelayMs: 2000,
    retryableStatusCodes: [503, 429, 500, 502, 504],
  }),
  historyLoader: HistoryLoaderSchema.optional().default({
    enabled: true,
    loadFromDb: true,
    defaultLimit: 100,
    minDelayMs: 2000,
    maxDelayMs: 5000,
    pageTimeoutMs: 10000,
    loadUser: true,
    loadGroup: false,
  }),
  buffer: BufferConfigSchema.optional().default({
    delayMs: 2500,
    typingRefreshMs: 3000,
  }),
  fetch: FetchConfigSchema.optional().default({
    timeoutMs: 60000,
    maxRetries: 3,
    retryDelayMs: 2000,
    maxTextConvertSizeMB: 20,
  }),
  modules: ModulesConfigSchema.optional().default({
    system: true,
    academic: true,
    entertainment: true,
  }),
  stickers: StickersConfigSchema.optional().default({
    keywords: [],
  }),
  allowedUserIds: z.array(z.string()).default([]),
});

// Type inference từ schema
export type BotConfig = z.infer<typeof BotConfigSchema>;
export type RetryConfig = z.infer<typeof RetryConfigSchema>;
export type HistoryLoaderConfig = z.infer<typeof HistoryLoaderSchema>;
export type BufferConfig = z.infer<typeof BufferConfigSchema>;
export type FetchConfig = z.infer<typeof FetchConfigSchema>;
export type ModulesConfig = z.infer<typeof ModulesConfigSchema>;
export type Settings = z.infer<typeof SettingsSchema>;

// MIME types (static, không cần validate)
export const MIME_TYPES: Record<string, string> = {
  // Documents
  pdf: 'application/pdf',
  txt: 'text/plain',
  html: 'text/html',
  css: 'text/css',
  csv: 'text/csv',
  xml: 'application/xml',
  json: 'application/json',
  md: 'text/markdown',
  // Code
  js: 'text/javascript',
  ts: 'text/typescript',
  py: 'text/x-python',
  java: 'text/x-java',
  c: 'text/x-c',
  cpp: 'text/x-c++',
  cs: 'text/x-csharp',
  go: 'text/x-go',
  rb: 'text/x-ruby',
  php: 'text/x-php',
  swift: 'text/x-swift',
  kt: 'text/x-kotlin',
  rs: 'text/x-rust',
  // Images
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  // Audio
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  // Video
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
};
