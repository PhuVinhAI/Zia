/**
 * System Module - Core system tools
 */
import { BaseModule, type ITool, type ModuleMetadata } from '../../core/index.js';

// Import tools from sub-modules
import { clearHistoryTool, recallMemoryTool, saveMemoryTool } from './tools/chat/index.js';
import {
  createChartTool,
  createFileTool,
  freepikImageTool,
  textToSpeechTool,
} from './tools/media/index.js';
import {
  currencyConvertTool,
  currencyRatesTool,
  googleSearchTool,
  steamGameTool,
  steamSearchTool,
  steamTopTool,
  weatherTool,
  youtubeChannelTool,
  youtubeSearchTool,
  youtubeVideoTool,
} from './tools/search/index.js';
import {
  createNoteTool,
  createPollTool,
  createReminderTool,
  editNoteTool,
  forwardMessageTool,
  getAllFriendsTool,
  getFriendOnlinesTool,
  getGroupMembersTool,
  getListBoardTool,
  getPollDetailTool,
  getReminderTool,
  getUserInfoTool,
  lockPollTool,
  removeReminderTool,
  votePollTool,
} from './tools/social/index.js';
import {
  createAppTool,
  executeCodeTool,
  flushLogsTool,
  scheduleTaskTool,
  solveMathTool,
} from './tools/task/index.js';
import { qrCodeTool, urlShortenerTool } from './tools/utility/index.js';

export class SystemModule extends BaseModule {
  readonly metadata: ModuleMetadata = {
    name: 'system',
    description: 'Core system tools for chat, media, search, social, and task operations',
    version: '1.0.0',
  };

  private _tools: ITool[] = [
    // Social tools
    getUserInfoTool,
    getAllFriendsTool,
    getFriendOnlinesTool,
    getGroupMembersTool,
    forwardMessageTool,
    // Poll tools
    createPollTool,
    getPollDetailTool,
    votePollTool,
    lockPollTool,
    // Board/Note tools
    createNoteTool,
    getListBoardTool,
    editNoteTool,
    // Reminder tools
    createReminderTool,
    getReminderTool,
    removeReminderTool,
    // Media tools
    textToSpeechTool,
    freepikImageTool,
    createFileTool,
    createChartTool,
    // Search tools
    youtubeSearchTool,
    youtubeVideoTool,
    youtubeChannelTool,
    googleSearchTool,
    weatherTool,
    steamSearchTool,
    steamGameTool,
    steamTopTool,
    currencyConvertTool,
    currencyRatesTool,
    // Task tools
    createAppTool,
    solveMathTool,
    executeCodeTool,
    scheduleTaskTool,
    flushLogsTool,
    // Chat tools
    clearHistoryTool,
    saveMemoryTool,
    recallMemoryTool,
    // Utility tools
    qrCodeTool,
    urlShortenerTool,
  ];

  get tools(): ITool[] {
    return this._tools;
  }

  async onLoad(): Promise<void> {
    console.log(`[System] 🔧 Loading ${this._tools.length} system tools`);
  }
}

// Export singleton instance
export const systemModule = new SystemModule();

// Re-export tools for backward compatibility
export * from './tools/index.js';
export * from './tools/chat/memory.js';
