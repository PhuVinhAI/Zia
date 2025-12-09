/**
 * Config Schema - Zod validation cho settings.json
 */
import { z } from 'zod';

// Cloud Debug schema
const CloudDebugSchema = z.object({
  enabled: z.boolean().default(false),
  prefix: z.string().default('#bot'),
});

// Sleep Mode schema - Tự động offline theo giờ
export const SleepModeSchema = z.object({
  enabled: z.boolean().default(false),
  sleepHour: z.coerce.number().min(0).max(23).default(23), // Giờ bắt đầu ngủ (0-23)
  wakeHour: z.coerce.number().min(0).max(23).default(6), // Giờ thức dậy (0-23)
  checkIntervalMs: z.coerce.number().min(60000).default(1800000), // Interval check (default 30 phút)
});

// Maintenance Mode schema - Chế độ bảo trì
export const MaintenanceModeSchema = z.object({
  enabled: z.boolean().default(false),
  message: z.string().default('🔧 Bot đang trong chế độ bảo trì. Vui lòng thử lại sau!'),
});

// Bot config schema
export const BotConfigSchema = z.object({
  name: z.string().default('Trợ lý AI Zalo'),
  prefix: z.string().default('#bot'),
  requirePrefix: z.boolean().default(false),
  rateLimitMs: z.coerce.number().min(0).default(3000),
  maxTokenHistory: z.coerce.number().min(1000).default(300000),
  maxInputTokens: z.coerce.number().min(10000).default(200000),
  selfListen: z.boolean().default(true),
  logging: z.boolean().default(true),
  useStreaming: z.boolean().default(true),
  useCharacter: z.boolean().default(true),
  fileLogging: z.boolean().default(false),
  logFile: z.string().default('logs/bot.txt'),
  unauthorizedLogFile: z.string().default('logs/unauthorized.json'),
  maxToolDepth: z.coerce.number().min(1).max(50).default(10),
  showToolCalls: z.boolean().default(true),
  allowNSFW: z.boolean().default(false),
  cloudDebug: CloudDebugSchema.optional().default({
    enabled: false,
    prefix: '#bot',
  }),
  sleepMode: SleepModeSchema.optional().default({
    enabled: false,
    sleepHour: 23,
    wakeHour: 6,
    checkIntervalMs: 1800000,
  }),
  maintenanceMode: MaintenanceModeSchema.optional().default({
    enabled: false,
    message: '🔧 Bot đang trong chế độ bảo trì. Vui lòng thử lại sau!',
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
  chat: z.boolean().default(true),
  media: z.boolean().default(true),
  search: z.boolean().default(true),
  social: z.boolean().default(true),
  task: z.boolean().default(true),
  academic: z.boolean().default(true),
  entertainment: z.boolean().default(true),
});

// Stickers config schema
export const StickersConfigSchema = z.object({
  keywords: z.array(z.string()).default([]),
});

// Logger config schema
export const LoggerConfigSchema = z.object({
  maxLinesPerFile: z.coerce.number().min(100).default(1000),
  logCacheThreshold: z.coerce.number().min(100).default(1000),
});

// Reaction config schema
export const ReactionConfigSchema = z.object({
  debounceMs: z.coerce.number().min(500).default(2000),
});

// Friend request config schema
export const FriendRequestConfigSchema = z.object({
  autoAcceptDelayMinMs: z.coerce.number().min(1000).default(2000),
  autoAcceptDelayMaxMs: z.coerce.number().min(1000).default(5000),
});

// Background agent config schema
export const BackgroundAgentConfigSchema = z.object({
  pollIntervalMs: z.coerce.number().min(10000).default(90000),
  maxToolIterations: z.coerce.number().min(1).max(20).default(5),
  groupBatchSize: z.coerce.number().min(1).default(10),
  batchDelayMinMs: z.coerce.number().min(100).default(500),
  batchDelayMaxMs: z.coerce.number().min(100).default(1500),
  groqEnabled: z.boolean().default(true),
  // Danh sách tên tools được phép gửi cho Groq (giảm token usage)
  // Nếu rỗng → gửi tất cả tools (như cũ)
  allowedTools: z.array(z.string()).default([]),
});

// Message chunker config schema
export const MessageChunkerConfigSchema = z.object({
  maxMessageLength: z.coerce.number().min(500).default(1800),
});

// Message store config schema
export const MessageStoreConfigSchema = z.object({
  maxCachePerThread: z.coerce.number().min(5).default(20),
  cleanupIntervalMs: z.coerce.number().min(60000).default(1800000),
  recentMessageWindowMs: z.coerce.number().min(60000).default(300000),
  maxUndoTimeMs: z.coerce.number().min(30000).default(120000), // 2 phút - giới hạn thời gian thu hồi tin nhắn
});

// Jikan API config schema
export const JikanConfigSchema = z.object({
  rateLimitDelayMs: z.coerce.number().min(100).default(350),
  timeoutMs: z.coerce.number().min(1000).default(15000),
  retryLimit: z.coerce.number().min(1).max(10).default(3),
  backoffLimitMs: z.coerce.number().min(500).default(3000),
});

// ElevenLabs config schema
export const ElevenLabsConfigSchema = z.object({
  defaultVoiceId: z.string().default('fUjY9K2nAIwlALOwSiwc'),
  defaultModelId: z.string().default('eleven_v3'),
  defaultStability: z.coerce.number().min(0).max(1).default(0.5),
  defaultSimilarityBoost: z.coerce.number().min(0).max(1).default(0.75),
  defaultStyle: z.coerce.number().min(0).max(1).default(0.5),
});

// Giphy config schema
export const GiphyConfigSchema = z.object({
  timeoutMs: z.coerce.number().min(1000).default(15000),
  defaultLimit: z.coerce.number().min(1).max(50).default(10),
  defaultRating: z.string().default('g'),
  retryLimit: z.coerce.number().min(1).max(10).default(2),
});

// Nekos config schema
export const NekosConfigSchema = z.object({
  timeoutMs: z.coerce.number().min(1000).default(15000),
  retryLimit: z.coerce.number().min(1).max(10).default(2),
});

// Freepik config schema
export const FreepikConfigSchema = z.object({
  timeoutMs: z.coerce.number().min(1000).default(60000),
  pollMaxAttempts: z.coerce.number().min(1).default(30),
  pollIntervalMs: z.coerce.number().min(500).default(2000),
  retryLimit: z.coerce.number().min(1).max(10).default(2),
});

// Message sender config schema
export const MessageSenderConfigSchema = z.object({
  mediaDelayMs: z.coerce.number().min(100).default(300),
  chunkDelayMs: z.coerce.number().min(100).default(400),
});

// Markdown config schema
export const MarkdownConfigSchema = z.object({
  mermaidTimeoutMs: z.coerce.number().min(1000).default(30000),
  groupMediaSizeLimitMB: z.coerce.number().min(1).default(1),
});

// History config schema
export const HistoryConfigSchema = z.object({
  maxTrimAttempts: z.coerce.number().min(10).default(50),
  maxContextTokens: z.coerce.number().min(10000).default(300000),
  estimatedCharsPerToken: z.coerce.number().min(1).default(4),
});

// Memory config schema
export const MemoryConfigSchema = z.object({
  decayHalfLifeDays: z.coerce.number().min(1).default(30),
  accessBoostFactor: z.coerce.number().min(0).default(0.2),
  embeddingModel: z.string().default('gemini-embedding-001'),
});

// Database config schema
export const DatabaseConfigSchema = z.object({
  path: z.string().default('data/bot.db'),
  cleanupIntervalMs: z.coerce.number().min(60000).default(3600000),
  embeddingDim: z.coerce.number().min(1).default(768),
  cacheSize: z.coerce.number().min(1000).default(10000),
});

// TVU config schema
export const TvuConfigSchema = z.object({
  timeoutMs: z.coerce.number().min(1000).default(10000),
  retryLimit: z.coerce.number().min(1).max(10).default(2),
});

// Groq config schema
export const GroqConfigSchema = z.object({
  rateLimitCooldownMs: z.coerce.number().min(1000).default(60000),
});

// Response handler config schema
export const ResponseHandlerConfigSchema = z.object({
  reactionDelayMs: z.coerce.number().min(100).default(300),
  chunkDelayMs: z.coerce.number().min(100).default(300),
  stickerDelayMs: z.coerce.number().min(100).default(800),
  cardDelayMs: z.coerce.number().min(100).default(500),
  messageDelayMinMs: z.coerce.number().min(100).default(500),
  messageDelayMaxMs: z.coerce.number().min(100).default(1000),
  imageDelayMs: z.coerce.number().min(100).default(500),
});

// Group members fetch config schema
export const GroupMembersFetchConfigSchema = z.object({
  delayMinMs: z.coerce.number().min(100).default(300),
  delayMaxMs: z.coerce.number().min(100).default(800),
  errorDelayMinMs: z.coerce.number().min(100).default(500),
  errorDelayMaxMs: z.coerce.number().min(100).default(1000),
});

// Gemini AI config schema
export const GeminiConfigSchema = z.object({
  temperature: z.coerce.number().min(0).max(2).default(1),
  topP: z.coerce.number().min(0).max(1).default(0.95),
  maxOutputTokens: z.coerce.number().min(1000).default(65536),
  thinkingBudget: z.coerce.number().min(0).default(8192),
  models: z
    .array(z.string())
    .default([
      'models/gemini-flash-latest',
      'models/gemini-flash-lite-latest',
      'models/gemini-robotics-er-1.5-preview',
    ]),
  rateLimitMinuteMs: z.coerce.number().min(60000).default(120000),
  rateLimitDayMs: z.coerce.number().min(3600000).default(86400000),
});

// Groq models config schema
export const GroqModelsConfigSchema = z.object({
  primary: z.string().default('openai/gpt-oss-120b'),
  fallback: z.string().default('moonshotai/kimi-k2-instruct-0905'),
  primaryMaxTokens: z.coerce.number().min(1000).default(65536),
  fallbackMaxTokens: z.coerce.number().min(1000).default(16384),
  temperature: z.coerce.number().min(0).max(2).default(0.7),
  topP: z.coerce.number().min(0).max(1).default(0.95),
});

// Sandbox config schema
export const SandboxConfigSchema = z.object({
  installTimeoutMs: z.coerce.number().min(10000).default(60000),
  executeTimeoutMs: z.coerce.number().min(5000).default(30000),
});

// Cloud Backup config schema
export const CloudBackupConfigSchema = z.object({
  enabled: z.boolean().default(true),
  throttleMs: z.coerce.number().min(5000).default(10000), // 10 giây throttle - backup ngay, sau đó chờ 10s mới backup tiếp
  restoreDelayMs: z.coerce.number().min(5000).default(15000), // 15 giây delay trước restore
  initialBackupDelayMs: z.coerce.number().min(5000).default(30000), // 30 giây sau start
});

// Full settings schema
export const SettingsSchema = z.object({
  adminUserId: z.string().default(''),
  bot: BotConfigSchema.optional().default({
    name: 'Trợ lý AI Zalo',
    prefix: '#bot',
    requirePrefix: false,
    rateLimitMs: 3000,
    maxTokenHistory: 300000,
    maxInputTokens: 200000,
    selfListen: true,
    logging: true,
    useStreaming: true,
    useCharacter: true,
    fileLogging: false,
    logFile: 'logs/bot.txt',
    unauthorizedLogFile: 'logs/unauthorized.json',
    maxToolDepth: 10,
    showToolCalls: true,
    allowNSFW: false,
    cloudDebug: { enabled: false, prefix: '#bot' },
    sleepMode: { enabled: false, sleepHour: 23, wakeHour: 6, checkIntervalMs: 1800000 },
    maintenanceMode: { enabled: false, message: '🔧 Bot đang trong chế độ bảo trì. Vui lòng thử lại sau!' },
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
    chat: true,
    media: true,
    search: true,
    social: true,
    task: true,
    academic: true,
    entertainment: true,
  }),
  stickers: StickersConfigSchema.optional().default({
    keywords: [],
  }),
  allowedUserIds: z.array(z.string()).default([]),
  logger: LoggerConfigSchema.optional().default({
    maxLinesPerFile: 1000,
    logCacheThreshold: 1000,
  }),
  reaction: ReactionConfigSchema.optional().default({
    debounceMs: 2000,
  }),
  friendRequest: FriendRequestConfigSchema.optional().default({
    autoAcceptDelayMinMs: 2000,
    autoAcceptDelayMaxMs: 5000,
  }),
  backgroundAgent: BackgroundAgentConfigSchema.optional().default({
    pollIntervalMs: 90000,
    maxToolIterations: 5,
    groupBatchSize: 10,
    batchDelayMinMs: 500,
    batchDelayMaxMs: 1500,
    groqEnabled: true,
    allowedTools: [],
  }),
  messageChunker: MessageChunkerConfigSchema.optional().default({
    maxMessageLength: 1800,
  }),
  messageStore: MessageStoreConfigSchema.optional().default({
    maxCachePerThread: 20,
    cleanupIntervalMs: 1800000,
    recentMessageWindowMs: 300000,
    maxUndoTimeMs: 120000,
  }),
  jikan: JikanConfigSchema.optional().default({
    rateLimitDelayMs: 350,
    timeoutMs: 15000,
    retryLimit: 3,
    backoffLimitMs: 3000,
  }),
  elevenlabs: ElevenLabsConfigSchema.optional().default({
    defaultVoiceId: 'fUjY9K2nAIwlALOwSiwc',
    defaultModelId: 'eleven_v3',
    defaultStability: 0.5,
    defaultSimilarityBoost: 0.75,
    defaultStyle: 0.5,
  }),
  giphy: GiphyConfigSchema.optional().default({
    timeoutMs: 15000,
    defaultLimit: 10,
    defaultRating: 'g',
    retryLimit: 2,
  }),
  nekos: NekosConfigSchema.optional().default({
    timeoutMs: 15000,
    retryLimit: 2,
  }),
  freepik: FreepikConfigSchema.optional().default({
    timeoutMs: 60000,
    pollMaxAttempts: 30,
    pollIntervalMs: 2000,
    retryLimit: 2,
  }),
  messageSender: MessageSenderConfigSchema.optional().default({
    mediaDelayMs: 300,
    chunkDelayMs: 400,
  }),
  markdown: MarkdownConfigSchema.optional().default({
    mermaidTimeoutMs: 30000,
    groupMediaSizeLimitMB: 1,
  }),
  history: HistoryConfigSchema.optional().default({
    maxTrimAttempts: 50,
    maxContextTokens: 300000,
    estimatedCharsPerToken: 4,
  }),
  memory: MemoryConfigSchema.optional().default({
    decayHalfLifeDays: 30,
    accessBoostFactor: 0.2,
    embeddingModel: 'gemini-embedding-001',
  }),
  tvu: TvuConfigSchema.optional().default({
    timeoutMs: 10000,
    retryLimit: 2,
  }),
  groq: GroqConfigSchema.optional().default({
    rateLimitCooldownMs: 60000,
  }),
  database: DatabaseConfigSchema.optional().default({
    path: 'data/bot.db',
    cleanupIntervalMs: 3600000,
    embeddingDim: 768,
    cacheSize: 10000,
  }),
  responseHandler: ResponseHandlerConfigSchema.optional().default({
    reactionDelayMs: 300,
    chunkDelayMs: 300,
    stickerDelayMs: 800,
    cardDelayMs: 500,
    messageDelayMinMs: 500,
    messageDelayMaxMs: 1000,
    imageDelayMs: 500,
  }),
  jikanRateLimitRetryMs: z.coerce.number().min(500).default(2000),
  websocketConnectTimeoutMs: z.coerce.number().min(500).default(2000),
  groupMembersFetch: GroupMembersFetchConfigSchema.optional().default({
    delayMinMs: 300,
    delayMaxMs: 800,
    errorDelayMinMs: 500,
    errorDelayMaxMs: 1000,
  }),
  gemini: GeminiConfigSchema.optional().default({
    temperature: 1,
    topP: 0.95,
    maxOutputTokens: 65536,
    thinkingBudget: 8192,
    models: [
      'models/gemini-flash-latest',
      'models/gemini-flash-lite-latest',
      'models/gemini-robotics-er-1.5-preview',
    ],
    rateLimitMinuteMs: 120000,
    rateLimitDayMs: 86400000,
  }),
  groqModels: GroqModelsConfigSchema.optional().default({
    primary: 'openai/gpt-oss-120b',
    fallback: 'moonshotai/kimi-k2-instruct-0905',
    primaryMaxTokens: 65536,
    fallbackMaxTokens: 16384,
    temperature: 0.7,
    topP: 0.95,
  }),
  sandbox: SandboxConfigSchema.optional().default({
    installTimeoutMs: 60000,
    executeTimeoutMs: 30000,
  }),
  cloudBackup: CloudBackupConfigSchema.optional().default({
    enabled: true,
    throttleMs: 10000,
    restoreDelayMs: 15000,
    initialBackupDelayMs: 30000,
  }),
});

// Type inference từ schema
export type BotConfig = z.infer<typeof BotConfigSchema>;
export type RetryConfig = z.infer<typeof RetryConfigSchema>;
export type HistoryLoaderConfig = z.infer<typeof HistoryLoaderSchema>;
export type BufferConfig = z.infer<typeof BufferConfigSchema>;
export type FetchConfig = z.infer<typeof FetchConfigSchema>;
export type ModulesConfig = z.infer<typeof ModulesConfigSchema>;
export type LoggerConfig = z.infer<typeof LoggerConfigSchema>;
export type ReactionConfig = z.infer<typeof ReactionConfigSchema>;
export type FriendRequestConfig = z.infer<typeof FriendRequestConfigSchema>;
export type BackgroundAgentConfig = z.infer<typeof BackgroundAgentConfigSchema>;
export type MessageChunkerConfig = z.infer<typeof MessageChunkerConfigSchema>;
export type MessageStoreConfig = z.infer<typeof MessageStoreConfigSchema>;
export type JikanConfig = z.infer<typeof JikanConfigSchema>;
export type ElevenLabsConfig = z.infer<typeof ElevenLabsConfigSchema>;
export type GiphyConfig = z.infer<typeof GiphyConfigSchema>;
export type NekosConfig = z.infer<typeof NekosConfigSchema>;
export type FreepikConfig = z.infer<typeof FreepikConfigSchema>;
export type MessageSenderConfig = z.infer<typeof MessageSenderConfigSchema>;
export type MarkdownConfig = z.infer<typeof MarkdownConfigSchema>;
export type HistoryConfig = z.infer<typeof HistoryConfigSchema>;
export type MemoryConfig = z.infer<typeof MemoryConfigSchema>;
export type TvuConfig = z.infer<typeof TvuConfigSchema>;
export type GroqConfig = z.infer<typeof GroqConfigSchema>;
export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;
export type ResponseHandlerConfig = z.infer<typeof ResponseHandlerConfigSchema>;
export type GroupMembersFetchConfig = z.infer<typeof GroupMembersFetchConfigSchema>;
export type GeminiConfig = z.infer<typeof GeminiConfigSchema>;
export type GroqModelsConfig = z.infer<typeof GroqModelsConfigSchema>;
export type SandboxConfig = z.infer<typeof SandboxConfigSchema>;
export type CloudBackupConfig = z.infer<typeof CloudBackupConfigSchema>;
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
