/**
 * Memory Tools - AI có thể lưu và tìm kiếm long-term memory
 */

import { debugLog } from '../../../core/logger/logger.js';
import type { MemoryType } from '../../../infrastructure/database/schema.js';
import { memoryStore } from '../../../infrastructure/memory/index.js';
import {
  RecallMemorySchema,
  SaveMemorySchema,
  validateParams,
} from '../../../shared/schemas/tools.schema.js';
import type { ToolContext, ToolDefinition, ToolResult } from '../../../shared/types/tools.types.js';

// ═══════════════════════════════════════════════════
// SAVE MEMORY TOOL
// ═══════════════════════════════════════════════════

export const saveMemoryTool: ToolDefinition = {
  name: 'saveMemory',
  description: `Lưu thông tin quan trọng vào bộ nhớ dài hạn. Dùng khi:
- User chia sẻ thông tin cá nhân (tên, sở thích, công việc...)
- Có sự kiện/thông tin quan trọng cần nhớ
- User yêu cầu "nhớ giúp" điều gì đó
- Kết thúc cuộc trò chuyện có nội dung đáng nhớ`,
  parameters: [
    {
      name: 'content',
      type: 'string',
      description: 'Nội dung cần lưu (tóm tắt ngắn gọn, rõ ràng)',
      required: true,
    },
    {
      name: 'type',
      type: 'string',
      description:
        'Loại memory: person (thông tin người), fact (sự kiện), preference (sở thích), task (công việc), note (ghi chú)',
      required: false,
    },
    {
      name: 'importance',
      type: 'number',
      description: 'Độ quan trọng 1-10 (mặc định 5)',
      required: false,
    },
  ],
  execute: async (params: Record<string, any>, context: ToolContext): Promise<ToolResult> => {
    const validation = validateParams(SaveMemorySchema, params);
    if (!validation.success) return { success: false, error: validation.error };
    const data = validation.data;

    try {
      const id = await memoryStore.add(data.content, {
        type: data.type as MemoryType,
        userId: context.senderId,
        userName: context.senderName,
        importance: data.importance,
      });

      debugLog('TOOL:saveMemory', `Saved memory #${id}: ${data.content.substring(0, 50)}...`);

      return {
        success: true,
        data: {
          id,
          message: `Đã lưu vào bộ nhớ #${id}`,
        },
      };
    } catch (e: any) {
      return { success: false, error: `Lỗi lưu memory: ${e.message}` };
    }
  },
};

// ═══════════════════════════════════════════════════
// RECALL MEMORY TOOL
// ═══════════════════════════════════════════════════

export const recallMemoryTool: ToolDefinition = {
  name: 'recallMemory',
  description: `Tìm kiếm thông tin trong bộ nhớ dài hạn. Dùng khi:
- Cần nhớ lại thông tin về user
- User hỏi "mình đã nói gì về..."
- Cần context từ các cuộc trò chuyện trước
- Muốn biết sở thích/thông tin của user`,
  parameters: [
    {
      name: 'query',
      type: 'string',
      description: 'Từ khóa/câu hỏi để tìm kiếm (semantic search)',
      required: true,
    },
    {
      name: 'type',
      type: 'string',
      description: 'Lọc theo loại: person, fact, preference, task, note',
      required: false,
    },
    {
      name: 'limit',
      type: 'number',
      description: 'Số kết quả tối đa (mặc định 5)',
      required: false,
    },
  ],
  execute: async (params: Record<string, any>, _context: ToolContext): Promise<ToolResult> => {
    const validation = validateParams(RecallMemorySchema, params);
    if (!validation.success) return { success: false, error: validation.error };
    const data = validation.data;

    try {
      const results = await memoryStore.search(data.query, {
        type: data.type as MemoryType,
        limit: data.limit,
      });

      debugLog('TOOL:recallMemory', `Found ${results.length} memories for "${data.query}"`);

      if (results.length === 0) {
        return {
          success: true,
          data: {
            found: false,
            message: 'Không tìm thấy memory liên quan',
            memories: [],
          },
        };
      }

      return {
        success: true,
        data: {
          found: true,
          count: results.length,
          memories: results.map((m) => ({
            id: m.id,
            content: m.content,
            type: m.type,
            relevance: Math.round(m.relevance * 100) + '%',
            effectiveScore: Math.round(m.effectiveScore * 10) / 10,
            accessCount: m.accessCount,
            userName: m.userName,
            createdAt:
              m.createdAt instanceof Date
                ? m.createdAt.toLocaleDateString('vi-VN')
                : new Date(m.createdAt).toLocaleDateString('vi-VN'),
          })),
        },
      };
    } catch (e: any) {
      return { success: false, error: `Lỗi tìm memory: ${e.message}` };
    }
  },
};
