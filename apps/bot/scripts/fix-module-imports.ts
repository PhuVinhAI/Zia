/**
 * Script fix imports sau khi tách modules
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';

let fixedCount = 0;

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
    } else if (file.endsWith('.ts')) {
      fixFile(filePath, replacements);
    }
  }
}

console.log('🔧 Fixing imports after module split...\n');

// Fix chat tools (moved from system/tools/chat to chat/tools)
const chatReplacements: [RegExp, string][] = [
  [/from '\.\.\/\.\.\/\.\.\/\.\.\/core\//g, "from '../../../core/"],
  [/from '\.\.\/\.\.\/\.\.\/\.\.\/shared\//g, "from '../../../shared/"],
  [/from '\.\.\/\.\.\/\.\.\/\.\.\/infrastructure\//g, "from '../../../infrastructure/"],
];
walkDir('src/modules/chat/tools', chatReplacements);

// Fix media tools (moved from system/tools/media to media/tools)
const mediaReplacements: [RegExp, string][] = [
  [/from '\.\.\/\.\.\/\.\.\/\.\.\/core\//g, "from '../../../core/"],
  [/from '\.\.\/\.\.\/\.\.\/\.\.\/shared\//g, "from '../../../shared/"],
  [/from '\.\.\/\.\.\/\.\.\/\.\.\/infrastructure\//g, "from '../../../infrastructure/"],
  [/from '\.\.\/\.\.\/\.\.\/\.\.\/libs\//g, "from '../../../libs/"],
  [/from '\.\.\/\.\.\/services\//g, "from '../services/"],
];
walkDir('src/modules/media/tools', mediaReplacements);

// Fix media/tools/createFile (5 levels deep)
const createFileReplacements: [RegExp, string][] = [
  [/from '\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/core\//g, "from '../../../../core/"],
  [/from '\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/shared\//g, "from '../../../../shared/"],
  [/from '\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/libs\//g, "from '../../../../libs/"],
  [/from '\.\.\/\.\.\/\.\.\/services\//g, "from '../../services/"],
];
walkDir('src/modules/media/tools/createFile', createFileReplacements);

// Fix search tools (moved from system/tools/search to search/tools)
const searchReplacements: [RegExp, string][] = [
  [/from '\.\.\/\.\.\/\.\.\/\.\.\/core\//g, "from '../../../core/"],
  [/from '\.\.\/\.\.\/\.\.\/\.\.\/shared\//g, "from '../../../shared/"],
  [/from '\.\.\/\.\.\/services\//g, "from '../services/"],
];
walkDir('src/modules/search/tools', searchReplacements);

// Fix social tools (moved from system/tools/social to social/tools)
const socialReplacements: [RegExp, string][] = [
  [/from '\.\.\/\.\.\/\.\.\/\.\.\/core\//g, "from '../../../core/"],
  [/from '\.\.\/\.\.\/\.\.\/\.\.\/shared\//g, "from '../../../shared/"],
  [/from '\.\.\/\.\.\/\.\.\/\.\.\/infrastructure\//g, "from '../../../infrastructure/"],
];
walkDir('src/modules/social/tools', socialReplacements);

// Fix task tools (moved from system/tools/task to task/tools)
const taskReplacements: [RegExp, string][] = [
  [/from '\.\.\/\.\.\/\.\.\/\.\.\/core\//g, "from '../../../core/"],
  [/from '\.\.\/\.\.\/\.\.\/\.\.\/shared\//g, "from '../../../shared/"],
  [/from '\.\.\/\.\.\/\.\.\/background-agent\//g, "from '../../background-agent/"],
  [/from '\.\.\/media\/createFile\//g, "from '../../media/tools/createFile/"],
];
walkDir('src/modules/task/tools', taskReplacements);

// Fix media services (moved from system/services to media/services)
const mediaServicesReplacements: [RegExp, string][] = [
  [/from '\.\.\/\.\.\/\.\.\/core\//g, "from '../../../core/"],
  [/from '\.\.\/\.\.\/\.\.\/shared\//g, "from '../../../shared/"],
  [/from '\.\.\/\.\.\/\.\.\/libs\//g, "from '../../../libs/"],
];
walkDir('src/modules/media/services', mediaServicesReplacements);

// Fix search services (moved from system/services to search/services)
const searchServicesReplacements: [RegExp, string][] = [
  [/from '\.\.\/\.\.\/\.\.\/core\//g, "from '../../../core/"],
  [/from '\.\.\/\.\.\/\.\.\/shared\//g, "from '../../../shared/"],
];
walkDir('src/modules/search/services', searchServicesReplacements);

console.log(`\n✨ Done! Fixed ${fixedCount} files.`);
