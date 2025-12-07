/**
 * Utils - Export tất cả utilities
 */

// DateTime (Day.js-based)
export {
  add,
  dayjs,
  diff,
  diffMs,
  formatDate,
  formatDateTime,
  formatFileTimestamp,
  formatTime,
  fromNow,
  isValid,
  now,
  nowDate,
  parse,
  subtract,
  toNow,
} from './datetime.js';

// History (re-exports từ sub-modules)
export {
  clearHistory,
  countTokens,
  getHistory,
  getRawHistory,
  initThreadHistory,
  isThreadInitialized,
  preloadAllHistory,
  saveResponseToHistory,
  saveToHistory,
  saveToolResultToHistory,
} from './history/history.js';

// History converter
export {
  getMediaUrl,
  getMimeType,
  toGeminiContent,
} from './history/historyConverter.js';

// HTTP Client (Ky-based)
export {
  createHttpClient,
  fetchAndConvertToTextBase64,
  fetchAsBase64,
  fetchAsText,
  http,
  isGeminiSupported,
  isTextConvertible,
} from './httpClient.js';

// Markdown
export {
  type CodeBlock,
  getFileExtension,
  type MediaImage,
  type ParsedMarkdown,
  parseMarkdownToZalo,
} from './markdown/markdownToZalo.js';

// Message
export {
  getMaxMessageLength,
  needsChunking,
  splitMessage,
} from './message/messageChunker.js';

export {
  cleanupOldMessages,
  getSentMessage,
  removeSentMessage,
  saveSentMessage,
} from './message/messageStore.js';

// Task manager
export {
  abortTask,
  getAndClearAbortedMessages,
  hasAbortedMessages,
  saveAbortedMessages,
  startTask,
} from './taskManager.js';

// Token counter
export { filterUnsupportedMedia, isSupportedMime } from './tokenCounter.js';

// User store
export { clearCache, getUserRole } from './userStore.js';
