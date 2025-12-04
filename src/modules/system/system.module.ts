/**
 * System Module - Core system tools và tool registry
 */
import { BaseModule, type ITool, type ModuleMetadata } from '../../core/index.js';
import { createFileTool } from './tools/createFile/index.js';
import { freepikImageTool } from './tools/freepikImage.js';
import { getAllFriendsTool } from './tools/getAllFriends.js';
import { getFriendOnlinesTool } from './tools/getFriendOnlines.js';
import { getUserInfoTool } from './tools/getUserInfo.js';
import { textToSpeechTool } from './tools/textToSpeech.js';

export class SystemModule extends BaseModule {
  readonly metadata: ModuleMetadata = {
    name: 'system',
    description: 'Core system tools (user info, friends, messaging, TTS, Word document)',
    version: '1.0.0',
  };

  private _tools: ITool[] = [
    getUserInfoTool,
    getAllFriendsTool,
    getFriendOnlinesTool,
    textToSpeechTool,
    freepikImageTool,
    createFileTool,
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
