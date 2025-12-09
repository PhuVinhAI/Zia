#!/usr/bin/env bun
/**
 * Memory CLI - Quản lý long-term memory
 * Usage: bun scripts/memory.ts <command> [options]
 *
 * Commands:
 *   list [limit]           - Liệt kê memories
 *   search <query>         - Tìm kiếm semantic
 *   add <content> [type]   - Thêm memory mới
 *   delete <id>            - Xóa memory
 *   stats                  - Thống kê
 *   export [file]          - Export ra JSON
 *   import <file>          - Import từ JSON
 */

import { databaseService } from '../src/infrastructure/database/index.js';
import { memoryStore } from '../src/infrastructure/memory/index.js';

// Colors
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

const TYPE_COLORS: Record<string, string> = {
  person: c.blue,
  fact: c.green,
  preference: c.magenta,
  task: c.yellow,
  note: c.dim,
  conversation: c.cyan,
};

function formatDate(d: Date | number): string {
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleString('vi-VN');
}

// ═══════════════════════════════════════════════════
// COMMANDS
// ═══════════════════════════════════════════════════

async function cmdList(limit = 20) {
  console.log(`\n${c.bold}${c.cyan}🧠 Memories${c.reset} (last ${limit})\n`);

  const memories = await memoryStore.getRecent(limit);

  if (memories.length === 0) {
    console.log(`${c.dim}(no memories)${c.reset}`);
    return;
  }

  memories.forEach((m) => {
    const typeColor = TYPE_COLORS[m.type] || c.dim;
    const imp = '★'.repeat(Math.min(m.importance, 5)) + '☆'.repeat(Math.max(0, 5 - m.importance));

    console.log(`${c.bold}#${m.id}${c.reset} ${typeColor}[${m.type}]${c.reset} ${imp}`);
    console.log(`   ${m.content}`);
    console.log(
      `   ${c.dim}by ${m.userName || 'unknown'} • ${formatDate(m.createdAt)}${c.reset}\n`,
    );
  });
}

async function cmdSearch(query: string, limit = 5) {
  console.log(`\n${c.bold}${c.cyan}🔍 Search${c.reset}: "${query}"\n`);

  const results = await memoryStore.search(query, { limit });

  if (results.length === 0) {
    console.log(`${c.dim}(no results)${c.reset}`);
    return;
  }

  results.forEach((m, i) => {
    const typeColor = TYPE_COLORS[m.type] || c.dim;
    const relevance = Math.round(m.relevance * 100);
    const bar = '█'.repeat(Math.round(relevance / 10)) + '░'.repeat(10 - Math.round(relevance / 10));

    console.log(
      `${c.bold}${i + 1}.${c.reset} ${c.green}${relevance}%${c.reset} ${bar} ${typeColor}[${m.type}]${c.reset}`,
    );
    console.log(`   ${m.content}`);
    console.log(`   ${c.dim}#${m.id} • ${m.userName || 'unknown'}${c.reset}\n`);
  });
}

async function cmdAdd(content: string, type = 'note', importance = 5) {
  console.log(`\n${c.bold}${c.cyan}➕ Add Memory${c.reset}\n`);

  const id = await memoryStore.add(content, {
    type: type as any,
    importance,
  });

  console.log(`${c.green}✓${c.reset} Created memory #${id}`);
  console.log(`  Type: ${type}`);
  console.log(`  Content: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`);
}

async function cmdDelete(id: number) {
  console.log(`\n${c.bold}${c.red}🗑️  Delete Memory #${id}${c.reset}\n`);

  try {
    await memoryStore.delete(id);
    console.log(`${c.green}✓${c.reset} Deleted memory #${id}`);
  } catch (e: any) {
    console.log(`${c.red}✗${c.reset} Error: ${e.message}`);
  }
}

async function cmdStats() {
  console.log(`\n${c.bold}${c.cyan}📊 Memory Stats${c.reset}\n`);

  const stats = await memoryStore.getStats();

  console.log(`  Total: ${c.bold}${stats.total}${c.reset} memories\n`);
  console.log(`  By type:`);

  Object.entries(stats.byType).forEach(([type, count]) => {
    const color = TYPE_COLORS[type] || c.dim;
    const bar = '█'.repeat(Math.min(count, 20));
    console.log(`    ${color}${type.padEnd(12)}${c.reset} ${bar} ${count}`);
  });
}

async function cmdExport(file = 'memories_export.json') {
  console.log(`\n${c.bold}${c.cyan}📤 Export Memories${c.reset}\n`);

  const memories = await memoryStore.getRecent(1000);

  const data = {
    exportedAt: new Date().toISOString(),
    count: memories.length,
    memories: memories.map((m) => ({
      content: m.content,
      type: m.type,
      userId: m.userId,
      userName: m.userName,
      importance: m.importance,
      createdAt: m.createdAt,
      metadata: m.metadata,
    })),
  };

  await Bun.write(file, JSON.stringify(data, null, 2));
  console.log(`${c.green}✓${c.reset} Exported ${memories.length} memories to ${file}`);
}

async function cmdImport(file: string) {
  console.log(`\n${c.bold}${c.cyan}📥 Import Memories${c.reset}\n`);

  const content = await Bun.file(file).text();
  const data = JSON.parse(content);

  if (!data.memories || !Array.isArray(data.memories)) {
    console.log(`${c.red}✗${c.reset} Invalid file format`);
    return;
  }

  let imported = 0;
  for (const m of data.memories) {
    try {
      await memoryStore.add(m.content, {
        type: m.type,
        userId: m.userId,
        userName: m.userName,
        importance: m.importance,
        metadata: m.metadata,
      });
      imported++;
    } catch (e) {
      console.log(`${c.yellow}⚠${c.reset} Skipped: ${m.content.substring(0, 30)}...`);
    }
  }

  console.log(`${c.green}✓${c.reset} Imported ${imported}/${data.memories.length} memories`);
}

// ═══════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════

function printHelp() {
  console.log(`
${c.bold}Memory CLI${c.reset}

${c.cyan}Usage:${c.reset} bun scripts/memory.ts <command> [options]

${c.cyan}Commands:${c.reset}
  list [limit]              Liệt kê memories (default: 20)
  search <query> [limit]    Tìm kiếm semantic (default: 5)
  add <content> [type]      Thêm memory (types: person, fact, preference, task, note)
  delete <id>               Xóa memory theo ID
  stats                     Thống kê memories
  export [file]             Export ra JSON (default: memories_export.json)
  import <file>             Import từ JSON

${c.cyan}Examples:${c.reset}
  bun scripts/memory.ts list 50
  bun scripts/memory.ts search "sở thích"
  bun scripts/memory.ts add "User Minh thích lập trình" person
  bun scripts/memory.ts delete 5
  bun scripts/memory.ts export backup.json
`);
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd || cmd === 'help' || cmd === '-h') {
    printHelp();
    return;
  }

  // Init database
  databaseService.init();

  try {
    switch (cmd) {
      case 'list':
        await cmdList(parseInt(args[1]) || 20);
        break;
      case 'search':
        if (!args[1]) {
          console.log(`${c.red}Error: Missing search query${c.reset}`);
          return;
        }
        await cmdSearch(args[1], parseInt(args[2]) || 5);
        break;
      case 'add':
        if (!args[1]) {
          console.log(`${c.red}Error: Missing content${c.reset}`);
          return;
        }
        await cmdAdd(args[1], args[2] || 'note', parseInt(args[3]) || 5);
        break;
      case 'delete':
        if (!args[1]) {
          console.log(`${c.red}Error: Missing ID${c.reset}`);
          return;
        }
        await cmdDelete(parseInt(args[1]));
        break;
      case 'stats':
        await cmdStats();
        break;
      case 'export':
        await cmdExport(args[1]);
        break;
      case 'import':
        if (!args[1]) {
          console.log(`${c.red}Error: Missing file path${c.reset}`);
          return;
        }
        await cmdImport(args[1]);
        break;
      default:
        console.log(`${c.red}Unknown command: ${cmd}${c.reset}`);
        printHelp();
    }
  } finally {
    databaseService.close();
  }
}

main().catch(console.error);
