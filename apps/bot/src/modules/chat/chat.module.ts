/**
 * Chat Module - History và memory management tools
 */
import { BaseModule, type ITool, type ModuleMetadata } from '../../core/index.js';
import { clearHistoryTool, recallMemoryTool, saveMemoryTool } from './tools/index.js';

export class ChatModule extends BaseModule {
  readonly metadata: ModuleMetadata = {
    name: 'chat',
    description: 'Chat history and memory management tools',
    version: '1.0.0',
  };

  private _tools: ITool[] = [clearHistoryTool, saveMemoryTool, recallMemoryTool];

  get tools(): ITool[] {
    return this._tools;
  }

  async onLoad(): Promise<void> {
    console.log(`[Chat] 💬 Loading ${this._tools.length} chat tools`);
  }
}

export const chatModule = new ChatModule();
export * from './tools/index.js';
