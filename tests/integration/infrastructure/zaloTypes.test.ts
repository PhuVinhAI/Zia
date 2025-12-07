/**
 * Integration Test: Zalo Types
 * Test các type definitions cho Zalo API
 * 
 * TextStyle sử dụng string values theo zca-js API:
 * - 'b' = Bold
 * - 'i' = Italic
 * - 'u' = Underline
 * - 's' = StrikeThrough
 * - 'c_xxx' = Color (hex)
 * - 'f_xx' = Font size
 */

import { describe, test, expect } from 'bun:test';
import { TextStyle } from '../../../src/shared/types/zalo.types.js';

describe('Zalo Types', () => {
  describe('TextStyle String Values', () => {
    test('TextStyle.Bold = "b"', () => {
      expect(TextStyle.Bold).toBe('b');
    });

    test('TextStyle.Italic = "i"', () => {
      expect(TextStyle.Italic).toBe('i');
    });

    test('TextStyle.Underline = "u"', () => {
      expect(TextStyle.Underline).toBe('u');
    });

    test('TextStyle.StrikeThrough = "s"', () => {
      expect(TextStyle.StrikeThrough).toBe('s');
    });

    test('TextStyle.Red = "c_db342e"', () => {
      expect(TextStyle.Red).toBe('c_db342e');
    });

    test('TextStyle.Orange = "c_f27806"', () => {
      expect(TextStyle.Orange).toBe('c_f27806');
    });

    test('TextStyle.Yellow = "c_f7b503"', () => {
      expect(TextStyle.Yellow).toBe('c_f7b503');
    });

    test('TextStyle.Green = "c_15a85f"', () => {
      expect(TextStyle.Green).toBe('c_15a85f');
    });

    test('TextStyle.Blue = "c_0068ff"', () => {
      expect(TextStyle.Blue).toBe('c_0068ff');
    });

    test('TextStyle.Big = "f_18"', () => {
      expect(TextStyle.Big).toBe('f_18');
    });

    test('TextStyle.Small = "f_13"', () => {
      expect(TextStyle.Small).toBe('f_13');
    });
  });

  describe('TextStyle Usage', () => {
    test('Multiple styles require separate entries', () => {
      // Zalo API yêu cầu mỗi style là một entry riêng
      const boldItalicStyles = [
        { start: 0, len: 5, st: TextStyle.Bold },
        { start: 0, len: 5, st: TextStyle.Italic },
      ];
      
      expect(boldItalicStyles).toHaveLength(2);
      expect(boldItalicStyles[0].st).toBe('b');
      expect(boldItalicStyles[1].st).toBe('i');
    });

    test('Style object structure', () => {
      const style = {
        start: 10,
        len: 5,
        st: TextStyle.Bold,
      };
      
      expect(style.start).toBe(10);
      expect(style.len).toBe(5);
      expect(style.st).toBe('b');
    });

    test('All available styles', () => {
      const allStyles = Object.values(TextStyle);
      expect(allStyles).toContain('b');
      expect(allStyles).toContain('i');
      expect(allStyles).toContain('u');
      expect(allStyles).toContain('s');
      expect(allStyles).toContain('f_18');
      expect(allStyles).toContain('f_13');
    });
  });
});
