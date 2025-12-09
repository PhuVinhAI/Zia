/**
 * Social Module - User info, friends, groups, polls, reminders, group admin
 */
import { BaseModule, type ITool, type ModuleMetadata } from '../../core/index.js';
import {
  addGroupDeputyTool,
  addMemberTool,
  blockMemberTool,
  changeGroupAvatarTool,
  changeGroupNameTool,
  changeGroupOwnerTool,
  // Group Creation & Join
  createGroupTool,
  createNoteTool,
  createPollTool,
  createReminderTool,
  disableGroupLinkTool,
  disperseGroupTool,
  editNoteTool,
  enableGroupLinkTool,
  // Friend Request Tools
  findUserByPhoneTool,
  forwardMessageTool,
  getAllFriendsTool,
  getFriendOnlinesTool,
  // Group Admin Tools
  getGroupInfoTool,
  getGroupLinkDetailTool,
  getGroupLinkInfoTool,
  getGroupMembersTool,
  getListBoardTool,
  getPendingMembersTool,
  getPollDetailTool,
  getReminderTool,
  getUserInfoTool,
  joinGroupLinkTool,
  kickMemberTool,
  // Group Leave & Disperse (Destructive)
  leaveGroupTool,
  lockPollTool,
  removeGroupDeputyTool,
  removeReminderTool,
  reviewPendingMembersTool,
  sendFriendRequestTool,
  updateGroupSettingsTool,
  votePollTool,
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
    getGroupLinkDetailTool,
    enableGroupLinkTool,
    disableGroupLinkTool,
    getGroupLinkInfoTool,
    // Group Creation & Join
    createGroupTool,
    joinGroupLinkTool,
    // Group Leave & Disperse (Destructive)
    leaveGroupTool,
    disperseGroupTool,
    // Friend Request
    findUserByPhoneTool,
    sendFriendRequestTool,
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
