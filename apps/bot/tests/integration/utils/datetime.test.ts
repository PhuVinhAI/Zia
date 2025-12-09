/**
 * Test: DateTime Utils
 */
import { describe, expect, it } from 'bun:test';
import {
  now,
  nowDate,
  formatFileTimestamp,
  formatDateTime,
  formatDate,
  formatTime,
  fromNow,
  diffMs,
  diff,
  add,
  subtract,
  isValid,
  parse,
} from '../../../src/shared/utils/datetime.js';

describe('DateTime Utils', () => {
  describe('now()', () => {
    it('should return ISO string', () => {
      const result = now();
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('nowDate()', () => {
    it('should return Date object', () => {
      const result = nowDate();
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('formatFileTimestamp()', () => {
    it('should format as YYYY-MM-DD_HH-mm-ss', () => {
      const date = new Date('2024-03-15T10:30:45');
      const result = formatFileTimestamp(date);
      expect(result).toBe('2024-03-15_10-30-45');
    });

    it('should use current time if no date provided', () => {
      const result = formatFileTimestamp();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/);
    });
  });

  describe('formatDateTime()', () => {
    it('should format as YYYY-MM-DD HH:mm:ss', () => {
      const date = new Date('2024-03-15T10:30:45');
      const result = formatDateTime(date);
      expect(result).toBe('2024-03-15 10:30:45');
    });
  });

  describe('formatDate()', () => {
    it('should format as YYYY-MM-DD', () => {
      const date = new Date('2024-03-15T10:30:45');
      const result = formatDate(date);
      expect(result).toBe('2024-03-15');
    });
  });

  describe('formatTime()', () => {
    it('should format as HH:mm:ss', () => {
      const date = new Date('2024-03-15T10:30:45');
      const result = formatTime(date);
      expect(result).toBe('10:30:45');
    });
  });

  describe('fromNow()', () => {
    it('should return relative time string', () => {
      const pastDate = subtract(new Date(), 5, 'minute');
      const result = fromNow(pastDate);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('diffMs()', () => {
    it('should return difference in milliseconds', () => {
      const date1 = new Date('2024-03-15T10:00:00');
      const date2 = new Date('2024-03-15T10:00:05');
      const result = diffMs(date2, date1);
      expect(result).toBe(5000);
    });
  });

  describe('diff()', () => {
    it('should return difference in specified unit', () => {
      const date1 = new Date('2024-03-15T10:00:00');
      const date2 = new Date('2024-03-15T12:00:00');
      
      expect(diff(date2, date1, 'hour')).toBe(2);
      expect(diff(date2, date1, 'minute')).toBe(120);
    });
  });

  describe('add()', () => {
    it('should add time to date', () => {
      const date = new Date('2024-03-15T10:00:00');
      
      const result = add(date, 2, 'hour');
      expect(result.getHours()).toBe(12);
    });

    it('should handle different units', () => {
      const date = new Date('2024-03-15T10:00:00');
      
      expect(add(date, 30, 'minute').getMinutes()).toBe(30);
      expect(add(date, 1, 'day').getDate()).toBe(16);
    });
  });

  describe('subtract()', () => {
    it('should subtract time from date', () => {
      const date = new Date('2024-03-15T10:00:00');
      
      const result = subtract(date, 2, 'hour');
      expect(result.getHours()).toBe(8);
    });
  });

  describe('isValid()', () => {
    it('should return true for valid dates', () => {
      expect(isValid(new Date())).toBe(true);
      expect(isValid('2024-03-15')).toBe(true);
      expect(isValid(1710489600000)).toBe(true);
    });

    it('should return false for invalid dates', () => {
      expect(isValid('invalid')).toBe(false);
      expect(isValid(NaN)).toBe(false);
    });
  });

  describe('parse()', () => {
    it('should parse various date formats', () => {
      const result1 = parse('2024-03-15');
      expect(result1.isValid()).toBe(true);
      
      const result2 = parse(new Date());
      expect(result2.isValid()).toBe(true);
      
      const result3 = parse(1710489600000);
      expect(result3.isValid()).toBe(true);
    });
  });
});
