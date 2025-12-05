/**
 * Tool: solveMath - Giải toán và xuất PDF với công thức đẹp
 * Tạo DOCX bằng Word framework rồi convert sang PDF qua ComPDF API
 */

import { z } from 'zod';
import type { ITool, ToolResult } from '../../../core/types.js';
import { validateParams } from '../../../shared/schemas/tools.schema.js';
import { convertDocxToPdfViaApi } from '../services/compdfService.js';
import { docxHandler } from './createFile/docxHandler.js';

export const SolveMathSchema = z.object({
  problem: z.string().min(1, 'Thiếu đề bài toán'),
  solution: z.string().min(1, 'Thiếu lời giải'),
  title: z.string().optional().default('Lời giải bài toán'),
});

export type SolveMathParams = z.infer<typeof SolveMathSchema>;

/**
 * Tạo nội dung markdown cho bài giải toán
 */
function buildMathContent(params: SolveMathParams): string {
  const lines: string[] = [];

  // Title
  lines.push(`# ${params.title}`);
  lines.push('');

  // Đề bài
  lines.push('## 📝 ĐỀ BÀI');
  lines.push('');
  lines.push(params.problem);
  lines.push('');
  lines.push('[DIVIDER]');
  lines.push('');

  // Lời giải
  lines.push('## ✅ LỜI GIẢI');
  lines.push('');
  lines.push(params.solution);

  return lines.join('\n');
}

export const solveMathTool: ITool = {
  name: 'solveMath',
  description: `Giải bài toán và xuất PDF với công thức đẹp. Dùng khi user hỏi bài toán phức tạp có nhiều công thức.

**CÁCH DÙNG:**
- problem: Đề bài (có thể chứa LaTeX trong $...$ hoặc $$...$$)
- solution: Lời giải chi tiết với các bước, công thức LaTeX

**LATEX SYNTAX:**
- Inline: $x^2 + y^2 = z^2$
- Display: $$\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$
- Phân số: \\frac{a}{b}, Căn: \\sqrt{x}
- Mũ: x^2, x^{n+1}, Chỉ số: x_1, x_{i+1}
- Greek: \\alpha, \\beta, \\pi, \\theta, \\Delta
- Operators: \\times, \\div, \\pm, \\leq, \\geq, \\neq
- Calculus: \\int, \\sum, \\lim, \\infty`,
  parameters: [
    {
      name: 'problem',
      type: 'string',
      description: 'Đề bài toán (hỗ trợ LaTeX: $inline$ hoặc $$display$$)',
      required: true,
    },
    {
      name: 'solution',
      type: 'string',
      description: 'Lời giải chi tiết với các bước và công thức LaTeX',
      required: true,
    },
    {
      name: 'title',
      type: 'string',
      description: 'Tiêu đề PDF (mặc định: "Lời giải bài toán")',
      required: false,
    },
  ],
  execute: async (params: Record<string, unknown>): Promise<ToolResult> => {
    const validation = validateParams(SolveMathSchema, params);
    if (!validation.success) return { success: false, error: validation.error };

    try {
      // Bước 1: Tạo nội dung markdown
      const content = buildMathContent(validation.data);

      // Bước 2: Tạo DOCX bằng Word framework
      const docxBuffer = await docxHandler(content, {
        filename: 'giai-toan.docx',
        content,
        title: validation.data.title,
        author: 'Zia AI Bot',
      });

      // Bước 3: Convert DOCX sang PDF qua ComPDF API
      const pdfBuffer = await convertDocxToPdfViaApi(docxBuffer, 'giai-toan.docx');

      if (!pdfBuffer) {
        return {
          success: false,
          error: 'Không thể convert sang PDF. Vui lòng kiểm tra COMPDF_API_KEY.',
        };
      }

      return {
        success: true,
        data: {
          fileBuffer: pdfBuffer,
          filename: 'giai-toan.pdf',
          mimeType: 'application/pdf',
          fileSize: pdfBuffer.length,
          fileType: 'pdf',
          title: validation.data.title,
        },
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Lỗi tạo PDF: ${msg}` };
    }
  },
};
