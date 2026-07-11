/**
 * Chat Module - History management tools
 */
import { BaseModule, type ITool, type ModuleMetadata } from '../../core/index.js';
import { clearHistoryTool } from './tools/index.js';

export class ChatModule extends BaseModule {
  readonly metadata: ModuleMetadata = {
    name: 'chat',
    description: 'Chat history management tools',
    version: '1.0.0',
  };

  private _tools: ITool[] = [clearHistoryTool];

  get tools(): ITool[] {
    return this._tools;
  }

  async onLoad(): Promise<void> {
    console.log(`[Chat] 💬 Loading ${this._tools.length} chat tools`);
  }
}

export const chatModule = new ChatModule();
export * from './tools/index.js';
