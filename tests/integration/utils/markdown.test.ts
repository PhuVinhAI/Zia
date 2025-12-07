/**
 * Integration Test: Markdown Utilities
 * Test các chức năng parse và convert markdown
 */

import { describe, test, expect } from 'bun:test';
import { parseMarkdown, parseInline, blocksToPlainText } from '../../../src/shared/utils/markdown/markdownParser.js';
import { parseMarkdownToZalo, getFileExtension } from '../../../src/shared/utils/markdown/markdownToZalo.js';
import { TEST_CONFIG } from '../setup.js';

describe('Markdown Utilities Integration', () => {
  describe('parseMarkdown', () => {
    test('parse heading', () => {
      const result = parseMarkdown('# Hello World');
      expect(result).toBeArray();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('heading1');
    });

    test('parse bold và italic', () => {
      const result = parseMarkdown('**bold** and *italic*');
      expect(result).toBeArray();
      expect(result[0].type).toBe('paragraph');
      expect(result[0].tokens.length).toBeGreaterThan(0);
    });

    test('parse list', () => {
      const md = `
- Item 1
- Item 2
- Item 3
      `.trim();

      const result = parseMarkdown(md);
      expect(result).toBeArray();
      const bullets = result.filter(b => b.type === 'bullet');
      expect(bullets.length).toBe(3);
    });

    test('parse code block', () => {
      const md = `
\`\`\`javascript
const x = 1;
\`\`\`
      `.trim();

      const result = parseMarkdown(md);
      expect(result).toBeArray();
      const codeBlock = result.find(b => b.type === 'codeBlock');
      expect(codeBlock).toBeDefined();
      expect(codeBlock!.language).toBe('javascript');
      expect(codeBlock!.raw).toContain('const x = 1');
    });

    test('parse blockquote', () => {
      const result = parseMarkdown('> This is a quote');
      expect(result).toBeArray();
      expect(result[0].type).toBe('blockquote');
    });

    test('parse horizontal rule', () => {
      const result = parseMarkdown('---');
      expect(result).toBeArray();
      expect(result[0].type).toBe('hr');
    });
  });

  describe('parseInline', () => {
    test('parse bold', () => {
      const tokens = parseInline('**bold text**');
      expect(tokens).toBeArray();
      expect(tokens.some(t => t.styles.includes('bold'))).toBe(true);
    });

    test('parse italic', () => {
      const tokens = parseInline('*italic text*');
      expect(tokens).toBeArray();
      expect(tokens.some(t => t.styles.includes('italic'))).toBe(true);
    });

    test('parse link', () => {
      const tokens = parseInline('[Google](https://google.com)');
      expect(tokens).toBeArray();
      const linkToken = tokens.find(t => t.styles.includes('link'));
      expect(linkToken).toBeDefined();
      expect(linkToken!.href).toBe('https://google.com');
    });

    test('parse inline code', () => {
      const tokens = parseInline('Use `console.log()` for debugging');
      expect(tokens).toBeArray();
      const codeToken = tokens.find(t => t.styles.includes('code'));
      expect(codeToken).toBeDefined();
      expect(codeToken!.text).toBe('console.log()');
    });
  });

  describe('blocksToPlainText', () => {
    test('convert blocks to plain text', () => {
      const blocks = parseMarkdown('# Title\n\nParagraph text');
      const plainText = blocksToPlainText(blocks);
      expect(plainText).toContain('Title');
      expect(plainText).toContain('Paragraph text');
    });
  });

  describe('parseMarkdownToZalo', () => {
    test('convert simple text', async () => {
      const result = await parseMarkdownToZalo('Hello World');
      expect(result).toBeDefined();
      expect(result.text).toContain('Hello World');
    });

    test('convert bold text', async () => {
      const result = await parseMarkdownToZalo('**bold text**');
      expect(result.text).toContain('bold text');
      expect(result.styles.length).toBeGreaterThan(0);
    });

    test('convert italic text', async () => {
      const result = await parseMarkdownToZalo('This is *italic* text');
      expect(result.text).toContain('italic');
      expect(result.styles.length).toBeGreaterThan(0);
    });

    test('convert strikethrough text', async () => {
      const result = await parseMarkdownToZalo('This is ~~strikethrough~~ text');
      expect(result.text).toContain('strikethrough');
      expect(result.styles.length).toBeGreaterThan(0);
    });

    test('extract code blocks', async () => {
      const md = `
\`\`\`javascript
const x = 1;
\`\`\`
      `.trim();

      const result = await parseMarkdownToZalo(md);
      expect(result.codeBlocks).toBeArray();
      expect(result.codeBlocks.length).toBe(1);
      expect(result.codeBlocks[0].language).toBe('javascript');
      expect(result.codeBlocks[0].code).toContain('const x = 1');
    });

    test('extract links', async () => {
      const result = await parseMarkdownToZalo('[Google](https://google.com)');
      expect(result.links).toBeArray();
      expect(result.links.length).toBe(1);
      expect(result.links[0].url).toBe('https://google.com');
    });

    test('extract bare URLs', async () => {
      const result = await parseMarkdownToZalo('Visit https://example.com for more');
      expect(result.links.length).toBe(1);
      expect(result.links[0].url).toBe('https://example.com');
    });

    test('dedupe links with same URL', async () => {
      const result = await parseMarkdownToZalo(
        '[link1](https://example.com) and [link2](https://example.com)'
      );
      expect(result.links.length).toBe(1);
    });

    test('handle headings', async () => {
      const result = await parseMarkdownToZalo('# Heading 1\n## Heading 2');
      expect(result.text).toContain('Heading 1');
      expect(result.text).toContain('Heading 2');
      expect(result.styles.length).toBeGreaterThan(0);
    });

    test('handle blockquotes', async () => {
      const result = await parseMarkdownToZalo('> This is a quote');
      expect(result.text).toContain('This is a quote');
    });

    test('handle empty input', async () => {
      const result = await parseMarkdownToZalo('');
      expect(result.text).toBe('');
      expect(result.styles.length).toBe(0);
    });

    test('normalize newlines', async () => {
      const result = await parseMarkdownToZalo('Line1\r\nLine2\r\nLine3');
      expect(result.text).not.toContain('\r');
    });

    test('render table to image', async () => {
      const md = `
| Name | Age |
|------|-----|
| John | 30 |
| Jane | 25 |
      `.trim();

      const result = await parseMarkdownToZalo(md);
      expect(result.images).toBeArray();
      expect(result.images.length).toBe(1);
      expect(result.images[0].type).toBe('table');
      expect(result.images[0].buffer).toBeInstanceOf(Buffer);
    }, TEST_CONFIG.timeout);
  });

  describe('getFileExtension', () => {
    test('map common languages', () => {
      expect(getFileExtension('javascript')).toBe('js');
      expect(getFileExtension('typescript')).toBe('ts');
      expect(getFileExtension('python')).toBe('py');
      expect(getFileExtension('java')).toBe('java');
    });

    test('handle case insensitivity', () => {
      expect(getFileExtension('JavaScript')).toBe('js');
      expect(getFileExtension('PYTHON')).toBe('py');
    });

    test('handle unknown language', () => {
      expect(getFileExtension('unknown')).toBe('unknown');
      expect(getFileExtension('')).toBe('txt');
    });

    test('handle more languages', () => {
      expect(getFileExtension('cpp')).toBe('cpp');
      expect(getFileExtension('csharp')).toBe('cs');
      expect(getFileExtension('go')).toBe('go');
      expect(getFileExtension('rust')).toBe('rs');
      expect(getFileExtension('ruby')).toBe('rb');
      expect(getFileExtension('php')).toBe('php');
      expect(getFileExtension('swift')).toBe('swift');
      expect(getFileExtension('kotlin')).toBe('kt');
      expect(getFileExtension('html')).toBe('html');
      expect(getFileExtension('css')).toBe('css');
      expect(getFileExtension('json')).toBe('json');
      expect(getFileExtension('yaml')).toBe('yaml');
      expect(getFileExtension('sql')).toBe('sql');
      expect(getFileExtension('bash')).toBe('sh');
      expect(getFileExtension('markdown')).toBe('md');
    });
  });
});
