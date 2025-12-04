/**
 * Tool: solveMath - Giải toán và xuất PDF với công thức đẹp
 * Sử dụng Unicode math symbols để render công thức
 */

import PDFDocument from 'pdfkit';
import { z } from 'zod';
import type { ITool, ToolResult } from '../../../core/types.js';
import { validateParams } from '../../../shared/schemas/tools.schema.js';

export const SolveMathSchema = z.object({
  problem: z.string().min(1, 'Thiếu đề bài toán'),
  solution: z.string().min(1, 'Thiếu lời giải'),
  title: z.string().optional().default('Lời giải bài toán'),
});

export type SolveMathParams = z.infer<typeof SolveMathSchema>;

const FONT_PATHS: Record<string, { regular: string; bold: string; italic: string }> = {
  win32: {
    regular: 'C:/Windows/Fonts/arial.ttf',
    bold: 'C:/Windows/Fonts/arialbd.ttf',
    italic: 'C:/Windows/Fonts/ariali.ttf',
  },
  linux: {
    regular: '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    bold: '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    italic: '/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf',
  },
  darwin: {
    regular: '/System/Library/Fonts/Supplemental/Arial.ttf',
    bold: '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
    italic: '/System/Library/Fonts/Supplemental/Arial Italic.ttf',
  },
};

let fontsRegistered = false;

function registerFonts(doc: InstanceType<typeof PDFDocument>): boolean {
  const platform = process.platform as keyof typeof FONT_PATHS;
  const fonts = FONT_PATHS[platform] || FONT_PATHS.linux;
  try {
    const fs = require('node:fs');
    if (fs.existsSync(fonts.regular)) {
      doc.registerFont('MainFont', fonts.regular);
      doc.registerFont('MainFont-Bold', fonts.bold);
      doc.registerFont('MainFont-Italic', fonts.italic);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

function latexToUnicode(latex: string): string {
  return latex
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\sqrt\[(\d+)\]\{([^}]+)\}/g, '√[$1]($2)')
    .replace(/\^2/g, '²')
    .replace(/\^3/g, '³')
    .replace(/\^n/g, 'ⁿ')
    .replace(/\^\{([^}]+)\}/g, '^($1)')
    .replace(/_\{([^}]+)\}/g, '₍$1₎')
    .replace(/_0/g, '₀')
    .replace(/_1/g, '₁')
    .replace(/_2/g, '₂')
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\gamma/g, 'γ')
    .replace(/\\delta/g, 'δ')
    .replace(/\\epsilon/g, 'ε')
    .replace(/\\theta/g, 'θ')
    .replace(/\\lambda/g, 'λ')
    .replace(/\\mu/g, 'μ')
    .replace(/\\pi/g, 'π')
    .replace(/\\sigma/g, 'σ')
    .replace(/\\phi/g, 'φ')
    .replace(/\\omega/g, 'ω')
    .replace(/\\Delta/g, 'Δ')
    .replace(/\\Sigma/g, 'Σ')
    .replace(/\\Pi/g, 'Π')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\pm/g, '±')
    .replace(/\\cdot/g, '·')
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\neq/g, '≠')
    .replace(/\\approx/g, '≈')
    .replace(/\\equiv/g, '≡')
    .replace(/\\infty/g, '∞')
    .replace(/\\int/g, '∫')
    .replace(/\\sum/g, 'Σ')
    .replace(/\\prod/g, 'Π')
    .replace(/\\lim/g, 'lim')
    .replace(/\\partial/g, '∂')
    .replace(/\\in/g, '∈')
    .replace(/\\notin/g, '∉')
    .replace(/\\subset/g, '⊂')
    .replace(/\\cup/g, '∪')
    .replace(/\\cap/g, '∩')
    .replace(/\\emptyset/g, '∅')
    .replace(/\\forall/g, '∀')
    .replace(/\\exists/g, '∃')
    .replace(/\\rightarrow/g, '→')
    .replace(/\\leftarrow/g, '←')
    .replace(/\\Rightarrow/g, '⇒')
    .replace(/\\Leftrightarrow/g, '⇔')
    .replace(/\\left\(/g, '(')
    .replace(/\\right\)/g, ')')
    .replace(/\\left\[/g, '[')
    .replace(/\\right\]/g, ']')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\quad/g, '  ')
    .replace(/\\qquad/g, '    ')
    .replace(/\\\\/g, '\n')
    .replace(/\\,/g, ' ')
    .replace(/\{/g, '')
    .replace(/\}/g, '')
    .replace(/\$/g, '');
}

function parseMathContent(
  content: string,
): Array<{ type: 'text' | 'latex' | 'latex-inline'; content: string }> {
  const parts: Array<{ type: 'text' | 'latex' | 'latex-inline'; content: string }> = [];
  const regex = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index).trim();
      if (text) parts.push({ type: 'text', content: text });
    }
    const latex = match[1];
    if (latex.startsWith('$$')) {
      parts.push({ type: 'latex', content: latex.slice(2, -2).trim() });
    } else {
      parts.push({ type: 'latex-inline', content: latex.slice(1, -1).trim() });
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex).trim();
    if (text) parts.push({ type: 'text', content: text });
  }
  return parts;
}

async function createMathPdf(params: SolveMathParams): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: { Title: params.title, Author: 'Zia AI Bot' },
      });
      fontsRegistered = registerFonts(doc);
      const mainFont = fontsRegistered ? 'MainFont' : 'Helvetica';
      const boldFont = fontsRegistered ? 'MainFont-Bold' : 'Helvetica-Bold';
      const italicFont = fontsRegistered ? 'MainFont-Italic' : 'Helvetica-Oblique';
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).font(boldFont).fillColor('#1a5f7a').text(params.title, { align: 'center' });
      doc.moveDown(1);

      doc.fontSize(14).font(boldFont).fillColor('#333').text('📝 ĐỀ BÀI:');
      doc.moveDown(0.3);
      doc.fontSize(12).font(mainFont).fillColor('#000');
      for (const part of parseMathContent(params.problem)) {
        if (part.type === 'text') {
          doc.font(mainFont).text(part.content);
        } else {
          doc
            .font(mainFont)
            .fillColor('#0066cc')
            .text(latexToUnicode(part.content), { indent: part.type === 'latex' ? 20 : 0 });
          doc.fillColor('#000');
        }
      }
      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ddd');
      doc.moveDown(0.5);

      doc.fontSize(14).font(boldFont).fillColor('#2e7d32').text('✅ LỜI GIẢI:');
      doc.moveDown(0.3);
      doc.fontSize(12).font(mainFont).fillColor('#000');
      for (const part of parseMathContent(params.solution)) {
        if (part.type === 'text') {
          for (const line of part.content.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed) {
              doc.moveDown(0.3);
              continue;
            }
            if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
              doc.font(mainFont).text(`  • ${trimmed.slice(2)}`);
            } else if (/^(Bước|Step)\s*\d+/i.test(trimmed) || /^\d+[.)]\s/.test(trimmed)) {
              doc.moveDown(0.2);
              doc.font(boldFont).fillColor('#1565c0').text(trimmed);
              doc.fillColor('#000');
            } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
              doc.font(boldFont).text(trimmed.slice(2, -2));
            } else {
              doc.font(mainFont).text(trimmed);
            }
          }
        } else {
          doc.moveDown(0.2);
          doc
            .font(mainFont)
            .fillColor('#d32f2f')
            .text(latexToUnicode(part.content), { indent: part.type === 'latex' ? 30 : 0 });
          doc.fillColor('#000');
          doc.moveDown(0.2);
        }
      }

      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ddd');
      doc.moveDown(0.3);
      doc
        .fontSize(9)
        .font(italicFont)
        .fillColor('#888')
        .text('Được tạo bởi Zia AI Bot 🤖', { align: 'center' });
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
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
      const buffer = await createMathPdf(validation.data);
      return {
        success: true,
        data: {
          fileBuffer: buffer,
          filename: 'giai-toan.pdf',
          mimeType: 'application/pdf',
          fileSize: buffer.length,
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
