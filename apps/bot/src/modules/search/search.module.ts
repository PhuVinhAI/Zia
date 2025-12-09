/**
 * Search Module - Web search, YouTube, weather, etc.
 */
import { BaseModule, type ITool, type ModuleMetadata } from '../../core/index.js';
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
} from './tools/index.js';

export class SearchModule extends BaseModule {
  readonly metadata: ModuleMetadata = {
    name: 'search',
    description: 'Web search, YouTube, weather, Steam, and currency tools',
    version: '1.0.0',
  };

  private _tools: ITool[] = [
    googleSearchTool,
    youtubeSearchTool,
    youtubeVideoTool,
    youtubeChannelTool,
    weatherTool,
    steamSearchTool,
    steamGameTool,
    steamTopTool,
    currencyConvertTool,
    currencyRatesTool,
  ];

  get tools(): ITool[] {
    return this._tools;
  }

  async onLoad(): Promise<void> {
    console.log(`[Search] 🔍 Loading ${this._tools.length} search tools`);
  }
}

export const searchModule = new SearchModule();
export * from './tools/index.js';
