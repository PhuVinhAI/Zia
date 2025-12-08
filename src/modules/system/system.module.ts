/**
 * System Module - Core utility tools
 */
import { BaseModule, type ITool, type ModuleMetadata } from '../../core/index.js';
import { qrCodeTool, urlShortenerTool } from './tools/utility/index.js';

export class SystemModule extends BaseModule {
  readonly metadata: ModuleMetadata = {
    name: 'system',
    description: 'Core utility tools (QR code, URL shortener)',
    version: '1.0.0',
  };

  private _tools: ITool[] = [qrCodeTool, urlShortenerTool];

  get tools(): ITool[] {
    return this._tools;
  }

  async onLoad(): Promise<void> {
    console.log(`[System] 🔧 Loading ${this._tools.length} utility tools`);
  }
}

export const systemModule = new SystemModule();
export * from './tools/utility/index.js';
