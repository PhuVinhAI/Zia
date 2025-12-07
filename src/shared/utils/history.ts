/**
 * History Module - Re-export từ các sub-modules
 *
 * Cấu trúc:
 * - tokenCounter.ts: Đếm token cho Gemini API
 * - historyConverter.ts: Convert Zalo messages sang Gemini format
 * - historyLoader.ts: Tải lịch sử từ Zalo API
 * - historyStore.ts: Lưu trữ và quản lý history
 */

// History converter
export {
  getMediaUrl,
  getMimeType,
  toGeminiContent,
} from './historyConverter.js';
// History loader
export {
  fetchFullHistory,
  getPaginationConfig,
  loadOldMessages,
} from './historyLoader.js';
// History store (main exports)
export {
  clearHistory,
  getCachedTokenCount,
  getHistory,
  getRawHistory,
  initThreadHistory,
  isThreadInitialized,
  preloadAllHistory,
  saveResponseToHistory,
  saveToHistory,
  saveToolResultToHistory,
} from './historyStore.js';
// Message store (database-backed)
export {
  getLastSentMessage,
  getSentMessage,
  removeSentMessage,
  saveSentMessage,
} from './messageStore.js';
// Token counter
export {
  checkInputTokens,
  countTokens,
  filterUnsupportedMedia,
  isSupportedMime,
  type TokenCheckResult,
} from './tokenCounter.js';
// User store (database-backed)
export {
  blockUser,
  getAdmins,
  getBlockedUsers,
  getUserRole,
  isAdmin,
  isBlocked,
  registerUser,
  setAdmin,
  unblockUser,
} from './userStore.js';
