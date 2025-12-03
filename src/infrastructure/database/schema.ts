/**
 * Database Schema - Drizzle ORM Schema Definitions
 * Single Source of Truth cho cấu trúc database
 */
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// ============================================
// 1. Bảng history - Lịch sử hội thoại
// ============================================
export const history = sqliteTable(
  'history',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    threadId: text('thread_id').notNull(),
    role: text('role', { enum: ['user', 'model'] }).notNull(),
    content: text('content').notNull(), // JSON serialized cho complex data
    timestamp: integer('timestamp', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index('idx_history_thread').on(table.threadId)],
);

// ============================================
// 2. Bảng sent_messages - Nhật ký gửi tin
// ============================================
export const sentMessages = sqliteTable(
  'sent_messages',
  {
    msgId: text('msg_id').primaryKey(),
    cliMsgId: text('cli_msg_id'),
    threadId: text('thread_id').notNull(),
    content: text('content'),
    timestamp: integer('timestamp', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index('idx_sent_thread').on(table.threadId)],
);

// ============================================
// 3. Bảng users - Quản lý người dùng
// ============================================
export const users = sqliteTable('users', {
  userId: text('user_id').primaryKey(),
  name: text('name'),
  role: text('role', { enum: ['admin', 'user', 'blocked'] })
    .notNull()
    .default('user'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Type exports
export type History = typeof history.$inferSelect;
export type NewHistory = typeof history.$inferInsert;
export type SentMessage = typeof sentMessages.$inferSelect;
export type NewSentMessage = typeof sentMessages.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
