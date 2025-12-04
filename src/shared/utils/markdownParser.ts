/**
 * Markdown Parser - Parse markdown thành AST để render cho DOCX và PDF
 * Hỗ trợ: headings, bold, italic, strikethrough, code, links, lists, blockquote, hr, tables
 */

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

export type InlineStyle = 'bold' | 'italic' | 'boldItalic' | 'strikethrough' | 'code' | 'link';

export interface InlineToken {
  text: string;
  styles: InlineStyle[];
  href?: string; // for links
}

export type BlockType =
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'heading4'
  | 'paragraph'
  | 'bullet'
  | 'numbered'
  | 'blockquote'
  | 'codeBlock'
  | 'hr'
  | 'empty';

export interface Block {
  type: BlockType;
  tokens: InlineToken[];
  indent?: number; // for nested lists
  language?: string; // for code blocks
  raw?: string; // raw content for code blocks
}

// ═══════════════════════════════════════════════════
// INLINE PARSER
// ═══════════════════════════════════════════════════

/**
 * Parse inline markdown: **bold**, *italic*, ~~strike~~, `code`, [link](url)
 */
export function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];

  // Regex patterns for inline elements
  // Order matters: more specific patterns first
  const patterns = [
    // Links: [text](url)
    {
      regex: /\[([^\]]+)\]\(([^)]+)\)/g,
      handler: (m: RegExpExecArray): InlineToken => ({
        text: m[1],
        styles: ['link'],
        href: m[2],
      }),
    },
    // Bold + Italic: ***text*** or ___text___
    {
      regex: /(\*\*\*|___)(.+?)\1/g,
      handler: (m: RegExpExecArray): InlineToken => ({
        text: m[2],
        styles: ['boldItalic'],
      }),
    },
    // Bold: **text** or __text__
    {
      regex: /(\*\*|__)(.+?)\1/g,
      handler: (m: RegExpExecArray): InlineToken => ({
        text: m[2],
        styles: ['bold'],
      }),
    },
    // Italic: *text* or _text_
    {
      regex: /(\*|_)(.+?)\1/g,
      handler: (m: RegExpExecArray): InlineToken => ({
        text: m[2],
        styles: ['italic'],
      }),
    },
    // Strikethrough: ~~text~~
    {
      regex: /~~(.+?)~~/g,
      handler: (m: RegExpExecArray): InlineToken => ({
        text: m[1],
        styles: ['strikethrough'],
      }),
    },
    // Inline code: `code`
    {
      regex: /`([^`]+)`/g,
      handler: (m: RegExpExecArray): InlineToken => ({
        text: m[1],
        styles: ['code'],
      }),
    },
  ];

  // Build combined regex
  const combinedRegex = new RegExp(patterns.map((p) => p.regex.source).join('|'), 'g');

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Reset all pattern regexes
  for (const p of patterns) {
    p.regex.lastIndex = 0;
  }

  while ((match = combinedRegex.exec(text)) !== null) {
    // Add plain text before match
    if (match.index > lastIndex) {
      tokens.push({
        text: text.slice(lastIndex, match.index),
        styles: [],
      });
    }

    // Find which pattern matched
    let handled = false;
    for (const pattern of patterns) {
      pattern.regex.lastIndex = match.index;
      const specificMatch = pattern.regex.exec(text);
      if (specificMatch && specificMatch.index === match.index) {
        tokens.push(pattern.handler(specificMatch));
        lastIndex = match.index + specificMatch[0].length;
        combinedRegex.lastIndex = lastIndex;
        handled = true;
        break;
      }
    }

    if (!handled) {
      lastIndex = match.index + match[0].length;
    }
  }

  // Add remaining text
  if (lastIndex < text.length) {
    tokens.push({
      text: text.slice(lastIndex),
      styles: [],
    });
  }

  return tokens.length > 0 ? tokens : [{ text, styles: [] }];
}

// ═══════════════════════════════════════════════════
// BLOCK PARSER
// ═══════════════════════════════════════════════════

/**
 * Parse markdown content thành blocks
 */
export function parseMarkdown(content: string): Block[] {
  const lines = content.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      blocks.push({ type: 'empty', tokens: [] });
      i++;
      continue;
    }

    // Code block (```)
    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({
        type: 'codeBlock',
        tokens: [],
        language,
        raw: codeLines.join('\n'),
      });
      i++; // skip closing ```
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'hr', tokens: [] });
      i++;
      continue;
    }

    // Headings
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingTypes: BlockType[] = ['heading1', 'heading2', 'heading3', 'heading4'];
      blocks.push({
        type: headingTypes[level - 1],
        tokens: parseInline(headingMatch[2]),
      });
      i++;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      const quoteContent = trimmed.slice(1).trim();
      blocks.push({
        type: 'blockquote',
        tokens: parseInline(quoteContent),
      });
      i++;
      continue;
    }

    // Bullet list
    const bulletMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (bulletMatch) {
      const indent = Math.floor(bulletMatch[1].length / 2);
      blocks.push({
        type: 'bullet',
        tokens: parseInline(bulletMatch[2]),
        indent,
      });
      i++;
      continue;
    }

    // Numbered list
    const numberedMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (numberedMatch) {
      const indent = Math.floor(numberedMatch[1].length / 2);
      blocks.push({
        type: 'numbered',
        tokens: parseInline(numberedMatch[2]),
        indent,
      });
      i++;
      continue;
    }

    // Normal paragraph
    blocks.push({
      type: 'paragraph',
      tokens: parseInline(trimmed),
    });
    i++;
  }

  return blocks;
}

// ═══════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════

/**
 * Convert blocks to plain text (for fallback)
 */
export function blocksToPlainText(blocks: Block[]): string {
  return blocks
    .map((block) => {
      if (block.type === 'codeBlock') return block.raw || '';
      if (block.type === 'hr') return '---';
      if (block.type === 'empty') return '';
      return block.tokens.map((t) => t.text).join('');
    })
    .join('\n');
}

/**
 * Check if token has specific style
 */
export function hasStyle(token: InlineToken, style: InlineStyle): boolean {
  return token.styles.includes(style);
}
