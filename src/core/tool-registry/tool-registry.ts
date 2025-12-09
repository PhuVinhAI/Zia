/**
 * Tool Registry - Quản lý và thực thi tools
 */

import { jsonrepair } from 'jsonrepair';
import { fixStuckTags } from '../../shared/utils/tagFixer.js';
import { debugLog } from '../logger/logger.js';
import { moduleManager } from '../plugin-manager/module-manager.js';
import type { ITool, ToolCall, ToolContext, ToolResult } from '../types.js';

// ═══════════════════════════════════════════════════
// TOOL PARSER - Parse tool calls từ AI response
// ═══════════════════════════════════════════════════

// Regex để tìm tool tag mở: [tool:name params] hoặc [tool:name]
const TOOL_OPEN_REGEX = /\[tool:(\w+)(?:\s+([^\]]*))?\]/gi;

/**
 * Parse parameters từ string format: param1="value1" param2="value2"
 * Hỗ trợ escaped quotes bên trong value: content="hello \"world\""
 */
function parseInlineParams(paramStr: string): Record<string, any> {
  const params: Record<string, any> = {};
  if (!paramStr) return params;

  // Regex hỗ trợ escaped quotes: "value with \"escaped\" quotes"
  const paramRegex = /(\w+)=(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|(\S+))/g;
  let match;

  while ((match = paramRegex.exec(paramStr)) !== null) {
    const key = match[1];
    let value = match[2] ?? match[3] ?? match[4];

    // Unescape các ký tự đã escape
    if (value && (match[2] !== undefined || match[3] !== undefined)) {
      value = value
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\');
    }

    if (value === 'true') params[key] = true;
    else if (value === 'false') params[key] = false;
    else if (!Number.isNaN(Number(value)) && value !== '') {
      const isLargeNumber = value.length > 15;
      const isIdField = /id$/i.test(key);
      // Giữ nguyên string cho phone number (bắt đầu bằng 0) và các field đặc biệt
      const isPhoneField = /phone/i.test(key);
      const startsWithZero = value.startsWith('0');
      params[key] =
        isLargeNumber || isIdField || isPhoneField || startsWithZero ? value : Number(value);
    } else {
      params[key] = value;
    }
  }

  return params;
}

/**
 * Parse JSON an toàn với jsonrepair
 * Detect và báo lỗi khi có field bị thiếu giá trị (vd: "data":} hoặc "data":,)
 */
function safeParseJson(jsonStr: string): Record<string, any> | null {
  // Detect pattern lỗi: "key": theo sau bởi } hoặc , hoặc ] (thiếu value)
  const missingValuePattern = /"(\w+)":\s*[,}\]]/g;
  const missingMatch = missingValuePattern.exec(jsonStr);
  if (missingMatch) {
    debugLog(
      'TOOL',
      `JSON missing value for field "${missingMatch[1]}": ${jsonStr.substring(0, 150)}...`,
    );
    // Vẫn thử repair nhưng log warning
  }

  try {
    // Thử parse trực tiếp trước
    return JSON.parse(jsonStr);
  } catch {
    try {
      // Dùng jsonrepair để sửa JSON bị lỗi
      const repaired = jsonrepair(jsonStr);
      debugLog(
        'TOOL',
        `JSON repaired: ${jsonStr.substring(0, 100)}... -> ${repaired.substring(0, 100)}...`,
      );
      return JSON.parse(repaired);
    } catch (e: any) {
      debugLog('TOOL', `JSON repair failed: ${e.message}`);
      return null;
    }
  }
}

/**
 * Tìm vị trí [/tool] đúng - bỏ qua những cái nằm trong JSON string
 * Trả về index trong text, hoặc -1 nếu không tìm thấy
 */
function findCloseTag(text: string): number {
  const closeTag = '[/tool]';
  let searchStart = 0;

  while (searchStart < text.length) {
    const closeIndex = text.indexOf(closeTag, searchStart);
    if (closeIndex === -1) return -1;

    // Kiểm tra xem [/tool] có nằm trong JSON string không
    // Đếm số dấu " không bị escape trước vị trí closeIndex
    const beforeClose = text.slice(0, closeIndex);
    let inString = false;
    let escapeNext = false;

    for (const char of beforeClose) {
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
      }
    }

    // Nếu không trong string -> đây là [/tool] thật
    if (!inString) {
      return closeIndex;
    }

    // Nếu trong string -> tìm tiếp
    searchStart = closeIndex + closeTag.length;
  }

  return -1;
}

/**
 * Parse tất cả tool calls từ AI response
 */
export function parseToolCalls(response: string): ToolCall[] {
  // Fix stuck tags trước khi parse
  const fixedResponse = fixStuckTags(response);

  const calls: ToolCall[] = [];
  let match;

  TOOL_OPEN_REGEX.lastIndex = 0;

  while ((match = TOOL_OPEN_REGEX.exec(fixedResponse)) !== null) {
    const toolName = match[1];
    const inlineParams = match[2] || '';
    const tagEnd = match.index + match[0].length;

    let params: Record<string, any> = {};
    let rawTag = match[0];

    // Kiểm tra xem có JSON body và [/tool] không
    const afterTag = fixedResponse.slice(tagEnd);
    const closeTagIndex = findCloseTag(afterTag);

    // Luôn parse inline params trước
    const inlineParsed = parseInlineParams(inlineParams);

    if (closeTagIndex !== -1) {
      // Có [/tool] -> extract JSON giữa tag mở và tag đóng
      const jsonSection = afterTag.slice(0, closeTagIndex).trim();
      rawTag = fixedResponse.slice(match.index, tagEnd + closeTagIndex + 7);

      if (jsonSection.startsWith('{')) {
        const parsed = safeParseJson(jsonSection);
        if (parsed) {
          // Merge inline params với JSON body (JSON body có priority cao hơn)
          params = { ...inlineParsed, ...parsed };
        } else {
          // Fallback to inline params only
          params = inlineParsed;
        }
      } else {
        params = inlineParsed;
      }

      // Di chuyển regex index qua [/tool] để không parse lại phần đã xử lý
      TOOL_OPEN_REGEX.lastIndex = tagEnd + closeTagIndex + 7;
    } else {
      // Không có [/tool] -> chỉ dùng inline params
      params = inlineParsed;
    }

    calls.push({ toolName, params, rawTag });
    debugLog('TOOL', `Parsed: ${toolName} with params: ${JSON.stringify(params)}`);
  }

  return calls;
}

/**
 * Kiểm tra response có chứa tool call không
 */
export function hasToolCalls(response: string): boolean {
  TOOL_OPEN_REGEX.lastIndex = 0;
  return TOOL_OPEN_REGEX.test(response);
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
 * Lấy thông tin thời gian hiện tại cho AI
 */
function getCurrentTimeInfo(): string {
  const now = new Date();
  const vnTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));

  const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const dayOfWeek = dayNames[vnTime.getDay()];

  const hours = vnTime.getHours().toString().padStart(2, '0');
  const minutes = vnTime.getMinutes().toString().padStart(2, '0');
  const day = vnTime.getDate().toString().padStart(2, '0');
  const month = (vnTime.getMonth() + 1).toString().padStart(2, '0');
  const year = vnTime.getFullYear();

  return `⏰ THỜI GIAN HIỆN TẠI (Múi giờ Việt Nam - UTC+7):
- Ngày: ${dayOfWeek}, ${day}/${month}/${year}
- Giờ: ${hours}:${minutes}
- Unix timestamp (ms): ${now.getTime()}`;
}

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
            `  - ${p.name} (${p.type}${p.required ? ', bắt buộc' : ', tùy chọn'}): ${p.description}`,
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

${getCurrentTimeInfo()}

Bạn có thể sử dụng các tool sau:

${toolDescriptions}

CÁCH GỌI TOOL:
- Cú pháp ngắn (không có body): [tool:tên_tool param1="giá_trị1" param2="giá_trị2"]
- Cú pháp JSON (có body): [tool:tên_tool]{"param1": "giá_trị1"}[/tool]

⚠️ QUAN TRỌNG: Thẻ đóng PHẢI là [/tool] (KHÔNG có tên tool!)
- ✅ ĐÚNG: [tool:createFile]{"filename":"test.docx"}[/tool]
- ❌ SAI: [tool:createFile]{"filename":"test.docx"}[/tool:createFile]

VÍ DỤ:
- Không có tham số: [tool:getUserInfo]
- Tham số inline: [tool:getAllFriends limit=10]
- Tham số JSON: [tool:createFile]{"filename":"report.docx","content":"Nội dung..."}[/tool]

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

/**
 * Generate prompt mô tả tools có sẵn - CHỈ các tools được chỉ định
 * Dùng cho background agent để giảm token usage
 * @param allowedToolNames - Danh sách tên tools được phép. Nếu rỗng → trả về tất cả tools
 */
export function generateToolsPromptFiltered(allowedToolNames: string[]): string {
  const allTools = moduleManager.getAllTools();

  // Nếu không có filter → trả về tất cả (như generateToolsPrompt)
  const tools =
    allowedToolNames.length > 0
      ? allTools.filter((tool) => allowedToolNames.includes(tool.name))
      : allTools;

  debugLog('TOOL', `Filtered tools: ${tools.length}/${allTools.length}`);

  const toolDescriptions = tools
    .map((tool) => {
      const paramsDesc = tool.parameters
        .map(
          (p) =>
            `  - ${p.name} (${p.type}${p.required ? ', bắt buộc' : ', tùy chọn'}): ${p.description}`,
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

${getCurrentTimeInfo()}

Bạn có thể sử dụng các tool sau:

${toolDescriptions}

CÁCH GỌI TOOL:
- Cú pháp ngắn (không có body): [tool:tên_tool param1="giá_trị1" param2="giá_trị2"]
- Cú pháp JSON (có body): [tool:tên_tool]{"param1": "giá_trị1"}[/tool]

⚠️ QUAN TRỌNG: Thẻ đóng PHẢI là [/tool] (KHÔNG có tên tool!)
- ✅ ĐÚNG: [tool:createFile]{"filename":"test.docx"}[/tool]
- ❌ SAI: [tool:createFile]{"filename":"test.docx"}[/tool:createFile]

VÍ DỤ:
- Không có tham số: [tool:getUserInfo]
- Tham số inline: [tool:getAllFriends limit=10]
- Tham số JSON: [tool:createFile]{"filename":"report.docx","content":"Nội dung..."}[/tool]

QUY TẮC:
1. Khi gọi tool, có thể kèm text thông báo ngắn
2. Sau khi tool trả kết quả, tiếp tục trả lời user
3. KHÔNG tự bịa thông tin, hãy dùng tool để lấy thông tin chính xác
`;
}
