/**
 * Background Agent Module - Export public APIs
 */

// Agent runner
export {
  startBackgroundAgent,
  stopBackgroundAgent,
  isAgentRunning,
} from './agent.runner.js';

// Task repository
export {
  createTask,
  getPendingTasks,
  getTaskById,
  cancelTask,
  countTasksByStatus,
} from './task.repository.js';

// Context builder
export {
  buildEnvironmentContext,
  formatContextForPrompt,
  type EnvironmentContext,
} from './context.builder.js';

// Action executor
export { executeTask, type ExecutionResult } from './action.executor.js';
