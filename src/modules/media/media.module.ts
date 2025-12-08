/**
 * Media Module - Charts, files, images, TTS
 */
import { BaseModule, type ITool, type ModuleMetadata } from '../../core/index.js';
import {
  createChartTool,
  createFileTool,
  freepikImageTool,
  textToSpeechTool,
} from './tools/index.js';

export class MediaModule extends BaseModule {
  readonly metadata: ModuleMetadata = {
    name: 'media',
    description: 'Media creation tools for charts, documents, images, and TTS',
    version: '1.0.0',
  };

  private _tools: ITool[] = [createChartTool, createFileTool, freepikImageTool, textToSpeechTool];

  get tools(): ITool[] {
    return this._tools;
  }

  async onLoad(): Promise<void> {
    console.log(`[Media] 🎨 Loading ${this._tools.length} media tools`);
  }
}

export const mediaModule = new MediaModule();
export * from './tools/index.js';
