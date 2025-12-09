/**
 * Script test DOCX Builder - Xuất file Word với các định dạng đầy đủ
 * Run: npx tsx scripts/test-docx.ts
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { buildWordDocument } from '../src/libs/docx-builder/index.js';

const OUTPUT_DIR = './scripts/output';

if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ═══════════════════════════════════════════════════
// TEST 1: Full Features với Markdown
// ═══════════════════════════════════════════════════
async function testFullFeatures() {
  console.log('📄 Test 1: Full Features Document...');

  const content = `[COVER:DOCX Framework Demo:Tổng hợp tất cả tính năng:Zia AI Bot:Zia Corporation:December 2024:v1.0:professional]

# Giới thiệu

Đây là tài liệu demo đầy đủ các tính năng của **DOCX Framework**. Framework này hỗ trợ tạo file Word chuyên nghiệp từ markdown.

## Tính năng chính

- Hỗ trợ markdown chuẩn
- Tables với styling
- Code blocks với syntax highlighting
- Math expressions (LaTeX)
- Highlights và text formatting
- Cover pages
- Table of Contents tự động
- Header/Footer với page numbers

[DIVIDER:decorated:Text Formatting]

# Text Formatting

## Basic Formatting

Đây là **bold text**, *italic text*, và ***bold italic***. Có thể dùng ~~strikethrough~~ và \`inline code\`.

## Alignment

->Đây là text căn giữa<-

->Đây là text căn phải

## Highlights

Có thể ==highlight text màu vàng== hoặc dùng syntax mở rộng:

[HIGHLIGHT:green]Text màu xanh lá[/HIGHLIGHT]

[HIGHLIGHT:cyan]Text màu cyan[/HIGHLIGHT]

[HIGHLIGHT:magenta]Text màu hồng[/HIGHLIGHT]

[DIVIDER:star]

# Lists

## Bullet List

- Item cấp 1
- Item cấp 1 khác
  - Item cấp 2 nested
  - Item cấp 2 khác
    - Item cấp 3 deep nested
- Item cuối cùng

## Numbered List

1. Bước đầu tiên
2. Bước thứ hai
   1. Bước con 2.1
   2. Bước con 2.2
3. Bước thứ ba
4. Bước cuối cùng

## Definition List

API
: Application Programming Interface - Giao diện lập trình ứng dụng

SDK
: Software Development Kit - Bộ công cụ phát triển phần mềm

[DIVIDER:double]

# Tables

## Basic Table

| Feature | Status | Priority |
|---------|--------|----------|
| Login | Done | High |
| Dashboard | In Progress | High |
| Reports | Pending | Medium |
| Settings | Planned | Low |

## Comparison Table

| Aspect | Plan A | Plan B | Plan C |
|--------|--------|--------|--------|
| Price | $10/mo | $25/mo | $50/mo |
| Users | 5 | 25 | Unlimited |
| Storage | 10GB | 50GB | 500GB |
| Support | Email | Chat | 24/7 Phone |

[DIVIDER:floral]

# Code Blocks

## JavaScript

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

## TypeScript

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

## Python

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

[DIVIDER:dashed]

# Math Expressions

## Inline Math

Công thức năng lượng nổi tiếng: $E = mc^2$

Phương trình bậc hai: $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$

## Block Math

Tổng dãy số: $\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$

Tích phân: $\\int_0^\\infty e^{-x} dx = 1$

## Greek Letters

- Alpha: $\\alpha$, Beta: $\\beta$, Gamma: $\\gamma$
- Pi: $\\pi$, Sigma: $\\sigma$, Delta: $\\delta$
- Theta: $\\theta$, Lambda: $\\lambda$, Omega: $\\omega$

[DIVIDER:dotted]

# Blockquotes

> "The only way to do great work is to love what you do."
> 
> — Steve Jobs

> **Lưu ý quan trọng:**
> Đây là một blockquote với nhiều dòng.
> Có thể chứa **bold** và *italic* text.

[DIVIDER]

# Footnotes

Đây là text với footnote đầu tiên[^1]. Và đây là footnote thứ hai[^2].

[^1]: Đây là nội dung footnote đầu tiên.
[^2]: Đây là nội dung footnote thứ hai với nhiều chi tiết hơn.

[PAGE_BREAK]

# Kết luận

DOCX Framework cung cấp đầy đủ các tính năng để tạo tài liệu Word chuyên nghiệp:

1. **Text formatting** - Bold, italic, strikethrough, highlights
2. **Lists** - Bullet, numbered, definition lists
3. **Tables** - Markdown tables với styling
4. **Code blocks** - Syntax highlighting
5. **Math** - LaTeX expressions
6. **Structure** - Cover page, TOC, headers/footers
7. **Dividers** - Multiple styles

---

*Tài liệu được tạo bởi Zia AI Bot - December 2024*
`;

  const buffer = await buildWordDocument(content, {
    title: 'DOCX Framework Demo',
    author: 'Zia AI Bot',
    theme: { name: 'professional' } as any,
    pageSize: 'A4',
    orientation: 'portrait',
    margins: { top: 25, bottom: 25, left: 25, right: 25 },
    header: { text: 'DOCX Framework Demo', alignment: 'center', includePageNumber: true },
    footer: { text: 'Zia AI Bot - December 2024', alignment: 'center' },
    includeToc: true,
    tocTitle: 'Mục Lục',
  });

  writeFileSync(`${OUTPUT_DIR}/01-docx-full-features.docx`, buffer);
  console.log(`✅ Saved: ${OUTPUT_DIR}/01-docx-full-features.docx`);
}

// ═══════════════════════════════════════════════════
// TEST 2: All Themes
// ═══════════════════════════════════════════════════
async function testAllThemes() {
  console.log('🎨 Test 2: All Themes...');

  const themes = ['default', 'professional', 'modern', 'academic', 'minimal'];

  for (const themeName of themes) {
    const content = `# Theme: ${themeName.charAt(0).toUpperCase() + themeName.slice(1)}

Đây là demo của theme **${themeName}**.

## Heading 2

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

### Heading 3

- Bullet point 1
- Bullet point 2
- Bullet point 3

## Table Example

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
| Data 4   | Data 5   | Data 6   |

## Code Block

\`\`\`javascript
const theme = "${themeName}";
console.log(\`Using \${theme} theme\`);
\`\`\`

## Math

$E = mc^2$

> This is a blockquote in ${themeName} theme.
`;

    const buffer = await buildWordDocument(content, {
      title: `Theme Demo - ${themeName}`,
      theme: { name: themeName } as any,
      header: { text: `Theme: ${themeName}`, alignment: 'right' },
      footer: { text: 'Page', alignment: 'center', includePageNumber: true },
    });

    writeFileSync(`${OUTPUT_DIR}/docx-theme-${themeName}.docx`, buffer);
  }

  console.log(`✅ Saved: ${OUTPUT_DIR}/docx-theme-*.docx (5 files)`);
}

// ═══════════════════════════════════════════════════
// TEST 3: Cover Pages
// ═══════════════════════════════════════════════════
async function testCoverPages() {
  console.log('📑 Test 3: Cover Pages...');

  const styles = ['simple', 'professional', 'academic', 'modern'];

  for (const style of styles) {
    const content = `[COVER:Project Report:Quarterly Analysis Q4 2024:John Doe:Acme Corporation:December 2024:v2.1:${style}]

# Executive Summary

This document provides a comprehensive analysis of Q4 2024 performance metrics.

## Key Highlights

- Revenue increased by 25%
- Customer satisfaction at 95%
- New product launches successful

## Recommendations

1. Continue current strategy
2. Invest in R&D
3. Expand market presence
`;

    const buffer = await buildWordDocument(content, {
      title: `Cover Page - ${style}`,
    });

    writeFileSync(`${OUTPUT_DIR}/docx-cover-${style}.docx`, buffer);
  }

  console.log(`✅ Saved: ${OUTPUT_DIR}/docx-cover-*.docx (4 files)`);
}

// ═══════════════════════════════════════════════════
// TEST 4: Dividers
// ═══════════════════════════════════════════════════
async function testDividers() {
  console.log('✂️ Test 4: Dividers...');

  const content = `# Divider Styles Demo

## Solid Divider (Default)

[DIVIDER]

Content after solid divider.

## Dashed Divider

[DIVIDER:dashed]

Content after dashed divider.

## Dotted Divider

[DIVIDER:dotted]

Content after dotted divider.

## Double Divider

[DIVIDER:double]

Content after double divider.

## Thick Divider

[DIVIDER:thick]

Content after thick divider.

## Decorated Divider

[DIVIDER:decorated:Section Title]

Content after decorated divider with text.

## Star Divider

[DIVIDER:star]

Content after star divider.

## Floral Divider

[DIVIDER:floral]

Content after floral divider.
`;

  const buffer = await buildWordDocument(content, {
    title: 'Divider Styles Demo',
    theme: { name: 'professional' } as any,
  });

  writeFileSync(`${OUTPUT_DIR}/04-docx-dividers.docx`, buffer);
  console.log(`✅ Saved: ${OUTPUT_DIR}/04-docx-dividers.docx`);
}

// ═══════════════════════════════════════════════════
// TEST 5: Math Expressions
// ═══════════════════════════════════════════════════
async function testMathExpressions() {
  console.log('➗ Test 5: Math Expressions...');

  const content = `# Mathematical Expressions

## Basic Operations

Addition: $a + b$

Subtraction: $a - b$

Multiplication: $a \\times b$ or $a \\cdot b$

Division: $\\frac{a}{b}$

## Powers and Roots

Square: $x^2$

Cube: $x^3$

Square root: $\\sqrt{x}$

Nth root: $\\sqrt[n]{x}$

## Greek Letters

Lowercase: $\\alpha, \\beta, \\gamma, \\delta, \\epsilon, \\pi, \\sigma, \\omega$

Uppercase: $\\Gamma, \\Delta, \\Sigma, \\Omega$

## Calculus

Derivative: $\\frac{dy}{dx}$

Partial derivative: $\\frac{\\partial f}{\\partial x}$

Integral: $\\int_a^b f(x) dx$

Double integral: $\\iint_D f(x,y) dA$

## Summation and Products

Sum: $\\sum_{i=1}^{n} x_i$

Product: $\\prod_{i=1}^{n} x_i$

## Famous Equations

Einstein's mass-energy: $E = mc^2$

Pythagorean theorem: $a^2 + b^2 = c^2$

Quadratic formula: $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$

Euler's identity: $e^{i\\pi} + 1 = 0$

## Limits

$\\lim_{x \\to \\infty} \\frac{1}{x} = 0$

$\\lim_{n \\to \\infty} (1 + \\frac{1}{n})^n = e$
`;

  const buffer = await buildWordDocument(content, {
    title: 'Mathematical Expressions',
    theme: { name: 'academic' } as any,
  });

  writeFileSync(`${OUTPUT_DIR}/05-docx-math.docx`, buffer);
  console.log(`✅ Saved: ${OUTPUT_DIR}/05-docx-math.docx`);
}

// ═══════════════════════════════════════════════════
// TEST 6: Tables
// ═══════════════════════════════════════════════════
async function testTables() {
  console.log('📊 Test 6: Tables...');

  const content = `# Table Styles Demo

## Simple Table

| Name | Age | City |
|------|-----|------|
| John | 25 | NYC |
| Jane | 30 | LA |
| Bob | 35 | Chicago |

## Wide Table

| ID | Product | Category | Price | Stock | Status | Rating |
|----|---------|----------|-------|-------|--------|--------|
| 1 | Laptop | Electronics | $999 | 50 | Active | 4.5 |
| 2 | Phone | Electronics | $699 | 100 | Active | 4.8 |
| 3 | Tablet | Electronics | $499 | 75 | Active | 4.2 |
| 4 | Watch | Wearables | $299 | 200 | Active | 4.6 |

## Comparison Table

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Users | 1 | 10 | Unlimited |
| Storage | 1GB | 100GB | 1TB |
| Support | Email | Chat | 24/7 Phone |
| API | No | Yes | Yes |
| SSO | No | No | Yes |
| Price | $0 | $29/mo | $99/mo |

## Table with Formatting

| Feature | Description | Status |
|---------|-------------|--------|
| **Bold** | Text in bold | ✅ Done |
| *Italic* | Text in italic | ✅ Done |
| \`Code\` | Inline code | ✅ Done |
`;

  const buffer = await buildWordDocument(content, {
    title: 'Table Styles Demo',
    theme: { name: 'default' } as any,
  });

  writeFileSync(`${OUTPUT_DIR}/06-docx-tables.docx`, buffer);
  console.log(`✅ Saved: ${OUTPUT_DIR}/06-docx-tables.docx`);
}

// ═══════════════════════════════════════════════════
// TEST 7: Footnotes
// ═══════════════════════════════════════════════════
async function testFootnotes() {
  console.log('📝 Test 7: Footnotes...');

  const content = `# Footnotes Demo

## Introduction

This document demonstrates the footnote feature[^1]. Footnotes are useful for adding references and additional information[^2].

## Academic Writing

In academic writing, footnotes are commonly used for citations[^3]. They help maintain the flow of the main text while providing necessary references[^4].

## Technical Documentation

Technical documents often use footnotes to explain terminology[^5] or provide links to external resources.

## Conclusion

Footnotes enhance document readability by separating supplementary information from the main content[^6].

[^1]: This is the first footnote explaining the basic concept.
[^2]: Footnotes appear at the bottom of the page in Word documents.
[^3]: See "Academic Writing Guidelines" by Smith, 2023.
[^4]: References should follow a consistent citation style.
[^5]: Terminology explanations help readers understand technical terms.
[^6]: Proper use of footnotes improves document organization.
`;

  const buffer = await buildWordDocument(content, {
    title: 'Footnotes Demo',
    theme: { name: 'academic' } as any,
    header: { text: 'Footnotes Example', alignment: 'center' },
    footer: { text: 'Page', alignment: 'center', includePageNumber: true },
  });

  writeFileSync(`${OUTPUT_DIR}/07-docx-footnotes.docx`, buffer);
  console.log(`✅ Saved: ${OUTPUT_DIR}/07-docx-footnotes.docx`);
}

// ═══════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════
async function main() {
  console.log('🚀 DOCX Builder Test Suite\n');
  console.log('═'.repeat(50));

  try {
    await testFullFeatures();
    await testAllThemes();
    await testCoverPages();
    await testDividers();
    await testMathExpressions();
    await testTables();
    await testFootnotes();

    console.log('\n' + '═'.repeat(50));
    console.log('✅ All tests completed!');
    console.log(`📁 Output directory: ${OUTPUT_DIR}`);
    console.log('\nGenerated files:');
    console.log('  - 01-docx-full-features.docx (All features demo)');
    console.log('  - docx-theme-*.docx (5 theme variants)');
    console.log('  - docx-cover-*.docx (4 cover page styles)');
    console.log('  - 04-docx-dividers.docx (Divider styles)');
    console.log('  - 05-docx-math.docx (Math expressions)');
    console.log('  - 06-docx-tables.docx (Table styles)');
    console.log('  - 07-docx-footnotes.docx (Footnotes demo)');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
