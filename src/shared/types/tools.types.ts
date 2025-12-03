/**
 * Tool Types - Re-export từ core types
 *
 * File này giữ lại để backward compatibility
 */
export type {
  ITool as ToolDefinition,
  ToolCall,
  ToolContext,
  ToolParameter,
  ToolResult,
} from '../../core/types.js';
