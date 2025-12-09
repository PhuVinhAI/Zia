/**
 * Database Connection - Quản lý kết nối SQLite với Bun native driver
 * Sử dụng WAL mode để tối ưu hiệu năng
 * Tích hợp sqlite-vec cho vector search
 */
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as sqliteVec from 'sqlite-vec';
import { CONFIG } from '../../core/config/config.js';
import { debugLog } from '../../core/logger/logger.js';
import * as schema from './schema.js';

// Embedding dimensions cho vector search (từ config)
export const EMBEDDING_DIM = CONFIG.database?.embeddingDim ?? 768;

const getDbPath = () => CONFIG.database?.path ?? 'data/bot.db';

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let sqliteDb: Database | null = null;

/**
 * Kiểm tra database integrity
 */
export function checkDatabaseIntegrity(dbPath: string): boolean {
  try {
    const fs = require('node:fs');
    if (!fs.existsSync(dbPath)) return true; // Không có file = OK (sẽ tạo mới)

    const testDb = new Database(dbPath, { readonly: true });
    try {
      const result = testDb.query('PRAGMA integrity_check').get() as { integrity_check: string };
      testDb.close();
      const isOk = result?.integrity_check === 'ok';
      if (!isOk) {
        debugLog('DATABASE', `Integrity check failed: ${result?.integrity_check}`);
      }
      return isOk;
    } catch (e) {
      debugLog('DATABASE', `Integrity check error: ${e}`);
      testDb.close();
      return false;
    }
  } catch (e) {
    debugLog('DATABASE', `Cannot open DB for integrity check: ${e}`);
    return false;
  }
}

/**
 * Xóa database files (khi corrupt)
 */
export function removeDatabaseFiles(dbPath: string): void {
  const fs = require('node:fs');
  const files = [dbPath, `${dbPath}-wal`, `${dbPath}-shm`];
  for (const file of files) {
    try {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch {}
  }
}

/**
 * Khởi tạo database connection
 */
export function initDatabase() {
  if (db) return db;

  const dbPath = getDbPath();

  // Đảm bảo thư mục data tồn tại
  const fs = require('node:fs');
  const path = require('node:path');
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Kiểm tra integrity trước khi mở
  if (fs.existsSync(dbPath) && !checkDatabaseIntegrity(dbPath)) {
    console.log('⚠️ Database corrupt detected, removing...');
    removeDatabaseFiles(dbPath);
  }

  debugLog('DATABASE', `Connecting to ${dbPath}...`);

  // Khởi tạo SQLite với Bun native driver
  sqliteDb = new Database(dbPath);

  // Bật WAL mode để tăng hiệu năng ghi đồng thời
  sqliteDb.exec('PRAGMA journal_mode = WAL;');
  sqliteDb.exec('PRAGMA synchronous = NORMAL;');
  sqliteDb.exec(`PRAGMA cache_size = ${CONFIG.database?.cacheSize ?? 10000};`);
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
      last_accessed_at INTEGER,
      access_count INTEGER NOT NULL DEFAULT 0,
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

  // Tạo bảng agent_tasks (background task queue)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS agent_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('send_message')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
      target_user_id TEXT,
      target_thread_id TEXT,
      payload TEXT NOT NULL,
      context TEXT,
      scheduled_at INTEGER NOT NULL,
      started_at INTEGER,
      completed_at INTEGER,
      retry_count INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 3,
      last_error TEXT,
      result TEXT,
      created_by TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON agent_tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_scheduled ON agent_tasks(scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_tasks_type ON agent_tasks(type);
  `);

  debugLog('DATABASE', '✅ Migrations completed (including vector tables and agent_tasks)');
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

// ============================================
// Database Change Notification (for cloud backup)
// ============================================

type DbChangeListener = () => void;
const dbChangeListeners: DbChangeListener[] = [];

/**
 * Register listener for database changes
 */
export function onDbChange(listener: DbChangeListener): () => void {
  dbChangeListeners.push(listener);
  return () => {
    const index = dbChangeListeners.indexOf(listener);
    if (index > -1) dbChangeListeners.splice(index, 1);
  };
}

/**
 * Notify all listeners that database has changed
 * Call this after write operations (insert, update, delete)
 */
export function notifyDbChange(): void {
  for (const listener of dbChangeListeners) {
    try {
      listener();
    } catch (e) {
      debugLog('DATABASE', `Change listener error: ${e}`);
    }
  }
}
