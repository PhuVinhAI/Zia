/**
 * Script fix imports sau khi tái cấu trúc thư mục
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';

let fixedCount = 0;
let checkedCount = 0;

function fixFile(filePath: string, replacements: [RegExp, string][]) {
  let content = readFileSync(filePath, 'utf-8');
  let originalContent = content;
  
  for (const [pattern, replacement] of replacements) {
    content = content.replace(pattern, replacement);
  }
  
  if (content !== originalContent) {
    writeFileSync(filePath, content);
    console.log(`✅ Fixed: ${filePath}`);
    fixedCount++;
  }
  checkedCount++;
}

function walkDir(dir: string, replacements: [RegExp, string][]) {
  if (!existsSync(dir)) return;
  
  const files = readdirSync(dir);
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      if (file === 'node_modules') continue;
      walkDir(filePath, replacements);
    } else if (file.endsWith('.ts') || file.endsWith('.js')) {
      fixFile(filePath, replacements);
    }
  }
}

console.log('🔧 Fixing imports after restructure...\n');

// ============================================
// 1. Fix infrastructure/ai/providers/gemini (4 levels deep)
// ============================================
const geminiReplacements: [RegExp, string][] = [
  [/from '\.\.\/\.\.\/core\//g, "from '../../../../core/"],
  [/from '\.\.\/\.\.\/shared\//g, "from '../../../../shared/"],
];
walkDir('src/infrastructure/ai/providers/gemini', geminiReplacements);

// ============================================
// 2. Fix infrastructure/ai/providers/groq (4 levels deep)
// ============================================
const groqReplacements: [RegExp, string][] = [
  [/from '\.\.\/\.\.\/core\//g, "from '../../../../core/"],
  [/from '\.\.\/\.\.\/shared\//g, "from '../../../../shared/"],
];
walkDir('src/infrastructure/ai/providers/groq', groqReplacements);

// ============================================
// 3. Fix infrastructure/messaging/zalo (3 levels deep)
// ============================================
const zaloReplacements: [RegExp, string][] = [
  [/from '\.\.\/\.\.\/core\//g, "from '../../../core/"],
  [/from '\.\.\/\.\.\/shared\//g, "from '../../../shared/"],
];
walkDir('src/infrastructure/messaging/zalo', zaloReplacements);

// ============================================
// 4. Fix infrastructure/memory (memoryStore needs gemini path)
// ============================================
const memoryReplacements: [RegExp, string][] = [
  [/from '\.\.\/gemini\//g, "from '../ai/providers/gemini/"],
];
walkDir('src/infrastructure/memory', memoryReplacements);

// ============================================
// 5. Fix modules/gateway/guards (3 levels deep)
// ============================================
const guardsReplacements: [RegExp, string][] = [
  [/from '\.\.\/\.\.\/core\//g, "from '../../../core/"],
  [/from '\.\.\/\.\.\/shared\//g, "from '../../../shared/"],
];
walkDir('src/modules/gateway/guards', guardsReplacements);

// ============================================
// 6. Fix modules/gateway/services (3 levels deep)
// ============================================
const servicesReplacements: [RegExp, string][] = [
  [/from '\.\.\/\.\.\/core\//g, "from '../../../core/"],
  [/from '\.\.\/\.\.\/shared\//g, "from '../../../shared/"],
  [/from '\.\.\/\.\.\/infrastructure\//g, "from '../../../infrastructure/"],
  [/from '\.\.\/classifier\.js'/g, "from '../classifier.js'"],
];
walkDir('src/modules/gateway/services', servicesReplacements);

// ============================================
// 7. Fix modules/gateway root files (gateway.module.ts, message.listener.ts)
// ============================================
const gatewayRootReplacements: [RegExp, string][] = [
  // Fix exports in gateway.module.ts
  [/from '\.\/prompt\.builder\.js'/g, "from './services/prompt.builder.js'"],
  [/from '\.\/quote\.parser\.js'/g, "from './services/quote.parser.js'"],
  [/from '\.\/rate-limit\.guard\.js'/g, "from './guards/rate-limit.guard.js'"],
  [/from '\.\/user\.filter\.js'/g, "from './guards/user.filter.js'"],
  [/from '\.\/message\.buffer\.js'/g, "from './services/message.buffer.js'"],
];
fixFile('src/modules/gateway/gateway.module.ts', gatewayRootReplacements);
fixFile('src/modules/gateway/message.listener.ts', gatewayRootReplacements);

// ============================================
// 8. Fix modules/gateway/processors (need to go up one level for services/guards)
// ============================================
const processorsReplacements: [RegExp, string][] = [
  [/from '\.\.\/quote\.parser\.js'/g, "from '../services/quote.parser.js'"],
  [/from '\.\.\/prompt\.builder\.js'/g, "from '../services/prompt.builder.js'"],
  [/from '\.\.\/message\.buffer\.js'/g, "from '../services/message.buffer.js'"],
  [/from '\.\.\/rate-limit\.guard\.js'/g, "from '../guards/rate-limit.guard.js'"],
  [/from '\.\.\/user\.filter\.js'/g, "from '../guards/user.filter.js'"],
];
walkDir('src/modules/gateway/processors', processorsReplacements);

// ============================================
// 9. Fix modules/gateway/handlers (need to go up one level for services/guards)
// ============================================
const handlersReplacements: [RegExp, string][] = [
  [/from '\.\.\/quote\.parser\.js'/g, "from '../services/quote.parser.js'"],
  [/from '\.\.\/prompt\.builder\.js'/g, "from '../services/prompt.builder.js'"],
  [/from '\.\.\/message\.buffer\.js'/g, "from '../services/message.buffer.js'"],
  [/from '\.\.\/rate-limit\.guard\.js'/g, "from '../guards/rate-limit.guard.js'"],
  [/from '\.\.\/user\.filter\.js'/g, "from '../guards/user.filter.js'"],
];
walkDir('src/modules/gateway/handlers', handlersReplacements);

// ============================================
// 10. Fix core/config (moved from shared)
// ============================================
const configReplacements: [RegExp, string][] = [
  [/from '\.\.\/schemas\/config\.schema\.js'/g, "from './config.schema.js'"],
  [/from '\.\.\/types\/config\.schema\.js'/g, "from '../../shared/types/config.schema.js'"],
];
walkDir('src/core/config', configReplacements);

// ============================================
// 11. Fix shared/constants (now empty, but may have references)
// ============================================
// Files that import from shared/constants/config need to import from core/config/config
const sharedConstantsReplacements: [RegExp, string][] = [
  [/from '\.\.\/\.\.\/shared\/constants\/config\.js'/g, "from '../../core/config/config.js'"],
  [/from '\.\.\/shared\/constants\/config\.js'/g, "from '../core/config/config.js'"],
  [/from '\.\/constants\/config\.js'/g, "from '../core/config/config.js'"],
  [/from '\.\.\/constants\/config\.js'/g, "from '../../core/config/config.js'"],
  [/from '\.\.\/\.\.\/constants\/config\.js'/g, "from '../../../core/config/config.js'"],
];
walkDir('src/shared', sharedConstantsReplacements);
walkDir('src/modules', sharedConstantsReplacements);
walkDir('src/infrastructure', sharedConstantsReplacements);

// ============================================
// 12. Fix tests
// ============================================
const testReplacements: [RegExp, string][] = [
  // Gateway tests
  [/from '\.\.\/\.\.\/\.\.\/src\/modules\/gateway\/message\.buffer\.js'/g, 
   "from '../../../src/modules/gateway/services/message.buffer.js'"],
  [/from '\.\.\/\.\.\/\.\.\/src\/modules\/gateway\/prompt\.builder\.js'/g,
   "from '../../../src/modules/gateway/services/prompt.builder.js'"],
  [/from '\.\.\/\.\.\/\.\.\/src\/modules\/gateway\/quote\.parser\.js'/g,
   "from '../../../src/modules/gateway/services/quote.parser.js'"],
  [/from '\.\.\/\.\.\/\.\.\/src\/modules\/gateway\/rate-limit\.guard\.js'/g,
   "from '../../../src/modules/gateway/guards/rate-limit.guard.js'"],
  [/from '\.\.\/\.\.\/\.\.\/src\/modules\/gateway\/user\.filter\.js'/g,
   "from '../../../src/modules/gateway/guards/user.filter.js'"],
];
walkDir('tests', testReplacements);

console.log(`\n✨ Done! Fixed ${fixedCount} files (checked ${checkedCount}).`);
