/**
 * Utils - Export tất cả utilities
 */

// Fetch utilities
export { fetchAsBase64, fetchAsText, fetchAndConvertToTextBase64, isGeminiSupported, isTextConvertible } from "./fetch.js";

// Rate limit
export { checkRateLimit, markApiCall } from "./rateLimit.js";

// History (re-exports từ sub-modules)
export {
  saveToHistory,
  getHistory,
  clearHistory,
  saveResponseToHistory,
  saveToolResultToHistory,
  getRawHistory,
  isThreadInitialized,
  initThreadHistory,
  preloadAllHistory,
  countTokens,
} from "./history.js";

// User filter
export {
  isAllowedUser,
  addAllowedUserId,
  removeAllowedUserId,
  getAllowedUserIds,
  getUnauthorizedUsers,
} from "./userFilter.js";

// Rich text
export { parseRichText, createRichMessage } from "./richText.js";

// Logger
export {
  initFileLogger,
  enableFileLogging,
  debugLog,
  logMessage,
  logStep,
  logError,
  logAPI,
  logAIResponse,
  logAIHistory,
  logZaloAPI,
  getSessionDir,
} from "./logger.js";

// Message store
export {
  saveSentMessage,
  getSentMessage,
  removeSentMessage,
  cleanupOldMessages,
} from "./messageStore.js";

// Task manager
export { startTask, abortTask } from "./taskManager.js";

// Token counter
export { isSupportedMime, filterUnsupportedMedia } from "./tokenCounter.js";

// History converter
export { toGeminiContent, getMediaUrl, getMimeType } from "./historyConverter.js";
