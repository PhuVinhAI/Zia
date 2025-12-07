/**
 * System Module - Core system tools và tool registry
 */
import { BaseModule, type ITool, type ModuleMetadata } from '../../core/index.js';
// Chat tools
import { clearHistoryTool } from './tools/chat/clearHistory.js';
import { recallMemoryTool, saveMemoryTool } from './tools/chat/memory.js';
// Media tools
import { createChartTool } from './tools/media/createChart.js';
import { createFileTool } from './tools/media/createFile/index.js';
import { freepikImageTool } from './tools/media/freepikImage.js';
import { textToSpeechTool } from './tools/media/textToSpeech.js';
// Search tools
import { googleSearchTool } from './tools/search/googleSearch.js';
import { youtubeChannelTool, youtubeSearchTool, youtubeVideoTool } from './tools/search/youtube.js';
// Social tools
import { createNoteTool, editNoteTool, getListBoardTool } from './tools/social/board.js';
import { getAllFriendsTool } from './tools/social/getAllFriends.js';
import { getFriendOnlinesTool } from './tools/social/getFriendOnlines.js';
import { getGroupMembersTool } from './tools/social/getGroupMembers.js';
import { getUserInfoTool } from './tools/social/getUserInfo.js';
import { createPollTool, getPollDetailTool, lockPollTool, votePollTool } from './tools/social/poll.js';
import { createReminderTool, getReminderTool, removeReminderTool } from './tools/social/reminder.js';
// Task tools
import { createAppTool } from './tools/task/createApp.js';
import { executeCodeTool } from './tools/task/executeCode.js';
import { flushLogsTool } from './tools/task/flushLogs.js';
import { scheduleTaskTool } from './tools/task/scheduleTask.js';
import { solveMathTool } from './tools/task/solveMath.js';

export class SystemModule extends BaseModule {
  readonly metadata: ModuleMetadata = {
    name: 'system',
    description:
      'Core system tools (user info, friends, messaging, TTS, Word document, Charts, Code execution, YouTube, Google Search)',
    version: '1.0.0',
  };

  private _tools: ITool[] = [
    getUserInfoTool,
    getAllFriendsTool,
    getFriendOnlinesTool,
    getGroupMembersTool,
    textToSpeechTool,
    freepikImageTool,
    createAppTool,
    createFileTool,
    createChartTool,
    solveMathTool,
    executeCodeTool,
    youtubeSearchTool,
    youtubeVideoTool,
    youtubeChannelTool,
    googleSearchTool,
    clearHistoryTool,
    // Memory tools
    saveMemoryTool,
    recallMemoryTool,
    // Background agent
    scheduleTaskTool,
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
    // Admin tools
    flushLogsTool,
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
