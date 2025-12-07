/**
 * System Module - Core system tools và tool registry
 */
import { BaseModule, type ITool, type ModuleMetadata } from '../../core/index.js';
import { createNoteTool, editNoteTool, getListBoardTool } from './tools/board.js';
import { clearHistoryTool } from './tools/clearHistory.js';
import { createAppTool } from './tools/createApp.js';
import { createChartTool } from './tools/createChart.js';
import { createFileTool } from './tools/createFile/index.js';
import { executeCodeTool } from './tools/executeCode.js';
import { flushLogsTool } from './tools/flushLogs.js';
import { freepikImageTool } from './tools/freepikImage.js';
import { getAllFriendsTool } from './tools/getAllFriends.js';
import { getFriendOnlinesTool } from './tools/getFriendOnlines.js';
import { getGroupMembersTool } from './tools/getGroupMembers.js';
import { getUserInfoTool } from './tools/getUserInfo.js';
import { googleSearchTool } from './tools/googleSearch.js';
import { recallMemoryTool, saveMemoryTool } from './tools/memory.js';
import { createPollTool, getPollDetailTool, lockPollTool, votePollTool } from './tools/poll.js';
import { createReminderTool, getReminderTool, removeReminderTool } from './tools/reminder.js';
import { scheduleTaskTool } from './tools/scheduleTask.js';
import { solveMathTool } from './tools/solveMath.js';
import { textToSpeechTool } from './tools/textToSpeech.js';
import { youtubeChannelTool, youtubeSearchTool, youtubeVideoTool } from './tools/youtube.js';

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
export * from './tools/memory.js';
