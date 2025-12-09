/**
 * Integration Test: solveMath Tool
 * Test chức năng giải toán và xuất DOCX
 */

import { describe, test, expect } from 'bun:test';
import { solveMathTool } from '../../../src/modules/system/tools/task/solveMath.js';
import { mockToolContext } from '../setup.js';

describe('solveMath Tool Integration', () => {
  test('solveMath - bài toán đơn giản', async () => {
    const result = await solveMathTool.execute({
      problem: 'Tính $2 + 3 = ?$',
      solution: 'Ta có: $2 + 3 = 5$\n\nVậy kết quả là **5**.',
      title: 'Bài toán cộng',
    }, mockToolContext);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.fileBuffer).toBeInstanceOf(Buffer);
    expect(result.data.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(result.data.filename).toBe('giai-toan.docx');
  }, 60000);

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
    expect(result.data.fileType).toBe('docx');
  }, 60000);
});

// Validation tests
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
