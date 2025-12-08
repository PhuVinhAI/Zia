/**
 * Test: Character Config
 */
import { describe, expect, it } from 'bun:test';
import {
  CHARACTER,
  buildCharacterPrompt,
  CHARACTER_PROMPT,
} from '../../../src/infrastructure/ai/providers/gemini/character.js';

describe('Character Config', () => {
  describe('CHARACTER object', () => {
    it('should have basic info', () => {
      expect(CHARACTER.name).toBe('Zia');
      expect(CHARACTER.gender).toBe('Nữ');
      expect(CHARACTER.species).toBe('Cô gái kỹ thuật số');
    });

    it('should have personality traits', () => {
      expect(CHARACTER.personality_traits).toBeDefined();
      expect(Array.isArray(CHARACTER.personality_traits)).toBe(true);
      expect(CHARACTER.personality_traits.length).toBeGreaterThan(0);
    });

    it('should have likes and dislikes', () => {
      expect(CHARACTER.likes).toBeDefined();
      expect(CHARACTER.dislikes).toBeDefined();
      expect(CHARACTER.likes.length).toBeGreaterThan(0);
      expect(CHARACTER.dislikes.length).toBeGreaterThan(0);
    });

    it('should have speech style', () => {
      expect(CHARACTER.speech_style).toBeDefined();
      expect(CHARACTER.speech_style.tone).toBeDefined();
    });

    it('should have catchphrases', () => {
      expect(CHARACTER.catchphrases).toBeDefined();
      expect(Array.isArray(CHARACTER.catchphrases)).toBe(true);
    });

    it('should have emotional traits', () => {
      expect(CHARACTER.emotional_traits).toBeDefined();
      expect(CHARACTER.emotional_traits.default_mood).toBeDefined();
      expect(CHARACTER.emotional_traits.happy_triggers).toBeDefined();
    });

    it('should have example responses', () => {
      expect(CHARACTER.example_responses).toBeDefined();
      expect(CHARACTER.example_responses.greeting).toBeDefined();
      expect(CHARACTER.example_responses.being_praised).toBeDefined();
    });

    it('should have nicknames', () => {
      expect(CHARACTER.nickname).toBeDefined();
      expect(CHARACTER.nickname).toContain('Zia');
    });
  });

  describe('buildCharacterPrompt()', () => {
    it('should return a string', () => {
      const prompt = buildCharacterPrompt();
      expect(typeof prompt).toBe('string');
    });

    it('should include character name', () => {
      const prompt = buildCharacterPrompt();
      expect(prompt).toContain('Zia');
    });

    it('should include personality traits', () => {
      const prompt = buildCharacterPrompt();
      expect(prompt).toContain('TÍNH CÁCH');
    });

    it('should include speech style', () => {
      const prompt = buildCharacterPrompt();
      expect(prompt).toContain('CÁCH NÓI CHUYỆN');
    });

    it('should include rules', () => {
      const prompt = buildCharacterPrompt();
      expect(prompt).toContain('QUY TẮC');
    });
  });

  describe('CHARACTER_PROMPT', () => {
    it('should be pre-built', () => {
      expect(typeof CHARACTER_PROMPT).toBe('string');
      expect(CHARACTER_PROMPT.length).toBeGreaterThan(0);
    });

    it('should match buildCharacterPrompt output', () => {
      expect(CHARACTER_PROMPT).toBe(buildCharacterPrompt());
    });
  });
});
