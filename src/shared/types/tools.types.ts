/**
 * Tool Types - Re-export từ core types
 *
 * File này giữ lại để backward compatibility
 */
export type {
  ITool as ToolDefinition,
  ToolParameter,
  ToolContext,
  ToolResult,
  ToolCall,
} from "../../core/types.js";
