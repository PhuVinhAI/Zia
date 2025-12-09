/**
 * Script test PPTX Builder - Xuất file PPT với các định dạng cơ bản
 * Run: npx tsx scripts/test-pptx.ts
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { buildPresentation, PresentationBuilder } from '../src/libs/pptx-builder/index.js';

const OUTPUT_DIR = './scripts/output';

if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ═══════════════════════════════════════════════════
// TEST 1: Full Features với Markdown
// ═══════════════════════════════════════════════════
async function testFullFeatures() {
  console.log('📊 Test 1: Full Features Presentation...');

  const content = `<!--OPTIONS: {
  "title": "PPTX Framework Demo",
  "author": "Zia AI Bot",
  "theme": {"name": "professional"},
  "layout": "LAYOUT_16x9",
  "showSlideNumbers": true
} -->

# PPTX Framework Demo
## Tổng hợp tất cả tính năng
Zia AI Bot | December 2024

---

[SLIDE:section]
# 📝 Basic Elements
## Text, Lists & Formatting

---

# Bullet Lists
## Các loại danh sách

- Item cấp 1
- Item cấp 1 khác
  - Item cấp 2 nested
  - Item cấp 2 khác
    - Item cấp 3 deep nested
- Item cuối cùng

---

# Numbered Lists
## Danh sách đánh số

1. Bước đầu tiên
2. Bước thứ hai
3. Bước thứ ba
4. Bước cuối cùng

---

# Checklist
## Task tracking

- [x] Đã hoàn thành task 1
- [x] Đã hoàn thành task 2
- [ ] Đang làm task 3
- [ ] Chưa bắt đầu task 4

---

[SLIDE:section]
# 📊 Tables
## Data presentation

---

# Basic Table

| Feature | Status | Priority |
|---------|--------|----------|
| Login | Done | High |
| Dashboard | In Progress | High |
| Reports | Pending | Medium |
| Settings | Planned | Low |

---

# Comparison Table

| Aspect | Plan A | Plan B | Plan C |
|--------|--------|--------|--------|
| Price | $10/mo | $25/mo | $50/mo |
| Users | 5 | 25 | Unlimited |
| Storage | 10GB | 50GB | 500GB |
| Support | Email | Chat | 24/7 Phone |

---

[SLIDE:section]
# 💻 Code Blocks
## Syntax highlighting

---

# JavaScript Code

\`\`\`javascript
async function fetchData(url) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}
\`\`\`

---

# TypeScript Code

\`\`\`typescript
interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

const getUser = async (id: number): Promise<User> => {
  return await api.get(\`/users/\${id}\`);
};
\`\`\`

---

# Python Code

\`\`\`python
def fibonacci(n: int) -> list[int]:
    """Generate Fibonacci sequence"""
    if n <= 0:
        return []
    
    fib = [0, 1]
    for i in range(2, n):
        fib.append(fib[i-1] + fib[i-2])
    
    return fib[:n]
\`\`\`

---

[SLIDE:quote]
[QUOTE:Innovation distinguishes between a leader and a follower. Stay hungry, stay foolish.:Steve Jobs]

---

# Blockquote Style

> The only way to do great work is to love what you do.
> If you haven't found it yet, keep looking. Don't settle.

---

[SLIDE:thankyou]
# Cảm ơn!
## Questions?
contact@example.com
www.example.com
`;

  const buffer = await buildPresentation(content, {
    title: 'PPTX Framework Demo',
    author: 'Zia AI Bot',
    showSlideNumbers: true,
  });

  writeFileSync(`${OUTPUT_DIR}/01-full-features.pptx`, buffer);
  console.log(`✅ Saved: ${OUTPUT_DIR}/01-full-features.pptx`);
}

// ═══════════════════════════════════════════════════
// TEST 2: All Themes
// ═══════════════════════════════════════════════════
async function testAllThemes() {
  console.log('🎨 Test 2: All Themes...');

  const themes = [
    'default',
    'professional',
    'modern',
    'dark',
    'minimal',
    'corporate',
    'creative',
    'nature',
    'tech',
    'elegant',
  ];

  for (const themeName of themes) {
    const content = `<!--OPTIONS: {
  "theme": {"name": "${themeName}"}
} -->

# Theme: ${themeName.charAt(0).toUpperCase() + themeName.slice(1)}
## PPTX Framework Theme Demo

---

# Content Slide
## With bullet points

- First bullet point
- Second bullet point
  - Nested item
- Third bullet point

---

# Table Example

| Feature | Status | Notes |
|---------|--------|-------|
| Design | Done | Approved |
| Dev | Progress | 80% |
| Test | Pending | Next week |

---

# Code Block

\`\`\`javascript
const theme = "${themeName}";
console.log(\`Using \${theme} theme\`);
\`\`\`

---

[SLIDE:quote]
[QUOTE:Design is not just what it looks like. Design is how it works.:Steve Jobs]

---

[SLIDE:thankyou]
# Thank You!
Theme: ${themeName}
`;

    const buffer = await buildPresentation(content, {
      title: `Theme Demo - ${themeName}`,
      showSlideNumbers: true,
    });

    writeFileSync(`${OUTPUT_DIR}/theme-${themeName}.pptx`, buffer);
  }

  console.log(`✅ Saved: ${OUTPUT_DIR}/theme-*.pptx (10 files)`);
}

// ═══════════════════════════════════════════════════
// TEST 3: Programmatic API
// ═══════════════════════════════════════════════════
async function testProgrammaticAPI() {
  console.log('🔧 Test 3: Programmatic API...');

  const builder = new PresentationBuilder({
    title: 'Programmatic API Demo',
    author: 'Zia AI Bot',
    theme: { name: 'modern' } as any,
    showSlideNumbers: true,
  });

  builder
    .addTitleSlide('Programmatic API', 'Building presentations with code', 'Zia AI Bot')
    .addSectionSlide('Section 1', 'Introduction')
    .addContentSlide('Features', [
      'Type-safe API',
      'Fluent interface',
      'Full customization',
      'Easy to use',
    ])

    .addQuoteSlide('Code is poetry', 'Anonymous Developer')
    .addThankYouSlide('Thank You!', ['github.com/example', 'contact@example.com']);

  const buffer = await builder.build();
  writeFileSync(`${OUTPUT_DIR}/03-programmatic-api.pptx`, buffer);
  console.log(`✅ Saved: ${OUTPUT_DIR}/03-programmatic-api.pptx`);
}

// ═══════════════════════════════════════════════════
// TEST 4: Complex Tables
// ═══════════════════════════════════════════════════
async function testComplexTables() {
  console.log('📊 Test 4: Complex Tables...');

  const content = `<!--OPTIONS: {
  "theme": {"name": "corporate"}
} -->

# Complex Tables Demo
## Various table styles

---

# Simple Table

| Name | Age | City |
|------|-----|------|
| John | 25 | NYC |
| Jane | 30 | LA |
| Bob | 35 | Chicago |

---

# Wide Table

| ID | Product | Category | Price | Stock | Status | Rating |
|----|---------|----------|-------|-------|--------|--------|
| 1 | Laptop | Electronics | $999 | 50 | Active | 4.5 |
| 2 | Phone | Electronics | $699 | 100 | Active | 4.8 |
| 3 | Tablet | Electronics | $499 | 75 | Active | 4.2 |
| 4 | Watch | Wearables | $299 | 200 | Active | 4.6 |

---

# Comparison Table

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Users | 1 | 10 | Unlimited |
| Storage | 1GB | 100GB | 1TB |
| Support | Email | Chat | 24/7 Phone |
| API | No | Yes | Yes |
| SSO | No | No | Yes |
| Price | $0 | $29/mo | $99/mo |

---

[SLIDE:thankyou]
# End of Tables Demo
`;

  const buffer = await buildPresentation(content, {
    title: 'Complex Tables Demo',
    showSlideNumbers: true,
  });

  writeFileSync(`${OUTPUT_DIR}/04-complex-tables.pptx`, buffer);
  console.log(`✅ Saved: ${OUTPUT_DIR}/04-complex-tables.pptx`);
}

// ═══════════════════════════════════════════════════
// TEST 5: Code Showcase
// ═══════════════════════════════════════════════════
async function testCodeShowcase() {
  console.log('💻 Test 5: Code Showcase...');

  const content = `<!--OPTIONS: {
  "theme": {"name": "tech"}
} -->

# Code Showcase
## Multiple programming languages

---

# JavaScript / TypeScript

\`\`\`typescript
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

async function fetchApi<T>(url: string): Promise<ApiResponse<T>> {
  const response = await fetch(url);
  return response.json();
}
\`\`\`

---

# Python

\`\`\`python
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class User:
    id: int
    name: str
    email: str
    roles: List[str]
    
    def has_role(self, role: str) -> bool:
        return role in self.roles
\`\`\`

---

# SQL

\`\`\`sql
SELECT 
    u.name,
    u.email,
    COUNT(o.id) as order_count,
    SUM(o.total) as total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01'
GROUP BY u.id
HAVING total_spent > 1000
ORDER BY total_spent DESC;
\`\`\`

---

[SLIDE:thankyou]
# Code Showcase Complete
github.com/example
`;

  const buffer = await buildPresentation(content, {
    title: 'Code Showcase',
    showSlideNumbers: true,
  });

  writeFileSync(`${OUTPUT_DIR}/05-code-showcase.pptx`, buffer);
  console.log(`✅ Saved: ${OUTPUT_DIR}/05-code-showcase.pptx`);
}

// ═══════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════
async function main() {
  console.log('🚀 PPTX Builder Test Suite\n');
  console.log('═'.repeat(50));

  try {
    await testFullFeatures();
    await testAllThemes();
    await testProgrammaticAPI();
    await testComplexTables();
    await testCodeShowcase();

    console.log('\n' + '═'.repeat(50));
    console.log('✅ All tests completed!');
    console.log(`📁 Output directory: ${OUTPUT_DIR}`);
    console.log('\nGenerated files:');
    console.log('  - 01-full-features.pptx (All features demo)');
    console.log('  - theme-*.pptx (10 theme variants)');
    console.log('  - 03-programmatic-api.pptx (Code API demo)');
    console.log('  - 04-complex-tables.pptx (Table styles)');
    console.log('  - 05-code-showcase.pptx (Code blocks)');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
