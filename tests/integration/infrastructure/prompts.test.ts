/**
 * Test: Prompts
 */
import { describe, expect, it } from 'bun:test';
import {
  getSystemPrompt,
  PROMPTS,
  SYSTEM_PROMPT,
} from '../../../src/infrastructure/ai/providers/gemini/prompts.js';

describe('Prompts', () => {
  describe('getSystemPrompt()', () => {
    it('should return character prompt when useCharacter is true', () => {
      const prompt = getSystemPrompt(true);
      expect(prompt).toContain('Zia');
    });

    it('should return assistant prompt when useCharacter is false', () => {
      const prompt = getSystemPrompt(false);
      expect(prompt).toContain('trợ lý AI');
    });

    it('should include multimodal capabilities', () => {
      const prompt = getSystemPrompt(true);
      expect(prompt).toContain('ĐA PHƯƠNG THỨC');
    });

    it('should include Zalo interaction guide', () => {
      const prompt = getSystemPrompt(true);
      expect(prompt).toContain('[reaction:');
      expect(prompt).toContain('[sticker:');
      expect(prompt).toContain('[msg]');
    });

    it('should include tool instructions', () => {
      const prompt = getSystemPrompt(true);
      expect(prompt).toContain('[tool:');
    });
  });

  describe('SYSTEM_PROMPT', () => {
    it('should be pre-built', () => {
      expect(typeof SYSTEM_PROMPT).toBe('string');
      expect(SYSTEM_PROMPT.length).toBeGreaterThan(0);
    });
  });

  describe('PROMPTS templates', () => {
    describe('quote()', () => {
      it('should format quote context', () => {
        const result = PROMPTS.quote('Original message', 'User question');
        expect(result).toContain('Original message');
        expect(result).toContain('User question');
      });
    });

    describe('quoteContext()', () => {
      it('should add quote context tag', () => {
        const result = PROMPTS.quoteContext('Quoted text');
        expect(result).toContain('QUOTE CONTEXT');
        expect(result).toContain('Quoted text');
      });
    });

    describe('quoteMedia()', () => {
      it('should describe image media', () => {
        const result = PROMPTS.quoteMedia('Caption', 'image');
        expect(result).toContain('hình ảnh');
      });

      it('should describe video media', () => {
        const result = PROMPTS.quoteMedia(undefined, 'video');
        expect(result).toContain('video');
      });

      it('should describe audio media', () => {
        const result = PROMPTS.quoteMedia(undefined, 'audio');
        expect(result).toContain('audio');
      });
    });

    describe('youtube()', () => {
      it('should format YouTube prompt', () => {
        const result = PROMPTS.youtube(
          ['https://youtube.com/watch?v=abc'],
          'What is this?'
        );
        expect(result).toContain('YouTube');
        expect(result).toContain('abc');
        expect(result).toContain('What is this?');
      });
    });

    describe('mixedContent()', () => {
      it('should format mixed content items', () => {
        const items = [
          { type: 'text', text: 'Hello' },
          { type: 'image' },
          { type: 'video', duration: 30 },
        ];
        const result = PROMPTS.mixedContent(items);
        expect(result).toContain('[0]');
        expect(result).toContain('[1]');
        expect(result).toContain('[2]');
        expect(result).toContain('Hello');
        expect(result).toContain('Video');
      });

      it('should include sticker type', () => {
        const items = [{ type: 'sticker' }];
        const result = PROMPTS.mixedContent(items);
        expect(result).toContain('Sticker');
      });

      it('should include voice type', () => {
        const items = [{ type: 'voice', duration: 10 }];
        const result = PROMPTS.mixedContent(items);
        expect(result).toContain('Tin nhắn thoại');
        expect(result).toContain('10s');
      });

      it('should include file type', () => {
        const items = [{ type: 'file', fileName: 'doc.pdf' }];
        const result = PROMPTS.mixedContent(items);
        expect(result).toContain('File');
        expect(result).toContain('doc.pdf');
      });
    });

    describe('mediaNote()', () => {
      it('should format notes', () => {
        const result = PROMPTS.mediaNote(['Note 1', 'Note 2']);
        expect(result).toContain('Note 1');
        expect(result).toContain('Note 2');
      });

      it('should return empty for no notes', () => {
        const result = PROMPTS.mediaNote([]);
        expect(result).toBe('');
      });
    });

    describe('rateLimit()', () => {
      it('should format rate limit message', () => {
        const result = PROMPTS.rateLimit(30);
        expect(result).toContain('30');
      });
    });
  });
});
