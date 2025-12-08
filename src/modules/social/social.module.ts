/**
 * Social Module - User info, friends, groups, polls, reminders
 */
import { BaseModule, type ITool, type ModuleMetadata } from '../../core/index.js';
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
} from './tools/index.js';

export class SocialModule extends BaseModule {
  readonly metadata: ModuleMetadata = {
    name: 'social',
    description: 'Social tools for user info, friends, groups, polls, and reminders',
    version: '1.0.0',
  };

  private _tools: ITool[] = [
    getUserInfoTool,
    getAllFriendsTool,
    getFriendOnlinesTool,
    getGroupMembersTool,
    forwardMessageTool,
    createPollTool,
    getPollDetailTool,
    votePollTool,
    lockPollTool,
    createNoteTool,
    getListBoardTool,
    editNoteTool,
    createReminderTool,
    getReminderTool,
    removeReminderTool,
  ];

  get tools(): ITool[] {
    return this._tools;
  }

  async onLoad(): Promise<void> {
    console.log(`[Social] 👥 Loading ${this._tools.length} social tools`);
  }
}

export const socialModule = new SocialModule();
export * from './tools/index.js';
