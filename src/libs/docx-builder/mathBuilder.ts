/**
 * Math Builder - Hỗ trợ công thức toán học trong Word
 */

import { Math as DocxMath, MathRun, Paragraph, TextRun } from 'docx';
import { getTheme } from './themes.js';
import type { DocumentTheme } from './types.js';

// ═══════════════════════════════════════════════════
// MATH TYPES
// ═══════════════════════════════════════════════════

export interface MathExpression {
  type: 'inline' | 'block';
  expression: string;
}

// ═══════════════════════════════════════════════════
// MATH PARSER
// ═══════════════════════════════════════════════════

/**
 * Parse math expressions từ content
 * Inline: $expression$
 * Block: $$expression$$
 */
export function parseMathExpressions(content: string): {
  cleanContent: string;
  mathBlocks: { index: number; expression: MathExpression }[];
} {
  const mathBlocks: { index: number; expression: MathExpression }[] = [];
  const cleanContent = content;
  const offset = 0;

  // Block math: $$...$$
  const blockRegex = /\$\$([^$]+)\$\$/g;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(content)) !== null) {
    mathBlocks.push({
      index: match.index - offset,
      expression: { type: 'block', expression: match[1].trim() },
    });
  }

  // Inline math: $...$
  const inlineRegex = /\$([^$]+)\$/g;
  while ((match = inlineRegex.exec(content)) !== null) {
    // Skip if it's part of block math
    if (!content.substring(match.index - 1, match.index + match[0].length + 1).includes('$$')) {
      mathBlocks.push({
        index: match.index - offset,
        expression: { type: 'inline', expression: match[1].trim() },
      });
    }
  }

  return { cleanContent, mathBlocks };
}

/**
 * Build math paragraph
 */
export function buildMathParagraph(
  expression: string,
  isBlock: boolean,
  theme?: DocumentTheme,
): Paragraph {
  const t = theme || getTheme();

  // Simple math rendering - convert common symbols
  const rendered = renderMathExpression(expression);

  if (isBlock) {
    return new Paragraph({
      alignment: 'center',
      children: [
        new TextRun({
          text: rendered,
          font: 'Cambria Math',
          size: 24,
          color: t.colors.text,
        }),
      ],
      spacing: { before: 200, after: 200 },
    });
  }

  return new Paragraph({
    children: [
      new TextRun({
        text: rendered,
        font: 'Cambria Math',
        size: 22,
        color: t.colors.text,
      }),
    ],
  });
}

/**
 * Render math expression với Unicode symbols
 */
export function renderMathExpression(expr: string): string {
  const replacements: [RegExp, string][] = [
    // Greek letters
    [/\\alpha/g, 'α'],
    [/\\beta/g, 'β'],
    [/\\gamma/g, 'γ'],
    [/\\delta/g, 'δ'],
    [/\\epsilon/g, 'ε'],
    [/\\zeta/g, 'ζ'],
    [/\\eta/g, 'η'],
    [/\\theta/g, 'θ'],
    [/\\iota/g, 'ι'],
    [/\\kappa/g, 'κ'],
    [/\\lambda/g, 'λ'],
    [/\\mu/g, 'μ'],
    [/\\nu/g, 'ν'],
    [/\\xi/g, 'ξ'],
    [/\\pi/g, 'π'],
    [/\\rho/g, 'ρ'],
    [/\\sigma/g, 'σ'],
    [/\\tau/g, 'τ'],
    [/\\upsilon/g, 'υ'],
    [/\\phi/g, 'φ'],
    [/\\chi/g, 'χ'],
    [/\\psi/g, 'ψ'],
    [/\\omega/g, 'ω'],
    [/\\Gamma/g, 'Γ'],
    [/\\Delta/g, 'Δ'],
    [/\\Theta/g, 'Θ'],
    [/\\Lambda/g, 'Λ'],
    [/\\Xi/g, 'Ξ'],
    [/\\Pi/g, 'Π'],
    [/\\Sigma/g, 'Σ'],
    [/\\Phi/g, 'Φ'],
    [/\\Psi/g, 'Ψ'],
    [/\\Omega/g, 'Ω'],

    // Math operators
    [/\\times/g, '×'],
    [/\\div/g, '÷'],
    [/\\pm/g, '±'],
    [/\\mp/g, '∓'],
    [/\\cdot/g, '·'],
    [/\\ast/g, '∗'],
    [/\\star/g, '⋆'],
    [/\\circ/g, '∘'],
    [/\\bullet/g, '•'],

    // Relations
    [/\\leq/g, '≤'],
    [/\\geq/g, '≥'],
    [/\\neq/g, '≠'],
    [/\\approx/g, '≈'],
    [/\\equiv/g, '≡'],
    [/\\sim/g, '∼'],
    [/\\propto/g, '∝'],
    [/\\ll/g, '≪'],
    [/\\gg/g, '≫'],
    [/\\subset/g, '⊂'],
    [/\\supset/g, '⊃'],
    [/\\subseteq/g, '⊆'],
    [/\\supseteq/g, '⊇'],
    [/\\in/g, '∈'],
    [/\\notin/g, '∉'],
    [/\\ni/g, '∋'],

    // Arrows
    [/\\leftarrow/g, '←'],
    [/\\rightarrow/g, '→'],
    [/\\leftrightarrow/g, '↔'],
    [/\\Leftarrow/g, '⇐'],
    [/\\Rightarrow/g, '⇒'],
    [/\\Leftrightarrow/g, '⇔'],
    [/\\uparrow/g, '↑'],
    [/\\downarrow/g, '↓'],
    [/\\mapsto/g, '↦'],

    // Big operators
    [/\\sum/g, '∑'],
    [/\\prod/g, '∏'],
    [/\\int/g, '∫'],
    [/\\oint/g, '∮'],
    [/\\bigcup/g, '⋃'],
    [/\\bigcap/g, '⋂'],

    // Misc
    [/\\infty/g, '∞'],
    [/\\partial/g, '∂'],
    [/\\nabla/g, '∇'],
    [/\\forall/g, '∀'],
    [/\\exists/g, '∃'],
    [/\\nexists/g, '∄'],
    [/\\emptyset/g, '∅'],
    [/\\sqrt/g, '√'],
    [/\\angle/g, '∠'],
    [/\\perp/g, '⊥'],
    [/\\parallel/g, '∥'],
    [/\\therefore/g, '∴'],
    [/\\because/g, '∵'],

    // Superscript numbers
    [/\^0/g, '⁰'],
    [/\^1/g, '¹'],
    [/\^2/g, '²'],
    [/\^3/g, '³'],
    [/\^4/g, '⁴'],
    [/\^5/g, '⁵'],
    [/\^6/g, '⁶'],
    [/\^7/g, '⁷'],
    [/\^8/g, '⁸'],
    [/\^9/g, '⁹'],
    [/\^n/g, 'ⁿ'],
    [/\^x/g, 'ˣ'],
    [/\^y/g, 'ʸ'],

    // Subscript numbers
    [/_0/g, '₀'],
    [/_1/g, '₁'],
    [/_2/g, '₂'],
    [/_3/g, '₃'],
    [/_4/g, '₄'],
    [/_5/g, '₅'],
    [/_6/g, '₆'],
    [/_7/g, '₇'],
    [/_8/g, '₈'],
    [/_9/g, '₉'],
    [/_n/g, 'ₙ'],
    [/_i/g, 'ᵢ'],
    [/_j/g, 'ⱼ'],

    // Fractions
    [/\\frac\{1\}\{2\}/g, '½'],
    [/\\frac\{1\}\{3\}/g, '⅓'],
    [/\\frac\{2\}\{3\}/g, '⅔'],
    [/\\frac\{1\}\{4\}/g, '¼'],
    [/\\frac\{3\}\{4\}/g, '¾'],
  ];

  let result = expr;
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }

  // Clean up remaining LaTeX commands
  result = result.replace(/\\[a-zA-Z]+/g, '');
  result = result.replace(/[{}]/g, '');

  return result;
}

/**
 * Check if line contains math expression
 */
export function hasMathExpression(text: string): boolean {
  return /\$[^$]+\$/.test(text) || /\$\$[^$]+\$\$/.test(text);
}
