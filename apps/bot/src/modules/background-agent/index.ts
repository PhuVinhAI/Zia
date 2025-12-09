/**
 * Background Agent Module - Export public APIs
 */

// Action executor
export { type ExecutionResult, executeTask } from './action.executor.js';
// Agent runner
export {
  isAgentRunning,
  startBackgroundAgent,
  stopBackgroundAgent,
} from './agent.runner.js';

// Context builder
export {
  buildEnvironmentContext,
  type EnvironmentContext,
  formatContextForPrompt,
} from './context.builder.js';
// Task repository
export {
  cancelTask,
  countTasksByStatus,
  createTask,
  getPendingTasks,
  getTaskById,
} from './task.repository.js';
