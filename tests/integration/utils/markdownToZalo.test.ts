/**
 * Test: Markdown to Zalo Parser
 */
import { describe, expect, it } from 'bun:test';
import {
  parseMarkdownToZalo,
  getFileExtension,
} from '../../../src/shared/utils/markdownToZalo.js';

describe('Markdown to Zalo', () => {
  describe('parseMarkdownToZalo()', () => {
    it('should parse plain text', async () => {
      const result = await parseMarkdownToZalo('Hello world');
      expect(result.text).toBe('Hello world');
      expect(result.styles.length).toBe(0);
    });

    it('should parse bold text', async () => {
      const result = await parseMarkdownToZalo('This is **bold** text');
      expect(result.text).toContain('bold');
      expect(result.styles.length).toBeGreaterThan(0);
    });

    it('should parse italic text', async () => {
      const result = await parseMarkdownToZalo('This is *italic* text');
      expect(result.text).toContain('italic');
      expect(result.styles.length).toBeGreaterThan(0);
    });

    it('should parse strikethrough', async () => {
      const result = await parseMarkdownToZalo('This is ~~strikethrough~~ text');
      expect(result.text).toContain('strikethrough');
      expect(result.styles.length).toBeGreaterThan(0);
    });

    it('should extract code blocks', async () => {
      const markdown = '```javascript\nconst x = 1;\n```';
      const result = await parseMarkdownToZalo(markdown);
      expect(result.codeBlocks.length).toBe(1);
      expect(result.codeBlocks[0].language).toBe('javascript');
      expect(result.codeBlocks[0].code).toContain('const x = 1');
    });

    it('should extract links', async () => {
      const result = await parseMarkdownToZalo('Check [this link](https://example.com)');
      expect(result.links.length).toBe(1);
      expect(result.links[0].url).toBe('https://example.com');
      expect(result.links[0].text).toBe('this link');
    });

    it('should extract bare URLs', async () => {
      const result = await parseMarkdownToZalo('Visit https://example.com for more');
      expect(result.links.length).toBe(1);
      expect(result.links[0].url).toBe('https://example.com');
    });

    it('should handle headings', async () => {
      const result = await parseMarkdownToZalo('# Heading 1\n## Heading 2');
      expect(result.text).toContain('Heading 1');
      expect(result.text).toContain('Heading 2');
      expect(result.styles.length).toBeGreaterThan(0);
    });

    it('should handle blockquotes', async () => {
      const result = await parseMarkdownToZalo('> This is a quote');
      expect(result.text).toContain('This is a quote');
    });

    it('should dedupe links', async () => {
      const result = await parseMarkdownToZalo(
        '[link1](https://example.com) and [link2](https://example.com)'
      );
      expect(result.links.length).toBe(1); // Same URL, only one link
    });

    it('should handle empty input', async () => {
      const result = await parseMarkdownToZalo('');
      expect(result.text).toBe('');
      expect(result.styles.length).toBe(0);
    });

    it('should normalize newlines', async () => {
      const result = await parseMarkdownToZalo('Line1\r\nLine2\r\nLine3');
      expect(result.text).not.toContain('\r');
    });
  });

  describe('getFileExtension()', () => {
    it('should return correct extensions', () => {
      expect(getFileExtension('javascript')).toBe('js');
      expect(getFileExtension('typescript')).toBe('ts');
      expect(getFileExtension('python')).toBe('py');
      expect(getFileExtension('java')).toBe('java');
    });

    it('should handle case insensitivity', () => {
      expect(getFileExtension('JavaScript')).toBe('js');
      expect(getFileExtension('PYTHON')).toBe('py');
    });

    it('should return language as fallback', () => {
      expect(getFileExtension('unknown')).toBe('unknown');
    });

    it('should return txt for empty', () => {
      expect(getFileExtension('')).toBe('txt');
    });

    it('should handle common languages', () => {
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
