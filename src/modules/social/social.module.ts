/**
 * Social Module - User info, friends, groups, polls, reminders, group admin
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
  // Group Admin Tools
  getGroupInfoTool,
  kickMemberTool,
  blockMemberTool,
  addMemberTool,
  getPendingMembersTool,
  reviewPendingMembersTool,
  updateGroupSettingsTool,
  changeGroupNameTool,
  changeGroupAvatarTool,
  addGroupDeputyTool,
  removeGroupDeputyTool,
  changeGroupOwnerTool,
  enableGroupLinkTool,
  disableGroupLinkTool,
  getGroupLinkInfoTool,
  // Group Creation & Join
  createGroupTool,
  joinGroupLinkTool,
  // Group Leave & Disperse (Destructive)
  leaveGroupTool,
  disperseGroupTool,
} from './tools/index.js';

export class SocialModule extends BaseModule {
  readonly metadata: ModuleMetadata = {
    name: 'social',
    description: 'Social tools for user info, friends, groups, polls, reminders, and group admin',
    version: '1.0.0',
  };

  private _tools: ITool[] = [
    // User & Friends
    getUserInfoTool,
    getAllFriendsTool,
    getFriendOnlinesTool,
    getGroupMembersTool,
    forwardMessageTool,
    // Poll
    createPollTool,
    getPollDetailTool,
    votePollTool,
    lockPollTool,
    // Board/Note
    createNoteTool,
    getListBoardTool,
    editNoteTool,
    // Reminder
    createReminderTool,
    getReminderTool,
    removeReminderTool,
    // Group Admin - Info
    getGroupInfoTool,
    // Group Admin - Member Management
    kickMemberTool,
    blockMemberTool,
    addMemberTool,
    getPendingMembersTool,
    reviewPendingMembersTool,
    // Group Admin - Settings
    updateGroupSettingsTool,
    changeGroupNameTool,
    changeGroupAvatarTool,
    // Group Admin - Roles
    addGroupDeputyTool,
    removeGroupDeputyTool,
    changeGroupOwnerTool,
    // Group Admin - Link
    enableGroupLinkTool,
    disableGroupLinkTool,
    getGroupLinkInfoTool,
    // Group Creation & Join
    createGroupTool,
    joinGroupLinkTool,
    // Group Leave & Disperse (Destructive)
    leaveGroupTool,
    disperseGroupTool,
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
