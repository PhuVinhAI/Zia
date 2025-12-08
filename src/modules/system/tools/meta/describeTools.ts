/**
 * describeTools - Meta tool để AI query thông tin về tools
 * AI gọi tool này khi cần biết cách sử dụng tools trong một category
 */

import { moduleManager } from '../../../../core/plugin-manager/module-manager.js';
import type { ITool, ToolContext, ToolParameter, ToolResult } from '../../../../core/types.js';
import {
  CATEGORY_DESCRIPTIONS,
  CATEGORY_TOOLS,
  type ToolCategory,
} from '../../../../core/tool-registry/tool-categories.js';
import { TOOL_EXAMPLES } from '../../../../shared/schemas/tools.schema.js';

const VALID_CATEGORIES: ToolCategory[] = ['core', 'media', 'social', 'entertainment', 'academic', 'task'];

/**
 * Format tool description cho AI
 */
function formatToolDescription(tool: ITool): string {
  const paramsDesc = tool.parameters
    .map(
      (p: ToolParameter) =>
        `    - ${p.name} (${p.type}${p.required ? ', bắt buộc' : ', tùy chọn'}): ${p.description}`,
    )
    .join('\n');

  const example = TOOL_EXAMPLES[tool.name] || '';
  const exampleSection = example ? `\n  Ví dụ: ${example}` : '';

  return `📌 ${tool.name}
  Mô tả: ${tool.description}
  Tham số:
${paramsDesc || '    (Không có tham số)'}${exampleSection}`;
}

export const describeToolsTool: ITool = {
  name: 'describeTools',
  description:
    'Lấy thông tin chi tiết về các tools trong một category. Gọi tool này TRƯỚC khi sử dụng tools mà bạn chưa biết cách dùng.',
  parameters: [
    {
      name: 'category',
      type: 'string',
      description: `Category cần xem: ${VALID_CATEGORIES.join(', ')}. Hoặc "all" để xem tất cả categories.`,
      required: true,
    },
    {
      name: 'toolName',
      type: 'string',
      description: 'Tên tool cụ thể cần xem chi tiết (tùy chọn)',
      required: false,
    },
  ],
  category: 'core',

  async execute(
    params: { category: string; toolName?: string },
    _context: ToolContext,
  ): Promise<ToolResult> {
    const { category, toolName } = params;

    // Nếu hỏi về tool cụ thể
    if (toolName) {
      const tool = moduleManager.getTool(toolName);
      if (!tool) {
        return {
          success: false,
          error: `Tool "${toolName}" không tồn tại. Dùng describeTools với category để xem danh sách tools.`,
        };
      }
      return {
        success: true,
        data: formatToolDescription(tool),
      };
    }

    // Nếu hỏi "all" - trả về summary tất cả categories
    if (category === 'all') {
      const summary = Object.entries(CATEGORY_DESCRIPTIONS)
        .map(([cat, desc]) => {
          const tools = CATEGORY_TOOLS[cat as ToolCategory] || [];
          return `📂 ${cat.toUpperCase()}: ${desc}\n   Tools: ${tools.join(', ')}`;
        })
        .join('\n\n');

      return {
        success: true,
        data: `DANH SÁCH CATEGORIES:\n\n${summary}\n\n💡 Gọi [tool:describeTools category="<tên>"] để xem chi tiết từng category.`,
      };
    }

    // Validate category
    if (!VALID_CATEGORIES.includes(category as ToolCategory)) {
      return {
        success: false,
        error: `Category không hợp lệ. Các category có sẵn: ${VALID_CATEGORIES.join(', ')}, all`,
      };
    }

    // Lấy tools trong category
    const toolNames = CATEGORY_TOOLS[category as ToolCategory] || [];
    const tools = toolNames
      .map((name) => moduleManager.getTool(name))
      .filter((t): t is ITool => t !== undefined);

    if (tools.length === 0) {
      return {
        success: true,
        data: `Category "${category}" không có tools nào được load (có thể module chưa được bật).`,
      };
    }

    const descriptions = tools.map(formatToolDescription).join('\n\n');
    const categoryDesc = CATEGORY_DESCRIPTIONS[category as ToolCategory];

    return {
      success: true,
      data: `📂 CATEGORY: ${category.toUpperCase()}\n${categoryDesc}\n\n${descriptions}`,
    };
  },
};
