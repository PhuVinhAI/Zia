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

// ============================================
// 4. Bảng memories - Long-term memory
// ============================================
export const memories = sqliteTable(
  'memories',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    content: text('content').notNull(),
    type: text('type', {
      enum: ['conversation', 'fact', 'person', 'preference', 'task', 'note'],
    })
      .notNull()
      .default('note'),
    userId: text('user_id'),
    userName: text('user_name'),
    importance: integer('importance').notNull().default(5),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    // Access tracking fields
    lastAccessedAt: integer('last_accessed_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date()),
    accessCount: integer('access_count').notNull().default(0),
    metadata: text('metadata'), // JSON string
  },
  (table) => [
    index('idx_memories_type').on(table.type),
    index('idx_memories_user').on(table.userId),
  ],
);

// Type exports
export type History = typeof history.$inferSelect;
export type NewHistory = typeof history.$inferInsert;
export type SentMessage = typeof sentMessages.$inferSelect;
export type NewSentMessage = typeof sentMessages.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Memory = typeof memories.$inferSelect;
export type NewMemory = typeof memories.$inferInsert;

export type MemoryType = 'conversation' | 'fact' | 'person' | 'preference' | 'task' | 'note';
