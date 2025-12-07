import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { debugLog, logError } from '../../core/logger/logger.js';
import { MIME_TYPES, type Settings, SettingsSchema } from '../schemas/config.schema.js';

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

// Reload settings (hot reload)
export function reloadSettings() {
  try {
    debugLog('CONFIG', 'Reloading settings...');
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
    allowedUserIds: settings.allowedUserIds,
    retry: settings.retry,
    stickerKeywords: settings.stickers.keywords,
    historyLoader: settings.historyLoader,
    buffer: settings.buffer,
    fetch: settings.fetch,
    modules: settings.modules as Record<string, boolean>,
    mimeTypes: MIME_TYPES,
  };
}

// Watch file settings.json để auto reload
let debounceTimer: NodeJS.Timeout | null = null;
try {
  fs.watch(settingsPath, (eventType) => {
    if (eventType === 'change') {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        console.log('[Config] 🔄 Phát hiện thay đổi settings.json...');
        debugLog('CONFIG', 'settings.json changed, triggering reload');
        reloadSettings();
      }, 100);
    }
  });
  console.log('[Config] 👀 Đang watch settings.json để auto reload');
  debugLog('CONFIG', `Watching ${settingsPath} for changes`);
} catch (err) {
  console.warn('[Config] ⚠️ Không thể watch settings.json:', (err as Error).message);
  debugLog('CONFIG', `Failed to watch settings.json: ${(err as Error).message}`);
}

const settings = loadSettings();
export const CONFIG = buildConfig(settings);

export type { AIMessage, AIResponse } from '../types/config.schema.js';
export { DEFAULT_RESPONSE, parseAIResponse } from '../types/config.schema.js';
