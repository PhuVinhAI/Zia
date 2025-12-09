/**
 * Task Module - Code execution, math, scheduling
 */
import { BaseModule, type ITool, type ModuleMetadata } from '../../core/index.js';
import {
  createAppTool,
  executeCodeTool,
  flushLogsTool,
  scheduleTaskTool,
  solveMathTool,
} from './tools/index.js';

export class TaskModule extends BaseModule {
  readonly metadata: ModuleMetadata = {
    name: 'task',
    description: 'Task tools for code execution, math solving, and scheduling',
    version: '1.0.0',
  };

  private _tools: ITool[] = [
    createAppTool,
    solveMathTool,
    executeCodeTool,
    scheduleTaskTool,
    flushLogsTool,
  ];

  get tools(): ITool[] {
    return this._tools;
  }

  async onLoad(): Promise<void> {
    console.log(`[Task] ⚡ Loading ${this._tools.length} task tools`);
  }
}

export const taskModule = new TaskModule();
export * from './tools/index.js';
