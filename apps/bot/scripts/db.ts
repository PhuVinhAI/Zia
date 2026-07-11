#!/usr/bin/env bun
/**
 * Database CLI - Quản lý database từ command line
 * Usage: bun scripts/db.ts <command> [options]
 *
 * Commands:
 *   stats       - Thống kê tổng quan database
 *   tables      - Liệt kê các bảng
 *   query <sql> - Chạy SQL query
 *   history     - Xem lịch sử chat
 *   users       - Xem danh sách users
 *   clear       - Xóa dữ liệu (cần confirm)
 */

import { Database } from 'bun:sqlite';

const DB_PATH = 'data/bot.db';

// Colors for terminal
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function initDb(): Database {
  const db = new Database(DB_PATH);
  return db;
}

function printTable(rows: any[], columns?: string[]) {
  if (rows.length === 0) {
    console.log(`${c.dim}(no data)${c.reset}`);
    return;
  }

  const cols = columns || Object.keys(rows[0]);
  const widths = cols.map((col) =>
    Math.max(col.length, ...rows.map((r) => String(r[col] ?? '').length)),
  );

  // Header
  console.log(cols.map((col, i) => col.padEnd(widths[i])).join(' │ '));
  console.log(widths.map((w) => '─'.repeat(w)).join('─┼─'));

  // Rows
  rows.forEach((row) => {
    console.log(cols.map((col, i) => String(row[col] ?? '').padEnd(widths[i])).join(' │ '));
  });
}

function formatDate(ts: number | Date): string {
  const d = ts instanceof Date ? ts : new Date(ts);
  return d.toLocaleString('vi-VN');
}

// ═══════════════════════════════════════════════════
// COMMANDS
// ═══════════════════════════════════════════════════

function cmdStats(db: Database) {
  console.log(`\n${c.bold}${c.cyan}📊 Database Stats${c.reset}\n`);

  const tables = ['history', 'sent_messages', 'users'];
  tables.forEach((table) => {
    try {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as any;
      console.log(`  ${c.green}${table}${c.reset}: ${count.count} rows`);
    } catch {
      console.log(`  ${c.dim}${table}: (not found)${c.reset}`);
    }
  });

  // DB file size
  const file = Bun.file(DB_PATH);
  console.log(`\n  ${c.dim}File size: ${(file.size / 1024).toFixed(1)} KB${c.reset}`);
}

function cmdTables(db: Database) {
  console.log(`\n${c.bold}${c.cyan}📋 Tables${c.reset}\n`);

  const tables = db
    .prepare("SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') ORDER BY name")
    .all() as any[];

  printTable(tables);
}

function cmdQuery(db: Database, sql: string) {
  console.log(`\n${c.bold}${c.cyan}🔍 Query${c.reset}: ${c.dim}${sql}${c.reset}\n`);

  try {
    const stmt = db.prepare(sql);
    if (sql.trim().toLowerCase().startsWith('select')) {
      const rows = stmt.all();
      printTable(rows as any[]);
      console.log(`\n${c.dim}${rows.length} row(s)${c.reset}`);
    } else {
      const result = stmt.run();
      console.log(`${c.green}✓ Done${c.reset} - Changes: ${result.changes}`);
    }
  } catch (e: any) {
    console.log(`${c.red}Error: ${e.message}${c.reset}`);
  }
}

function cmdHistory(db: Database, limit = 20) {
  console.log(`\n${c.bold}${c.cyan}💬 Recent History${c.reset} (last ${limit})\n`);

  const rows = db
    .prepare(
      `SELECT thread_id, role, substr(content, 1, 60) as content, timestamp
       FROM history ORDER BY id DESC LIMIT ?`,
    )
    .all(limit) as any[];

  const formatted = rows.map((r) => ({
    thread: r.thread_id.slice(-8),
    role: r.role,
    content: r.content.replace(/\n/g, ' ') + (r.content.length > 60 ? '...' : ''),
    time: formatDate(r.timestamp),
  }));

  printTable(formatted);
}

function cmdUsers(db: Database) {
  console.log(`\n${c.bold}${c.cyan}👥 Users${c.reset}\n`);

  const rows = db
    .prepare('SELECT user_id, name, role, created_at FROM users ORDER BY created_at DESC')
    .all() as any[];

  const formatted = rows.map((r) => ({
    userId: r.user_id,
    name: r.name || '(no name)',
    role: r.role,
    created: formatDate(r.created_at),
  }));

  printTable(formatted);
}

async function cmdClear(db: Database, table?: string) {
  const tables = table ? [table] : ['history', 'sent_messages'];

  console.log(`\n${c.bold}${c.red}⚠️  Clear Data${c.reset}\n`);
  console.log(`Tables to clear: ${tables.join(', ')}`);

  process.stdout.write(`\nType "yes" to confirm: `);
  const reader = Bun.stdin.stream().getReader();
  const { value } = await reader.read();
  const input = new TextDecoder().decode(value).trim();

  if (input !== 'yes') {
    console.log(`${c.yellow}Cancelled${c.reset}`);
    return;
  }

  tables.forEach((t) => {
    try {
      db.prepare(`DELETE FROM ${t}`).run();
      console.log(`${c.green}✓${c.reset} Cleared ${t}`);
    } catch (e: any) {
      console.log(`${c.red}✗${c.reset} ${t}: ${e.message}`);
    }
  });
}

// ═══════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════

function printHelp() {
  console.log(`
${c.bold}Database CLI${c.reset}

${c.cyan}Usage:${c.reset} bun scripts/db.ts <command> [options]

${c.cyan}Commands:${c.reset}
  stats              Thống kê tổng quan database
  tables             Liệt kê các bảng
  query <sql>        Chạy SQL query
  history [limit]    Xem lịch sử chat (default: 20)
  users              Xem danh sách users
  clear [table]      Xóa dữ liệu (cần confirm)

${c.cyan}Examples:${c.reset}
  bun scripts/db.ts stats
  bun scripts/db.ts query "SELECT * FROM users"
  bun scripts/db.ts history 50
  bun scripts/db.ts clear history
`);
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd || cmd === 'help' || cmd === '-h') {
    printHelp();
    return;
  }

  const db = initDb();

  switch (cmd) {
    case 'stats':
      cmdStats(db);
      break;
    case 'tables':
      cmdTables(db);
      break;
    case 'query':
      cmdQuery(db, args.slice(1).join(' '));
      break;
    case 'history':
      cmdHistory(db, parseInt(args[1]) || 20);
      break;
    case 'users':
      cmdUsers(db);
      break;
    case 'clear':
      await cmdClear(db, args[1]);
      break;
    default:
      console.log(`${c.red}Unknown command: ${cmd}${c.reset}`);
      printHelp();
  }

  db.close();
}

main().catch(console.error);
