/**
 * Tool Registry - Đăng ký và quản lý tất cả tools
 */
import { ToolDefinition, ToolCall, ToolContext, ToolResult } from "./types.js";
import { getUserInfoTool } from "./getUserInfo.js";
import { getAllFriendsTool } from "./getAllFriends.js";
import { getFriendOnlinesTool } from "./getFriendOnlines.js";
import { sendCardTool } from "./sendCard.js";
import { sendLinkTool } from "./sendLink.js";
import { debugLog } from "../utils/logger.js";

// TVU Tools
import {
  tvuLoginTool,
  tvuStudentInfoTool,
  tvuSemestersTool,
  tvuScheduleTool,
  tvuGradesTool,
  tvuTuitionTool,
  tvuCurriculumTool,
  tvuNotificationsTool,
} from "./tvu/index.js";

// ═══════════════════════════════════════════════════
// TOOL REGISTRY
// ═══════════════════════════════════════════════════

// Đăng ký tất cả tools ở đây
const toolRegistry: Map<string, ToolDefinition> = new Map();

// Register Zalo tools
toolRegistry.set("getUserInfo", getUserInfoTool);
toolRegistry.set("getAllFriends", getAllFriendsTool);
toolRegistry.set("getFriendOnlines", getFriendOnlinesTool);
toolRegistry.set("sendCard", sendCardTool);
toolRegistry.set("sendLink", sendLinkTool);

// Register TVU tools
toolRegistry.set("tvuLogin", tvuLoginTool);
toolRegistry.set("tvuStudentInfo", tvuStudentInfoTool);
toolRegistry.set("tvuSemesters", tvuSemestersTool);
toolRegistry.set("tvuSchedule", tvuScheduleTool);
toolRegistry.set("tvuGrades", tvuGradesTool);
toolRegistry.set("tvuTuition", tvuTuitionTool);
toolRegistry.set("tvuCurriculum", tvuCurriculumTool);
toolRegistry.set("tvuNotifications", tvuNotificationsTool);

// Export danh sách tools
export const registeredTools = Array.from(toolRegistry.values());

// ═══════════════════════════════════════════════════
// TOOL PARSER - Parse tool calls từ AI response
// ═══════════════════════════════════════════════════

/**
 * Regex để parse tool call từ AI response
 * Format: [tool:toolName param1="value1" param2="value2"]
 * Hoặc: [tool:toolName]{"param1": "value1"}[/tool]
 */
const TOOL_CALL_REGEX =
  /\[tool:(\w+)(?:\s+([^\]]*))?\](?:\s*(\{[\s\S]*?\})\s*\[\/tool\])?/gi;

/**
 * Parse parameters từ string format: param1="value1" param2="value2"
 *
 * LƯU Ý: Không convert số lớn (>15 chữ số) thành Number vì JavaScript
 * sẽ mất precision. Giữ nguyên string cho userId, threadId, etc.
 */
function parseInlineParams(paramStr: string): Record<string, any> {
  const params: Record<string, any> = {};
  if (!paramStr) return params;

  // Match: key="value" hoặc key=value hoặc key=123
  const paramRegex = /(\w+)=(?:"([^"]*)"|'([^']*)'|(\S+))/g;
  let match;

  while ((match = paramRegex.exec(paramStr)) !== null) {
    const key = match[1];
    const value = match[2] ?? match[3] ?? match[4];

    // Try to parse as number or boolean
    if (value === "true") {
      params[key] = true;
    } else if (value === "false") {
      params[key] = false;
    } else if (!isNaN(Number(value)) && value !== "") {
      // QUAN TRỌNG: Không convert số lớn (>15 chữ số) thành Number
      // vì JavaScript Number sẽ mất precision (userId, threadId thường 18-19 chữ số)
      // Cũng giữ string nếu key chứa "id", "Id", "ID" để an toàn
      const isLargeNumber = value.length > 15;
      const isIdField = /id$/i.test(key);

      if (isLargeNumber || isIdField) {
        params[key] = value; // Giữ nguyên string
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

  // Reset regex lastIndex
  TOOL_CALL_REGEX.lastIndex = 0;

  while ((match = TOOL_CALL_REGEX.exec(response)) !== null) {
    const toolName = match[1];
    const inlineParams = match[2] || "";
    const jsonParams = match[3];

    let params: Record<string, any> = {};

    // Ưu tiên JSON params nếu có
    if (jsonParams) {
      try {
        params = JSON.parse(jsonParams);
      } catch (e) {
        debugLog("TOOL", `Failed to parse JSON params: ${jsonParams}`);
        params = parseInlineParams(inlineParams);
      }
    } else {
      params = parseInlineParams(inlineParams);
    }

    calls.push({
      toolName,
      params,
      rawTag: match[0],
    });

    debugLog(
      "TOOL",
      `Parsed tool call: ${toolName} with params: ${JSON.stringify(params)}`
    );
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
export async function executeTool(
  toolCall: ToolCall,
  context: ToolContext
): Promise<ToolResult> {
  const tool = toolRegistry.get(toolCall.toolName);

  if (!tool) {
    return {
      success: false,
      error: `Tool "${toolCall.toolName}" không tồn tại`,
    };
  }

  debugLog("TOOL", `Executing tool: ${toolCall.toolName}`);

  try {
    const result = await tool.execute(toolCall.params, context);
    debugLog(
      "TOOL",
      `Tool ${toolCall.toolName} result: ${JSON.stringify(result).substring(
        0,
        200
      )}`
    );
    return result;
  } catch (error: any) {
    debugLog("TOOL", `Tool ${toolCall.toolName} error: ${error.message}`);
    return {
      success: false,
      error: `Lỗi thực thi tool: ${error.message}`,
    };
  }
}

/**
 * Execute tất cả tool calls và trả về kết quả
 */
export async function executeAllTools(
  toolCalls: ToolCall[],
  context: ToolContext
): Promise<Map<string, ToolResult>> {
  const results = new Map<string, ToolResult>();

  for (const call of toolCalls) {
    const result = await executeTool(call, context);
    results.set(call.rawTag, result);
  }

  return results;
}

// ═══════════════════════════════════════════════════
// PROMPT GENERATOR - Tạo prompt mô tả tools cho AI
// ═══════════════════════════════════════════════════

/**
 * Generate prompt mô tả tất cả tools có sẵn
 */
export function generateToolsPrompt(): string {
  const toolDescriptions = registeredTools
    .map((tool) => {
      const paramsDesc = tool.parameters
        .map(
          (p) =>
            `  - ${p.name} (${p.type}${
              p.required ? ", bắt buộc" : ", tùy chọn"
            }): ${p.description}`
        )
        .join("\n");

      return `📌 ${tool.name}
Mô tả: ${tool.description}
Tham số:
${paramsDesc || "  (Không có tham số)"}`;
    })
    .join("\n\n");

  return `
═══════════════════════════════════════════════════
CUSTOM TOOLS - Công cụ tùy chỉnh
═══════════════════════════════════════════════════

Bạn có thể sử dụng các tool sau để lấy thông tin hoặc thực hiện hành động:

${toolDescriptions}

CÁCH GỌI TOOL:
- Cú pháp ngắn: [tool:tên_tool param1="giá_trị1" param2="giá_trị2"]
- Cú pháp JSON: [tool:tên_tool]{"param1": "giá_trị1", "param2": "giá_trị2"}[/tool]

VÍ DỤ:
- Lấy thông tin người đang chat: [tool:getUserInfo]
- Lấy thông tin user cụ thể: [tool:getUserInfo userId="123456789"]
- Lấy danh sách bạn bè: [tool:getAllFriends limit=10]

QUY TẮC QUAN TRỌNG:
1. Khi gọi tool, viết tag tool VÀ có thể kèm text thông báo ngắn (ví dụ: "Để mình kiểm tra nhé... [tool:getAllFriends]")
2. Sau khi tool trả kết quả, bạn sẽ nhận được kết quả trong [tool_result:...] và tiếp tục trả lời user
3. Nếu cần thông tin user (tên, giới tính...) để xưng hô, hãy gọi [tool:getUserInfo] trước
4. KHÔNG tự bịa thông tin, hãy dùng tool để lấy thông tin chính xác
5. Tool tags sẽ được ẩn khỏi tin nhắn gửi đi, user chỉ thấy text thông báo
`;
}

// Export types
export * from "./types.js";
