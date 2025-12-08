/**
 * Tool Categories - Định nghĩa categories và core tools
 * Core tools luôn có trong system prompt
 * Extended tools chỉ được mô tả khi AI gọi describeTools
 */

import type { ToolCategory } from '../types.js';

// Re-export type for convenience
export type { ToolCategory } from '../types.js';

// Core tools - luôn có full description trong system prompt
export const CORE_TOOLS = [
  'describeTools', // Meta tool để query extended tools
  'googleSearch',
  'saveMemory',
  'recallMemory',
  'scheduleTask',
  'getUserInfo',
  'getGroupMembers',
] as const;

// Category descriptions - mô tả ngắn gọn cho AI biết category có gì
export const CATEGORY_DESCRIPTIONS: Record<ToolCategory, string> = {
  core: 'Các tool cơ bản luôn sẵn sàng (search, memory, user info)',
  media: 'Tạo file (docx, txt, code), biểu đồ, ảnh AI, text-to-speech, YouTube',
  social: 'Quản lý bạn bè, nhóm, poll, board/note, reminder, forward message',
  entertainment: 'Anime/manga (Jikan API), ảnh anime (Nekos), GIF (Giphy)',
  academic: 'Tra cứu thông tin sinh viên TVU (điểm, lịch học, học phí...)',
  task: 'Tạo app HTML, chạy code, giải toán, admin tools',
};

// Tools trong mỗi category (để AI biết khi gọi describeTools)
export const CATEGORY_TOOLS: Record<ToolCategory, string[]> = {
  core: ['describeTools', 'googleSearch', 'saveMemory', 'recallMemory', 'scheduleTask', 'getUserInfo', 'getGroupMembers'],
  media: [
    'createFile', 'createChart', 'freepikImage', 'textToSpeech',
    'youtubeSearch', 'youtubeVideo', 'youtubeChannel',
  ],
  social: [
    'getAllFriends', 'getFriendOnlines', 'forwardMessage',
    'createPoll', 'getPollDetail', 'votePoll', 'lockPoll',
    'createNote', 'getListBoard', 'editNote',
    'createReminder', 'getReminder', 'removeReminder',
  ],
  entertainment: [
    'jikanSearch', 'jikanDetails', 'jikanTop', 'jikanSeason',
    'jikanCharacters', 'jikanEpisodes', 'jikanGenres', 'jikanRecommendations',
    'nekosImages', 'giphyGif',
  ],
  academic: [
    'tvuLogin', 'tvuGrades', 'tvuSchedule', 'tvuSemesters',
    'tvuStudentInfo', 'tvuNotifications', 'tvuCurriculum', 'tvuTuition',
  ],
  task: ['createApp', 'executeCode', 'solveMath', 'clearHistory', 'flushLogs'],
};

/**
 * Kiểm tra tool có phải core tool không
 */
export function isCoreToolName(toolName: string): boolean {
  return (CORE_TOOLS as readonly string[]).includes(toolName);
}

/**
 * Lấy category của tool từ tên
 */
export function getToolCategory(toolName: string): ToolCategory {
  for (const [category, tools] of Object.entries(CATEGORY_TOOLS)) {
    if (tools.includes(toolName)) {
      return category as ToolCategory;
    }
  }
  return 'core'; // Default
}
