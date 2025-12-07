/**
 * Script fix imports sau khi tái cấu trúc thư mục
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Fix tools in chat/, media/, search/, social/, task/ - 4 levels up to src/
const toolFixes: [string, [RegExp, string][]][] = [
  // chat/, media/, search/, social/, task/ tools
  ['src/modules/system/tools/chat', [
    [/from '\.\.\/\.\.\/\.\.\/core\//g, "from '../../../../core/"],
    [/from '\.\.\/\.\.\/\.\.\/shared\//g, "from '../../../../shared/"],
    [/from '\.\.\/\.\.\/\.\.\/infrastructure\//g, "from '../../../../infrastructure/"],
    [/from '\.\.\/\.\.\/\.\.\/\.\.\/core\//g, "from '../../../../core/"],
    [/from '\.\.\/\.\.\/\.\.\/\.\.\/shared\//g, "from '../../../../shared/"],
    [/from '\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/core\//g, "from '../../../../core/"],
    [/from '\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/shared\//g, "from '../../../../shared/"],
  ]],
  ['src/modules/system/tools/media', [
    [/from '\.\.\/\.\.\/\.\.\/core\//g, "from '../../../../core/"],
    [/from '\.\.\/\.\.\/\.\.\/shared\//g, "from '../../../../shared/"],
    [/from '\.\.\/\.\.\/\.\.\/infrastructure\//g, "from '../../../../infrastructure/"],
    [/from '\.\.\/\.\.\/\.\.\/\.\.\/core\//g, "from '../../../../core/"],
    [/from '\.\.\/\.\.\/\.\.\/\.\.\/shared\//g, "from '../../../../shared/"],
    [/from '\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/core\//g, "from '../../../../core/"],
    [/from '\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/shared\//g, "from '../../../../shared/"],
    [/from '\.\.\/\.\.\/\.\.\/services\//g, "from '../../services/"],
    [/from '\.\.\/\.\.\/services\//g, "from '../../services/"],
  ]],
  ['src/modules/system/tools/search', [
    [/from '\.\.\/\.\.\/\.\.\/core\//g, "from '../../../../core/"],
    [/from '\.\.\/\.\.\/\.\.\/shared\//g, "from '../../../../shared/"],
    [/from '\.\.\/\.\.\/\.\.\/\.\.\/core\//g, "from '../../../../core/"],
    [/from '\.\.\/\.\.\/\.\.\/\.\.\/shared\//g, "from '../../../../shared/"],
    [/from '\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/core\//g, "from '../../../../core/"],
    [/from '\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/shared\//g, "from '../../../../shared/"],
    [/from '\.\.\/services\//g, "from '../../services/"],
  ]],
  ['src/modules/system/tools/social', [
    [/from '\.\.\/\.\.\/\.\.\/core\//g, "from '../../../../core/"],
    [/from '\.\.\/\.\.\/\.\.\/shared\//g, "from '../../../../shared/"],
    [/from '\.\.\/\.\.\/\.\.\/infrastructure\//g, "from '../../../../infrastructure/"],
    [/from '\.\.\/\.\.\/\.\.\/\.\.\/core\//g, "from '../../../../core/"],
    [/from '\.\.\/\.\.\/\.\.\/\.\.\/shared\//g, "from '../../../../shared/"],
    [/from '\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/core\//g, "from '../../../../core/"],
    [/from '\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/shared\//g, "from '../../../../shared/"],
    [/from '\.\.\/\.\.\/\.\.\/\.\.\/infrastructure\//g, "from '../../../../infrastructure/"],
  ]],
  ['src/modules/system/tools/task', [
    [/from '\.\.\/\.\.\/\.\.\/core\//g, "from '../../../../core/"],
    [/from '\.\.\/\.\.\/\.\.\/shared\//g, "from '../../../../shared/"],
    [/from '\.\.\/\.\.\/\.\.\/\.\.\/core\//g, "from '../../../../core/"],
    [/from '\.\.\/\.\.\/\.\.\/\.\.\/shared\//g, "from '../../../../shared/"],
    [/from '\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/core\//g, "from '../../../../core/"],
    [/from '\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/shared\//g, "from '../../../../shared/"],
    [/from '\.\.\/\.\.\/background-agent\//g, "from '../../../background-agent/"],
    [/from '\.\.\/\.\.\/\.\.\/background-agent\//g, "from '../../../background-agent/"],
    [/from '\.\.\/media\/createFile\//g, "from '../media/createFile/"],
  ]],
  // createFile subfolder - 5 levels up
  ['src/modules/system/tools/media/createFile', [
    [/from '\.\.\/\.\.\/\.\.\/\.\.\/libs\//g, "from '../../../../../libs/"],
    [/from '\.\.\/\.\.\/\.\.\/\.\.\/shared\//g, "from '../../../../../shared/"],
    [/from '\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/libs\//g, "from '../../../../../libs/"],
    [/from '\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/shared\//g, "from '../../../../../shared/"],
    [/from '\.\.\/\.\.\/\.\.\/services\//g, "from '../../../services/"],
    [/from '\.\.\/\.\.\/services\//g, "from '../../../services/"],
  ]],
  // Gateway handlers - 3 levels up
  ['src/modules/gateway/handlers', [
    [/from '\.\.\/\.\.\/\.\.\/core\//g, "from '../../../core/"],
    [/from '\.\.\/\.\.\/\.\.\/shared\//g, "from '../../../shared/"],
    [/from '\.\.\/\.\.\/\.\.\/infrastructure\//g, "from '../../../infrastructure/"],
    [/from '\.\.\/\.\.\/\.\.\/\.\.\/core\//g, "from '../../../core/"],
    [/from '\.\.\/\.\.\/\.\.\/\.\.\/shared\//g, "from '../../../shared/"],
    [/from '\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/core\//g, "from '../../../core/"],
    [/from '\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/shared\//g, "from '../../../shared/"],
    [/from '\.\.\/\.\.\/\.\.\/\.\.\/infrastructure\//g, "from '../../../infrastructure/"],
    [/from '\.\.\/\.\.\/shared\/constants\//g, "from '../../../shared/constants/"],
  ]],
  // context.ts
  ['src/core/base', [
    [/from '\.\.\/\.\.\/modules\/gateway\/response\.handler\.js'/g, "from '../../modules/gateway/handlers/response.handler.js'"],
  ]],
  // shared/utils subfolders
  ['src/shared/utils/history', [
    [/from '\.\/userStore\.js'/g, "from '../userStore.js'"],
  ]],
  ['src/shared/utils/markdown', [
    [/from '\.\/httpClient\.js'/g, "from '../httpClient.js'"],
  ]],
];

function fixFile(filePath: string, replacements: [RegExp, string][]) {
  let content = readFileSync(filePath, 'utf-8');
  let changed = false;
  
  for (const [pattern, replacement] of replacements) {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      changed = true;
    }
  }
  
  if (changed) {
    writeFileSync(filePath, content);
    console.log(`Fixed: ${filePath}`);
  }
}

function walkDir(dir: string, replacements: [RegExp, string][]) {
  try {
    const files = readdirSync(dir);
    for (const file of files) {
      const filePath = join(dir, file);
      const stat = statSync(filePath);
      if (stat.isDirectory()) {
        walkDir(filePath, replacements);
      } else if (file.endsWith('.ts')) {
        fixFile(filePath, replacements);
      }
    }
  } catch (e) {
    // Directory doesn't exist
  }
}

// Apply fixes
for (const [dir, replacements] of toolFixes) {
  walkDir(dir, replacements);
}

// Fix index.ts exports
const indexPath = 'src/shared/utils/index.ts';
let indexContent = readFileSync(indexPath, 'utf-8');
indexContent = indexContent.replace(/clearUserCache/g, 'clearCache');
indexContent = indexContent.replace(/updateUserRole/g, 'setUserRole');
// Check if setUserRole exists, if not use what's available
writeFileSync(indexPath, indexContent);
console.log(`Fixed: ${indexPath}`);

console.log('Done!');
