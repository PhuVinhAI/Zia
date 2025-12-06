/**
 * Integration Test: File Creation (DOCX, XLSX, PPTX, PDF)
 * Test các chức năng tạo file văn phòng
 */

import { describe, test, expect } from 'bun:test';
import { docxHandler } from '../../../src/modules/system/tools/createFile/docxHandler.js';
import { xlsxHandler } from '../../../src/modules/system/tools/createFile/xlsxHandler.js';
import { pptxHandler } from '../../../src/modules/system/tools/createFile/pptxHandler.js';
import { TEST_CONFIG } from '../setup.js';

describe('File Creation Integration', () => {
  describe('DOCX Handler', () => {
    test('docxHandler - tạo document đơn giản', async () => {
      const content = `
# Test Document

This is a **test** document with *formatting*.

## Section 1

- Item 1
- Item 2
- Item 3

## Section 2

1. First
2. Second
3. Third
      `.trim();

      const buffer = await docxHandler(content, {
        filename: 'test.docx',
        content,
        title: 'Test Document',
      });

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(1000);

      // Check DOCX magic bytes (PK zip header)
      expect(buffer[0]).toBe(0x50); // P
      expect(buffer[1]).toBe(0x4b); // K
    }, TEST_CONFIG.timeout);

    test('docxHandler - với bảng', async () => {
      const content = `
# Document with Table

| Name | Age | City |
|------|-----|------|
| John | 30 | NYC |
| Jane | 25 | LA |
      `.trim();

      const buffer = await docxHandler(content, {
        filename: 'table.docx',
        content,
      });

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(1000);
    }, TEST_CONFIG.timeout);

    test('docxHandler - với code block', async () => {
      const content = `
# Code Example

\`\`\`typescript
function hello(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`
      `.trim();

      const buffer = await docxHandler(content, {
        filename: 'code.docx',
        content,
      });

      expect(buffer).toBeInstanceOf(Buffer);
    }, TEST_CONFIG.timeout);
  });

  describe('XLSX Handler', () => {
    test('xlsxHandler - tạo spreadsheet đơn giản', async () => {
      const content = `
| Product | Price | Quantity | Total |
|---------|-------|----------|-------|
| Apple | 1.5 | 10 | 15 |
| Banana | 0.5 | 20 | 10 |
| Orange | 2.0 | 5 | 10 |
      `.trim();

      const buffer = await xlsxHandler(content, {
        filename: 'products.xlsx',
        content,
      });

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(1000);

      // Check XLSX magic bytes (PK zip header)
      expect(buffer[0]).toBe(0x50);
      expect(buffer[1]).toBe(0x4b);
    }, TEST_CONFIG.timeout);

    test('xlsxHandler - với nhiều dữ liệu', async () => {
      const rows = Array.from({ length: 50 }, (_, i) => `| Item ${i + 1} | ${i * 10} | ${i + 1} |`);
      const content = `
| Name | Value | Count |
|------|-------|-------|
${rows.join('\n')}
      `.trim();

      const buffer = await xlsxHandler(content, {
        filename: 'large.xlsx',
        content,
      });

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(2000);
    }, TEST_CONFIG.timeout);
  });

  describe('PPTX Handler', () => {
    test('pptxHandler - tạo presentation đơn giản', async () => {
      const content = `
# Presentation Title

---

## Slide 1: Introduction

- Point 1
- Point 2
- Point 3

---

## Slide 2: Details

This is the content of slide 2.

---

## Slide 3: Conclusion

Thank you!
      `.trim();

      const buffer = await pptxHandler(content, {
        filename: 'presentation.pptx',
        content,
        title: 'Test Presentation',
      });

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(10000);

      // Check PPTX magic bytes (PK zip header)
      expect(buffer[0]).toBe(0x50);
      expect(buffer[1]).toBe(0x4b);
    }, TEST_CONFIG.timeout);

    test('pptxHandler - với bảng trong slide', async () => {
      const content = `
# Data Presentation

---

## Sales Data

| Quarter | Revenue |
|---------|---------|
| Q1 | $100K |
| Q2 | $150K |
| Q3 | $200K |
| Q4 | $250K |
      `.trim();

      const buffer = await pptxHandler(content, {
        filename: 'data.pptx',
        content,
      });

      expect(buffer).toBeInstanceOf(Buffer);
    }, TEST_CONFIG.timeout);
  });
});
