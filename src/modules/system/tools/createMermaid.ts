/**
 * Tool: createMermaid - Tạo sơ đồ Mermaid và xuất ra ảnh PNG
 * Sử dụng mermaid.ink API để render
 */

import type { ITool, ToolResult } from '../../../core/types.js';
import { CreateMermaidSchema, validateParams } from '../../../shared/schemas/tools.schema.js';
import { http } from '../../../shared/utils/httpClient.js';

export const createMermaidTool: ITool = {
  name: 'createMermaid',
  description: `Tạo sơ đồ Mermaid xuất ảnh PNG. Hỗ trợ: flowchart, sequence, class, state, er, gantt, pie, mindmap, timeline.

⚠️ BẮT BUỘC: code phải là cú pháp Mermaid hợp lệ!
📤 ẢNH TỰ ĐỘNG GỬI: Tool sẽ TỰ ĐỘNG gửi ảnh sơ đồ qua Zalo. KHÔNG cần dùng [image:] tag!

Ví dụ flowchart:
[tool:createMermaid]{"code":"flowchart TD\\n    A[Start] --> B{Decision}\\n    B -->|Yes| C[OK]\\n    B -->|No| D[Cancel]"}[/tool]

Ví dụ sequence:
[tool:createMermaid]{"code":"sequenceDiagram\\n    Alice->>Bob: Hello\\n    Bob-->>Alice: Hi"}[/tool]

Ví dụ mindmap:
[tool:createMermaid]{"code":"mindmap\\n  root((Main))\\n    Topic1\\n      Sub1\\n    Topic2"}[/tool]`,
  parameters: [
    {
      name: 'code',
      type: 'string',
      description: 'Mã Mermaid diagram. Dùng \\n cho xuống dòng.',
      required: true,
    },
    {
      name: 'theme',
      type: 'string',
      description: 'Theme: default, dark, forest, neutral. Mặc định: default',
      required: false,
    },
    {
      name: 'bgColor',
      type: 'string',
      description: 'Màu nền (hex). Mặc định: white',
      required: false,
    },
  ],
  execute: async (params: Record<string, any>): Promise<ToolResult> => {
    const validation = validateParams(CreateMermaidSchema, params);
    if (!validation.success) return { success: false, error: validation.error };
    const data = validation.data;

    try {
      // Chuẩn hóa code - thay \\n thành \n thực
      const code = data.code.replace(/\\n/g, '\n');

      // Build mermaid config
      const mermaidConfig = {
        code,
        mermaid: {
          theme: data.theme || 'default',
        },
      };

      // Encode sang base64url
      const encoded = Buffer.from(JSON.stringify(mermaidConfig)).toString('base64url');

      // Build URL với background color
      const bgColor = (data.bgColor || 'white').replace('#', '');
      const url = `https://mermaid.ink/img/${encoded}?bgColor=${bgColor}`;

      // Fetch ảnh từ mermaid.ink
      const response = await http.get(url, {
        timeout: 30000,
        headers: {
          Accept: 'image/png',
        },
      });

      const arrayBuffer = await response.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        return { success: false, error: 'Không thể render sơ đồ. Kiểm tra lại cú pháp Mermaid.' };
      }

      const imageBuffer = Buffer.from(arrayBuffer);

      return {
        success: true,
        data: {
          imageBuffer,
          filename: `mermaid_${Date.now()}.png`,
          mimeType: 'image/png',
          fileSize: imageBuffer.length,
          diagramType: code.split('\n')[0]?.trim() || 'mermaid',
        },
      };
    } catch (error: any) {
      // Xử lý lỗi cụ thể
      if (error.response?.status === 400) {
        return { success: false, error: 'Cú pháp Mermaid không hợp lệ. Kiểm tra lại code.' };
      }
      return { success: false, error: `Lỗi tạo sơ đồ: ${error.message}` };
    }
  },
};
