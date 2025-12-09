import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { debugLog, logError } from '../../core/logger/logger.js';
import { MIME_TYPES, type Settings, SettingsSchema } from './config.schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../../');
const settingsPath = path.join(projectRoot, 'settings.json');

// Load và validate settings với Zod
function loadSettings(): Settings {
  debugLog('CONFIG', `Loading settings from ${settingsPath}`);
  const data = fs.readFileSync(settingsPath, 'utf-8');
  const rawSettings = JSON.parse(data);

  // Validate với Zod - tự động apply defaults
  const result = SettingsSchema.safeParse(rawSettings);
  if (!result.success) {
    console.error('[Config] ❌ Settings validation failed:');
    result.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    throw new Error('Invalid settings.json');
  }

  debugLog('CONFIG', `Settings loaded: ${JSON.stringify(result.data.bot)}`);
  return result.data;
}

// Reload settings từ Settings object (được gọi từ API)
export function reloadSettingsFromData(settings: Settings) {
  try {
    debugLog('CONFIG', 'Reloading settings from API data...');
    Object.assign(CONFIG, buildConfig(settings));
    console.log('[Config] ✅ Đã reload settings từ API');
    debugLog(
      'CONFIG',
      `Settings reloaded: ${JSON.stringify({
        name: CONFIG.name,
        prefix: CONFIG.prefix,
        useStreaming: CONFIG.useStreaming,
        allowedUserIds: CONFIG.allowedUserIds,
      })}`,
    );
  } catch (error) {
    console.error('[Config] ❌ Lỗi reload settings:', error);
    logError('reloadSettings', error);
  }
}

// Reload settings từ file (legacy, vẫn giữ để tương thích)
export function reloadSettings() {
  try {
    debugLog('CONFIG', 'Reloading settings from file...');
    const settings = loadSettings();
    Object.assign(CONFIG, buildConfig(settings));
    console.log('[Config] ✅ Đã reload settings');
    debugLog(
      'CONFIG',
      `Settings reloaded: ${JSON.stringify({
        name: CONFIG.name,
        prefix: CONFIG.prefix,
        useStreaming: CONFIG.useStreaming,
        allowedUserIds: CONFIG.allowedUserIds,
      })}`,
    );
  } catch (error) {
    console.error('[Config] ❌ Lỗi reload settings:', error);
    logError('reloadSettings', error);
  }
}

// Build CONFIG object từ validated settings
function buildConfig(settings: Settings) {
  return {
    // Admin settings
    adminUserId: settings.adminUserId,
    // Bot settings
    name: settings.bot.name,
    prefix: settings.bot.prefix,
    requirePrefix: settings.bot.requirePrefix,
    rateLimitMs: settings.bot.rateLimitMs,
    maxTokenHistory: settings.bot.maxTokenHistory,
    maxInputTokens: settings.bot.maxInputTokens,
    selfListen: settings.bot.selfListen,
    logging: settings.bot.logging,
    useStreaming: settings.bot.useStreaming,
    useCharacter: settings.bot.useCharacter,
    fileLogging: settings.bot.fileLogging,
    logFile: settings.bot.logFile,
    unauthorizedLogFile: settings.bot.unauthorizedLogFile,
    maxToolDepth: settings.bot.maxToolDepth,
    showToolCalls: settings.bot.showToolCalls,
    allowNSFW: settings.bot.allowNSFW,
    cloudDebug: settings.bot.cloudDebug,
    sleepMode: settings.bot.sleepMode,
    allowedUserIds: settings.allowedUserIds,
    retry: settings.retry,
    stickerKeywords: settings.stickers.keywords,
    historyLoader: settings.historyLoader,
    buffer: settings.buffer,
    fetch: settings.fetch,
    modules: settings.modules as Record<string, boolean>,
    mimeTypes: MIME_TYPES,
    // New configs
    logger: settings.logger,
    reaction: settings.reaction,
    friendRequest: settings.friendRequest,
    backgroundAgent: settings.backgroundAgent,
    messageChunker: settings.messageChunker,
    messageStore: settings.messageStore,
    userStore: settings.userStore,
    jikan: settings.jikan,
    elevenlabs: settings.elevenlabs,
    giphy: settings.giphy,
    nekos: settings.nekos,
    freepik: settings.freepik,
    messageSender: settings.messageSender,
    markdown: settings.markdown,
    history: settings.history,
    memory: settings.memory,
    tvu: settings.tvu,
    groq: settings.groq,
    database: settings.database,
    responseHandler: settings.responseHandler,
    jikanRateLimitRetryMs: settings.jikanRateLimitRetryMs,
    websocketConnectTimeoutMs: settings.websocketConnectTimeoutMs,
    groupMembersFetch: settings.groupMembersFetch,
    gemini: settings.gemini,
    groqModels: settings.groqModels,
    sandbox: settings.sandbox,
  };
}

// Không dùng file watcher nữa - sử dụng Settings API để reload
// API endpoint: POST /api/settings/reload hoặc PUT/PATCH /api/settings

const settings = loadSettings();
export const CONFIG = buildConfig(settings);

console.log('[Config] ✅ Settings loaded (use API to reload, no file watcher)');

export type { AIMessage, AIResponse } from '../../shared/types/config.schema.js';
export { DEFAULT_RESPONSE, parseAIResponse } from '../../shared/types/config.schema.js';

// Re-export types từ config.schema
export type {
  BackgroundAgentConfig,
  BotConfig,
  BufferConfig,
  DatabaseConfig,
  ElevenLabsConfig,
  FetchConfig,
  FreepikConfig,
  FriendRequestConfig,
  GeminiConfig,
  GiphyConfig,
  GroqConfig,
  GroqModelsConfig,
  GroupMembersFetchConfig,
  HistoryConfig,
  HistoryLoaderConfig,
  JikanConfig,
  LoggerConfig,
  MarkdownConfig,
  MemoryConfig,
  MessageChunkerConfig,
  MessageSenderConfig,
  MessageStoreConfig,
  ModulesConfig,
  NekosConfig,
  ReactionConfig,
  ResponseHandlerConfig,
  RetryConfig,
  SandboxConfig,
  Settings,
  TvuConfig,
  UserStoreConfig,
} from './config.schema.js';

export { MIME_TYPES, SettingsSchema } from './config.schema.js';
