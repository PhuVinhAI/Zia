/**
 * Tool Registry - Quản lý và thực thi tools
 */

import { debugLog } from '../logger/logger.js';
import { moduleManager } from '../plugin-manager/module-manager.js';
import type { ITool, ToolCall, ToolContext, ToolResult } from '../types.js';

// ═══════════════════════════════════════════════════
// TOOL PARSER - Parse tool calls từ AI response
// ═══════════════════════════════════════════════════

const TOOL_CALL_REGEX = /\[tool:(\w+)(?:\s+([^\]]*))?\](?:\s*(\{[\s\S]*?\})\s*\[\/tool\])?/gi;

/**
 * Parse parameters từ string format: param1="value1" param2="value2"
 */
function parseInlineParams(paramStr: string): Record<string, any> {
  const params: Record<string, any> = {};
  if (!paramStr) return params;

  const paramRegex = /(\w+)=(?:"([^"]*)"|'([^']*)'|(\S+))/g;
  let match;

  while ((match = paramRegex.exec(paramStr)) !== null) {
    const key = match[1];
    const value = match[2] ?? match[3] ?? match[4];

    if (value === 'true') {
      params[key] = true;
    } else if (value === 'false') {
      params[key] = false;
    } else if (!Number.isNaN(Number(value)) && value !== '') {
      const isLargeNumber = value.length > 15;
      const isIdField = /id$/i.test(key);
      if (isLargeNumber || isIdField) {
        params[key] = value;
      } else {
        params[key] = Number(value);
      }
    } else {
      params[key] = value;
    }
  }

  return params;
}

/**
 * Parse tất cả tool calls từ AI response
 */
export function parseToolCalls(response: string): ToolCall[] {
  const calls: ToolCall[] = [];
  let match;

  TOOL_CALL_REGEX.lastIndex = 0;

  while ((match = TOOL_CALL_REGEX.exec(response)) !== null) {
    const toolName = match[1];
    const inlineParams = match[2] || '';
    const jsonParams = match[3];

    let params: Record<string, any> = {};

    if (jsonParams) {
      try {
        params = JSON.parse(jsonParams);
      } catch {
        debugLog('TOOL', `Failed to parse JSON params: ${jsonParams}`);
        params = parseInlineParams(inlineParams);
      }
    } else {
      params = parseInlineParams(inlineParams);
    }

    calls.push({ toolName, params, rawTag: match[0] });
    debugLog('TOOL', `Parsed: ${toolName} with params: ${JSON.stringify(params)}`);
  }

  return calls;
}

/**
 * Kiểm tra response có chứa tool call không
 */
export function hasToolCalls(response: string): boolean {
  TOOL_CALL_REGEX.lastIndex = 0;
  return TOOL_CALL_REGEX.test(response);
}

// ═══════════════════════════════════════════════════
// TOOL EXECUTOR
// ═══════════════════════════════════════════════════

/**
 * Execute một tool call
 */
export async function executeTool(toolCall: ToolCall, context: ToolContext): Promise<ToolResult> {
  const tool = moduleManager.getTool(toolCall.toolName);

  if (!tool) {
    return {
      success: false,
      error: `Tool "${toolCall.toolName}" không tồn tại`,
    };
  }

  debugLog('TOOL', `Executing: ${toolCall.toolName}`);

  try {
    const result = await tool.execute(toolCall.params, context);
    debugLog('TOOL', `Result: ${JSON.stringify(result).substring(0, 200)}`);
    return result;
  } catch (error: any) {
    debugLog('TOOL', `Error: ${error.message}`);
    return {
      success: false,
      error: `Lỗi thực thi tool: ${error.message}`,
    };
  }
}

/**
 * Execute tất cả tool calls
 */
export async function executeAllTools(
  toolCalls: ToolCall[],
  context: ToolContext,
): Promise<Map<string, ToolResult>> {
  const results = new Map<string, ToolResult>();

  for (const call of toolCalls) {
    const result = await executeTool(call, context);
    results.set(call.rawTag, result);
  }

  return results;
}

// ═══════════════════════════════════════════════════
// PROMPT GENERATOR
// ═══════════════════════════════════════════════════

/**
 * Generate prompt mô tả tất cả tools có sẵn
 */
export function generateToolsPrompt(): string {
  const tools = moduleManager.getAllTools();

  const toolDescriptions = tools
    .map((tool) => {
      const paramsDesc = tool.parameters
        .map(
          (p) =>
            `  - ${p.name} (${p.type}${
              p.required ? ', bắt buộc' : ', tùy chọn'
            }): ${p.description}`,
        )
        .join('\n');

      return `📌 ${tool.name}
Mô tả: ${tool.description}
Tham số:
${paramsDesc || '  (Không có tham số)'}`;
    })
    .join('\n\n');

  return `
═══════════════════════════════════════════════════
CUSTOM TOOLS - Công cụ tùy chỉnh
═══════════════════════════════════════════════════

Bạn có thể sử dụng các tool sau:

${toolDescriptions}

CÁCH GỌI TOOL:
- Cú pháp ngắn: [tool:tên_tool param1="giá_trị1" param2="giá_trị2"]
- Cú pháp JSON: [tool:tên_tool]{"param1": "giá_trị1"}[/tool]

VÍ DỤ:
- Lấy thông tin người đang chat: [tool:getUserInfo]
- Lấy danh sách bạn bè: [tool:getAllFriends limit=10]

QUY TẮC:
1. Khi gọi tool, có thể kèm text thông báo ngắn
2. Sau khi tool trả kết quả, tiếp tục trả lời user
3. KHÔNG tự bịa thông tin, hãy dùng tool để lấy thông tin chính xác
`;
}

/**
 * Lấy danh sách tất cả tools đã đăng ký
 */
export function getRegisteredTools(): ITool[] {
  return moduleManager.getAllTools();
}
