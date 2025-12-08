/**
 * Math Builder - Hỗ trợ công thức toán học trong Word
 * Sử dụng OMML (Office Math Markup Language) cho rendering chính xác
 */

import {
  Math as DocxMath,
  MathFraction,
  MathRadical,
  MathRun,
  MathSubScript,
  MathSubSuperScript,
  MathSum,
  MathSuperScript,
  Paragraph,
  TextRun,
} from 'docx';
import { getTheme } from './themes.js';
import type { DocumentTheme } from './types.js';

// ═══════════════════════════════════════════════════
// MATH TYPES
// ═══════════════════════════════════════════════════

export interface MathExpression {
  type: 'inline' | 'block';
  expression: string;
}

type MathComponent =
  | MathRun
  | MathFraction
  | MathSuperScript
  | MathSubScript
  | MathSubSuperScript
  | MathRadical
  | MathSum;

// ═══════════════════════════════════════════════════
// GREEK LETTERS & SYMBOLS
// ═══════════════════════════════════════════════════

const GREEK_LETTERS: Record<string, string> = {
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  epsilon: 'ε',
  zeta: 'ζ',
  eta: 'η',
  theta: 'θ',
  iota: 'ι',
  kappa: 'κ',
  lambda: 'λ',
  mu: 'μ',
  nu: 'ν',
  xi: 'ξ',
  pi: 'π',
  rho: 'ρ',
  sigma: 'σ',
  tau: 'τ',
  upsilon: 'υ',
  phi: 'φ',
  chi: 'χ',
  psi: 'ψ',
  omega: 'ω',
  Gamma: 'Γ',
  Delta: 'Δ',
  Theta: 'Θ',
  Lambda: 'Λ',
  Xi: 'Ξ',
  Pi: 'Π',
  Sigma: 'Σ',
  Phi: 'Φ',
  Psi: 'Ψ',
  Omega: 'Ω',
};

const SYMBOLS: Record<string, string> = {
  times: '×',
  div: '÷',
  pm: '±',
  mp: '∓',
  cdot: '·',
  ast: '∗',
  star: '⋆',
  circ: '∘',
  bullet: '•',
  leq: '≤',
  geq: '≥',
  neq: '≠',
  approx: '≈',
  equiv: '≡',
  sim: '∼',
  propto: '∝',
  ll: '≪',
  gg: '≫',
  subset: '⊂',
  supset: '⊃',
  subseteq: '⊆',
  supseteq: '⊇',
  in: '∈',
  notin: '∉',
  ni: '∋',
  leftarrow: '←',
  rightarrow: '→',
  leftrightarrow: '↔',
  Leftarrow: '⇐',
  Rightarrow: '⇒',
  Leftrightarrow: '⇔',
  uparrow: '↑',
  downarrow: '↓',
  mapsto: '↦',
  infty: '∞',
  partial: '∂',
  nabla: '∇',
  forall: '∀',
  exists: '∃',
  nexists: '∄',
  emptyset: '∅',
  angle: '∠',
  perp: '⊥',
  parallel: '∥',
  therefore: '∴',
  because: '∵',
  to: '→',
  gets: '←',
};

// ═══════════════════════════════════════════════════
// MATH PARSER
// ═══════════════════════════════════════════════════

export function parseMathExpressions(content: string): {
  cleanContent: string;
  mathBlocks: { index: number; expression: MathExpression }[];
} {
  const mathBlocks: { index: number; expression: MathExpression }[] = [];
  const cleanContent = content;
  const offset = 0;

  const blockRegex = /\$\$([^$]+)\$\$/g;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(content)) !== null) {
    mathBlocks.push({
      index: match.index - offset,
      expression: { type: 'block', expression: match[1].trim() },
    });
  }

  const inlineRegex = /\$([^$]+)\$/g;
  while ((match = inlineRegex.exec(content)) !== null) {
    if (!content.substring(match.index - 1, match.index + match[0].length + 1).includes('$')) {
      mathBlocks.push({
        index: match.index - offset,
        expression: { type: 'inline', expression: match[1].trim() },
      });
    }
  }

  return { cleanContent, mathBlocks };
}

// ═══════════════════════════════════════════════════
// LATEX TO OMML CONVERTER
// ═══════════════════════════════════════════════════

function replaceSymbols(text: string): string {
  let result = text;
  for (const [name, symbol] of Object.entries(GREEK_LETTERS)) {
    result = result.replace(new RegExp(`\\\\${name}\\b`, 'g'), symbol);
  }
  for (const [name, symbol] of Object.entries(SYMBOLS)) {
    result = result.replace(new RegExp(`\\\\${name}\\b`, 'g'), symbol);
  }
  return result;
}

function parseLatexToOmml(expr: string): MathComponent[] {
  const components: MathComponent[] = [];
  let remaining = expr.trim();

  while (remaining.length > 0) {
    // \frac{num}{den}
    const fracMatch = remaining.match(
      /^\\frac\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/,
    );
    if (fracMatch) {
      const num = parseLatexToOmml(fracMatch[1]);
      const den = parseLatexToOmml(fracMatch[2]);
      components.push(
        new MathFraction({
          numerator: num.length > 0 ? num : [new MathRun(replaceSymbols(fracMatch[1]))],
          denominator: den.length > 0 ? den : [new MathRun(replaceSymbols(fracMatch[2]))],
        }),
      );
      remaining = remaining.slice(fracMatch[0].length);
      continue;
    }

    // \sqrt{x}
    const sqrtMatch = remaining.match(/^\\sqrt\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/);
    if (sqrtMatch) {
      const inner = parseLatexToOmml(sqrtMatch[1]);
      components.push(
        new MathRadical({
          children: inner.length > 0 ? inner : [new MathRun(replaceSymbols(sqrtMatch[1]))],
        }),
      );
      remaining = remaining.slice(sqrtMatch[0].length);
      continue;
    }

    // \sum_{sub}^{sup}
    const sumMatch = remaining.match(/^\\sum(?:_\{([^{}]*)\})?(?:\^\{([^{}]*)\})?/);
    if (sumMatch && (sumMatch[1] || sumMatch[2])) {
      components.push(
        new MathSum({
          children: [new MathRun('')],
          subScript: sumMatch[1] ? parseLatexToOmml(sumMatch[1]) : undefined,
          superScript: sumMatch[2] ? parseLatexToOmml(sumMatch[2]) : undefined,
        }),
      );
      remaining = remaining.slice(sumMatch[0].length);
      continue;
    }

    // \int_{sub}^{sup}
    const intMatch = remaining.match(/^\\int(?:_\{([^{}]*)\})?(?:\^\{([^{}]*)\})?/);
    if (intMatch) {
      if (intMatch[1] && intMatch[2]) {
        components.push(
          new MathSubSuperScript({
            children: [new MathRun('∫')],
            subScript: parseLatexToOmml(intMatch[1]),
            superScript: parseLatexToOmml(intMatch[2]),
          }),
        );
      } else if (intMatch[1]) {
        components.push(
          new MathSubScript({
            children: [new MathRun('∫')],
            subScript: parseLatexToOmml(intMatch[1]),
          }),
        );
      } else if (intMatch[2]) {
        components.push(
          new MathSuperScript({
            children: [new MathRun('∫')],
            superScript: parseLatexToOmml(intMatch[2]),
          }),
        );
      } else {
        components.push(new MathRun('∫'));
      }
      remaining = remaining.slice(intMatch[0].length);
      continue;
    }

    // x^{sup}_{sub} or x_{sub}^{sup}
    const subSupMatch = remaining.match(
      /^([^\\^_{}]+)(?:\^\{([^{}]*)\}_\{([^{}]*)\}|_\{([^{}]*)\}\^\{([^{}]*)\})/,
    );
    if (subSupMatch) {
      const base = replaceSymbols(subSupMatch[1]);
      const sup = subSupMatch[2] || subSupMatch[5];
      const sub = subSupMatch[3] || subSupMatch[4];
      components.push(
        new MathSubSuperScript({
          children: [new MathRun(base)],
          subScript: parseLatexToOmml(sub),
          superScript: parseLatexToOmml(sup),
        }),
      );
      remaining = remaining.slice(subSupMatch[0].length);
      continue;
    }

    // x^{sup}
    const supMatch = remaining.match(/^([^\\^_{}]+)\^\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/);
    if (supMatch) {
      const base = replaceSymbols(supMatch[1]);
      const sup = parseLatexToOmml(supMatch[2]);
      components.push(
        new MathSuperScript({
          children: [new MathRun(base)],
          superScript: sup.length > 0 ? sup : [new MathRun(replaceSymbols(supMatch[2]))],
        }),
      );
      remaining = remaining.slice(supMatch[0].length);
      continue;
    }

    // x_{sub}
    const subMatch = remaining.match(/^([^\\^_{}]+)_\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/);
    if (subMatch) {
      const base = replaceSymbols(subMatch[1]);
      const sub = parseLatexToOmml(subMatch[2]);
      components.push(
        new MathSubScript({
          children: [new MathRun(base)],
          subScript: sub.length > 0 ? sub : [new MathRun(replaceSymbols(subMatch[2]))],
        }),
      );
      remaining = remaining.slice(subMatch[0].length);
      continue;
    }

    // Simple x^n
    const simpleSup = remaining.match(/^([^\\^_{}]+)\^([^{}\s])/);
    if (simpleSup) {
      components.push(
        new MathSuperScript({
          children: [new MathRun(replaceSymbols(simpleSup[1]))],
          superScript: [new MathRun(replaceSymbols(simpleSup[2]))],
        }),
      );
      remaining = remaining.slice(simpleSup[0].length);
      continue;
    }

    // Simple x_n
    const simpleSub = remaining.match(/^([^\\^_{}]+)_([^{}\s])/);
    if (simpleSub) {
      components.push(
        new MathSubScript({
          children: [new MathRun(replaceSymbols(simpleSub[1]))],
          subScript: [new MathRun(replaceSymbols(simpleSub[2]))],
        }),
      );
      remaining = remaining.slice(simpleSub[0].length);
      continue;
    }

    // \command
    const cmdMatch = remaining.match(/^\\([a-zA-Z]+)/);
    if (cmdMatch) {
      const cmd = cmdMatch[1];
      const symbol = GREEK_LETTERS[cmd] || SYMBOLS[cmd];
      if (symbol) {
        components.push(new MathRun(symbol));
      } else if (cmd === 'sum') {
        components.push(new MathRun('∑'));
      } else if (cmd === 'prod') {
        components.push(new MathRun('∏'));
      } else if (cmd === 'int') {
        components.push(new MathRun('∫'));
      } else if (cmd === 'sqrt') {
        components.push(new MathRun('√'));
      }
      remaining = remaining.slice(cmdMatch[0].length);
      continue;
    }

    // Regular text
    const textMatch = remaining.match(/^[^\\^_{}]+/);
    if (textMatch) {
      const text = replaceSymbols(textMatch[0].trim());
      if (text) components.push(new MathRun(text));
      remaining = remaining.slice(textMatch[0].length);
      continue;
    }

    remaining = remaining.slice(1);
  }

  return components;
}

// ═══════════════════════════════════════════════════
// BUILD MATH PARAGRAPH
// ═══════════════════════════════════════════════════

export function buildMathParagraph(
  expression: string,
  isBlock: boolean,
  theme?: DocumentTheme,
): Paragraph {
  const t = theme || getTheme();
  const mathComponents = parseLatexToOmml(expression);

  if (mathComponents.length === 0) {
    const rendered = renderMathExpression(expression);
    return new Paragraph({
      alignment: isBlock ? 'center' : undefined,
      children: [
        new TextRun({
          text: rendered,
          font: 'Cambria Math',
          size: isBlock ? 24 : 22,
          color: t.colors.text,
        }),
      ],
      spacing: isBlock ? { before: 200, after: 200 } : undefined,
    });
  }

  const mathElement = new DocxMath({ children: mathComponents });

  return new Paragraph({
    alignment: isBlock ? 'center' : undefined,
    children: [mathElement],
    spacing: isBlock ? { before: 200, after: 200 } : undefined,
  });
}

// ═══════════════════════════════════════════════════
// FALLBACK: UNICODE RENDERING
// ═══════════════════════════════════════════════════

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
    // Operators
    [/\\times/g, '×'],
    [/\\div/g, '÷'],
    [/\\pm/g, '±'],
    [/\\mp/g, '∓'],
    [/\\cdot/g, '·'],
    [/\\ast/g, '∗'],
    [/\\star/g, '⋆'],
    [/\\circ/g, '∘'],
    // Relations
    [/\\leq/g, '≤'],
    [/\\geq/g, '≥'],
    [/\\neq/g, '≠'],
    [/\\approx/g, '≈'],
    [/\\equiv/g, '≡'],
    [/\\sim/g, '∼'],
    [/\\propto/g, '∝'],
    [/\\subset/g, '⊂'],
    [/\\supset/g, '⊃'],
    [/\\in/g, '∈'],
    [/\\notin/g, '∉'],
    // Arrows
    [/\\leftarrow/g, '←'],
    [/\\rightarrow/g, '→'],
    [/\\Rightarrow/g, '⇒'],
    [/\\Leftarrow/g, '⇐'],
    [/\\leftrightarrow/g, '↔'],
    // Big operators
    [/\\sum/g, '∑'],
    [/\\prod/g, '∏'],
    [/\\int/g, '∫'],
    [/\\oint/g, '∮'],
    // Misc
    [/\\infty/g, '∞'],
    [/\\partial/g, '∂'],
    [/\\nabla/g, '∇'],
    [/\\forall/g, '∀'],
    [/\\exists/g, '∃'],
    [/\\emptyset/g, '∅'],
    [/\\sqrt/g, '√'],
    [/\\angle/g, '∠'],
    [/\\perp/g, '⊥'],
    // Superscripts
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
    // Subscripts
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
    // Fractions
    [/\\frac\{1\}\{2\}/g, '½'],
    [/\\frac\{1\}\{3\}/g, '⅓'],
    [/\\frac\{1\}\{4\}/g, '¼'],
    [/\\frac\{3\}\{4\}/g, '¾'],
  ];

  let result = expr;
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }
  result = result.replace(/\\[a-zA-Z]+/g, '');
  result = result.replace(/[{}]/g, '');
  return result;
}

export function hasMathExpression(text: string): boolean {
  return /\$[^$]+\$/.test(text) || /\$\$[^$]+\$\$/.test(text);
}
