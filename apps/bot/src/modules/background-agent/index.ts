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

// Cron utilities
export {
  describeCron,
  getNextCronTime,
  isValidCron,
  matchesCron,
} from './cron.utils.js';

// Task repository
export {
  cancelTask,
  countTasksByStatus,
  createTask,
  getPendingTasks,
  getTaskById,
  rescheduleTask,
} from './task.repository.js';
