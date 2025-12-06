/**
 * Integration Test: solveMath Tool
 * Test chức năng giải toán và xuất PDF
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { solveMathTool } from '../../../src/modules/system/tools/solveMath.js';
import { hasApiKey, TEST_CONFIG, mockToolContext } from '../setup.js';

// solveMath cần ComPDF API để convert DOCX -> PDF
const SKIP = !hasApiKey('compdf');

describe.skipIf(SKIP)('solveMath Tool Integration', () => {
  beforeAll(() => {
    if (SKIP) console.log('⏭️  Skipping solveMath tests: COMPDF_API_KEY not configured');
  });

  test('solveMath - bài toán đơn giản', async () => {
    const result = await solveMathTool.execute({
      problem: 'Tính $2 + 3 = ?$',
      solution: 'Ta có: $2 + 3 = 5$\n\nVậy kết quả là **5**.',
      title: 'Bài toán cộng',
    }, mockToolContext);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.fileBuffer).toBeInstanceOf(Buffer);
    expect(result.data.mimeType).toBe('application/pdf');
    expect(result.data.filename).toBe('giai-toan.pdf');
  }, 120000);

  test('solveMath - với công thức phức tạp', async () => {
    const result = await solveMathTool.execute({
      problem: 'Giải phương trình bậc 2: $ax^2 + bx + c = 0$',
      solution: `Sử dụng công thức nghiệm:
      
$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$

Với $\\Delta = b^2 - 4ac$:
- Nếu $\\Delta > 0$: Phương trình có 2 nghiệm phân biệt
- Nếu $\\Delta = 0$: Phương trình có nghiệm kép
- Nếu $\\Delta < 0$: Phương trình vô nghiệm`,
    }, mockToolContext);

    expect(result.success).toBe(true);
    expect(result.data.fileBuffer.length).toBeGreaterThan(1000);
  }, 120000);

  test('solveMath - validation error (thiếu problem)', async () => {
    const result = await solveMathTool.execute({
      solution: 'Lời giải',
    }, mockToolContext);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('solveMath - validation error (thiếu solution)', async () => {
    const result = await solveMathTool.execute({
      problem: 'Đề bài',
    }, mockToolContext);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// Validation tests that don't need API
describe('solveMath Validation', () => {
  test('validation - thiếu problem', async () => {
    const result = await solveMathTool.execute({
      solution: 'Lời giải',
    }, mockToolContext);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('validation - thiếu solution', async () => {
    const result = await solveMathTool.execute({
      problem: 'Đề bài',
    }, mockToolContext);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
