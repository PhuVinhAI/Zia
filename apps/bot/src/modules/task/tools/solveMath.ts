/**
 * Tool: solveMath - Giải toán và xuất file DOCX với công thức đẹp
 */

import { z } from 'zod';
import type { ITool, ToolResult } from '../../../core/types.js';
import { validateParamsWithExample } from '../../../shared/schemas/tools.schema.js';
import { docxHandler } from '../../media/tools/createFile/docxHandler.js';

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
  description: `Giải bài toán và xuất file DOCX với công thức đẹp.

**CÁCH VIẾT CÔNG THỨC - BẮT BUỘC DÙNG $...$:**
- Inline math: $x^2 + y^2 = z^2$
- Block math (căn giữa): $$\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$

**LATEX SYNTAX ĐƯỢC HỖ TRỢ:**

Mũ/Chỉ số: $x^2$, $x^{n+1}$, $a_1$, $a_{i+1}$, $x^0$ → x⁰

Greek: $\\alpha$ $\\beta$ $\\gamma$ $\\delta$ $\\theta$ $\\pi$ $\\sigma$ $\\omega$ $\\Sigma$ $\\Delta$ $\\Omega$

Operators: $\\times$ $\\div$ $\\pm$ $\\cdot$ $\\leq$ $\\geq$ $\\neq$ $\\approx$ $\\equiv$

Tập hợp: $\\in$ $\\notin$ $\\subset$ $\\supset$ $\\subseteq$ $\\supseteq$ $\\emptyset$

Mũi tên: $\\rightarrow$ $\\leftarrow$ $\\Rightarrow$ $\\Leftarrow$ $\\leftrightarrow$

Calculus: $\\sum$ $\\prod$ $\\int$ $\\oint$ $\\infty$ $\\partial$ $\\nabla$

Logic: $\\forall$ $\\exists$ $\\therefore$ $\\because$

Phân số đơn giản: $\\frac{1}{2}$ $\\frac{1}{3}$ $\\frac{2}{3}$ $\\frac{1}{4}$ $\\frac{3}{4}$

Căn: $\\sqrt$

**VÍ DỤ ĐÚNG:**
- Bài toán 0⁰: "Giải bài toán $0^0$"
- Chuỗi: "$\\sum_{n=0}^{\\infty} a_n x^n$"
- Giới hạn: "$\\lim_{x \\rightarrow 0}$"
- Tích phân: "$\\int_0^1 x^2 dx$"

**MARKDOWN:** # heading, **bold**, *italic*, - list, 1. numbered, [!INFO] callout`,
  parameters: [
    {
      name: 'problem',
      type: 'string',
      description: 'Đề bài toán - dùng $...$ cho công thức: $x^2$, $\\alpha$, $\\sum$',
      required: true,
    },
    {
      name: 'solution',
      type: 'string',
      description: 'Lời giải chi tiết - dùng $...$ cho công thức, markdown cho format',
      required: true,
    },
    {
      name: 'title',
      type: 'string',
      description: 'Tiêu đề file (mặc định: "Lời giải bài toán")',
      required: false,
    },
  ],
  execute: async (params: Record<string, unknown>): Promise<ToolResult> => {
    const validation = validateParamsWithExample(SolveMathSchema, params, 'solveMath');
    if (!validation.success) return { success: false, error: validation.error };

    try {
      // Tạo nội dung markdown
      const content = buildMathContent(validation.data);

      // Tạo file DOCX trực tiếp
      const docxBuffer = await docxHandler(content, {
        filename: 'giai-toan.docx',
        content,
        title: validation.data.title,
        author: 'Zia AI Bot',
      });

      return {
        success: true,
        data: {
          fileBuffer: docxBuffer,
          filename: 'giai-toan.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          fileSize: docxBuffer.length,
          fileType: 'docx',
          title: validation.data.title,
        },
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Lỗi tạo DOCX: ${msg}` };
    }
  },
};
