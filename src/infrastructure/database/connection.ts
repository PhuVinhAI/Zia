/**
 * Database Connection - Quản lý kết nối SQLite với Bun native driver
 * Sử dụng WAL mode để tối ưu hiệu năng
 * Tích hợp sqlite-vec cho vector search
 */
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as sqliteVec from 'sqlite-vec';
import { debugLog } from '../../core/logger/logger.js';
import * as schema from './schema.js';

// Embedding dimensions cho vector search
export const EMBEDDING_DIM = 768;

const DB_PATH = 'data/bot.db';

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let sqliteDb: Database | null = null;

/**
 * Khởi tạo database connection
 */
export function initDatabase() {
  if (db) return db;

  // Đảm bảo thư mục data tồn tại
  const fs = require('node:fs');
  const path = require('node:path');
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  debugLog('DATABASE', `Connecting to ${DB_PATH}...`);

  // Khởi tạo SQLite với Bun native driver
  sqliteDb = new Database(DB_PATH);

  // Bật WAL mode để tăng hiệu năng ghi đồng thời
  sqliteDb.exec('PRAGMA journal_mode = WAL;');
  sqliteDb.exec('PRAGMA synchronous = NORMAL;');
  sqliteDb.exec('PRAGMA cache_size = 10000;');
  sqliteDb.exec('PRAGMA temp_store = MEMORY;');

  // Load sqlite-vec extension cho vector search
  sqliteVec.load(sqliteDb);
  debugLog('DATABASE', '✅ sqlite-vec extension loaded');

  // Tạo Drizzle instance
  db = drizzle(sqliteDb, { schema });

  debugLog('DATABASE', '✅ Database connected with WAL mode');

  // Auto-migration: Tạo tables nếu chưa tồn tại
  runMigrations(sqliteDb);

  return db;
}

/**
 * Auto-migration - Tạo tables và indexes
 */
function runMigrations(sqlite: Database) {
  debugLog('DATABASE', 'Running auto-migrations...');

  // Tạo bảng history
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'model')),
      content TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_history_thread ON history(thread_id);
  `);

  // Tạo bảng sent_messages
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS sent_messages (
      msg_id TEXT PRIMARY KEY,
      cli_msg_id TEXT,
      thread_id TEXT NOT NULL,
      content TEXT,
      timestamp INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sent_thread ON sent_messages(thread_id);
  `);

  // Tạo bảng users
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      name TEXT,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user', 'blocked')),
      created_at INTEGER NOT NULL
    );
  `);

  // Tạo bảng memories (long-term memory)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'note' CHECK(type IN ('conversation', 'fact', 'person', 'preference', 'task', 'note')),
      user_id TEXT,
      user_name TEXT,
      importance INTEGER NOT NULL DEFAULT 5,
      created_at INTEGER NOT NULL,
      metadata TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
    CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id);
  `);

  // Tạo virtual table cho vector search (sqlite-vec)
  sqlite.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS vec_memories USING vec0(
      memory_id INTEGER PRIMARY KEY,
      embedding float[${EMBEDDING_DIM}]
    );
  `);

  debugLog('DATABASE', '✅ Migrations completed (including vector tables)');
}

/**
 * Lấy database instance
 */
export function getDatabase() {
  if (!db) {
    return initDatabase();
  }
  return db;
}

/**
 * Lấy raw SQLite instance (cho sqlite-vec operations)
 */
export function getSqliteDb(): Database {
  if (!sqliteDb) {
    initDatabase();
  }
  return sqliteDb!;
}

/**
 * Đóng kết nối database
 */
export function closeDatabase() {
  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
    db = null;
    debugLog('DATABASE', 'Database connection closed');
  }
}
