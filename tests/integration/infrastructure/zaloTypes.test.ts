/**
 * Integration Test: Zalo Types
 * Test các type definitions cho Zalo API
 */

import { describe, test, expect } from 'bun:test';
import { TextStyle } from '../../../src/shared/types/zalo.types.js';

describe('Zalo Types', () => {
  describe('TextStyle', () => {
    test('TextStyle.Bold = 1', () => {
      expect(TextStyle.Bold).toBe(1);
    });

    test('TextStyle.Italic = 2', () => {
      expect(TextStyle.Italic).toBe(2);
    });

    test('TextStyle.Underline = 4', () => {
      expect(TextStyle.Underline).toBe(4);
    });

    test('TextStyle.StrikeThrough = 8', () => {
      expect(TextStyle.StrikeThrough).toBe(8);
    });

    test('TextStyle.Red = 16', () => {
      expect(TextStyle.Red).toBe(16);
    });

    test('TextStyle.Blue = 32', () => {
      expect(TextStyle.Blue).toBe(32);
    });

    test('TextStyle.Big = 64', () => {
      expect(TextStyle.Big).toBe(64);
    });

    test('TextStyle.Small = 128', () => {
      expect(TextStyle.Small).toBe(128);
    });
  });

  describe('TextStyle Combinations', () => {
    test('Bold + Italic = 3', () => {
      expect(TextStyle.Bold | TextStyle.Italic).toBe(3);
    });

    test('Bold + Big = 65', () => {
      expect(TextStyle.Bold | TextStyle.Big).toBe(65);
    });

    test('All styles combined', () => {
      const allStyles = 
        TextStyle.Bold | 
        TextStyle.Italic | 
        TextStyle.Underline | 
        TextStyle.StrikeThrough |
        TextStyle.Red |
        TextStyle.Blue |
        TextStyle.Big |
        TextStyle.Small;
      
      expect(allStyles).toBe(255);
    });
  });

  describe('TextStyle Bitwise Operations', () => {
    test('Check if style contains Bold', () => {
      const style = TextStyle.Bold | TextStyle.Italic;
      expect((style & TextStyle.Bold) !== 0).toBe(true);
      expect((style & TextStyle.Underline) !== 0).toBe(false);
    });

    test('Add style to existing', () => {
      let style: number = TextStyle.Bold;
      style = style | TextStyle.Italic;
      expect(style).toBe(3);
    });

    test('Remove style from existing', () => {
      let style: number = TextStyle.Bold | TextStyle.Italic;
      style = style & ~TextStyle.Italic;
      expect(style).toBe(TextStyle.Bold as number);
    });
  });
});
