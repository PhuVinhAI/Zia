/**
 * Zod Schemas - Centralized validation schemas
 *
 * Sử dụng Zod để validate dữ liệu đầu vào, thay thế if-else thủ công.
 * Lợi ích:
 * - Code ngắn gọn hơn 50%
 * - Type inference tự động
 * - Error messages chi tiết
 * - Coercion tự động (string -> number)
 */
export * from './config.schema.js';
export * from './tools.schema.js';
