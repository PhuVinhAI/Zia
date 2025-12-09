/**
 * DateTime Utils - Day.js wrapper cho xử lý thời gian
 */

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';
import 'dayjs/locale/vi.js';

// Extend plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

// Set locale mặc định
dayjs.locale('vi');

// ═══════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════

export { dayjs };

/**
 * Lấy timestamp hiện tại (ISO string)
 */
export function now(): string {
  return dayjs().toISOString();
}

/**
 * Lấy Date object hiện tại
 */
export function nowDate(): Date {
  return dayjs().toDate();
}

/**
 * Format timestamp cho tên file/folder (YYYY-MM-DD_HH-mm-ss)
 */
export function formatFileTimestamp(date?: Date | string | number): string {
  return dayjs(date).format('YYYY-MM-DD_HH-mm-ss');
}

/**
 * Format datetime chuẩn (YYYY-MM-DD HH:mm:ss)
 */
export function formatDateTime(date?: Date | string | number): string {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
}

/**
 * Format date (YYYY-MM-DD)
 */
export function formatDate(date?: Date | string | number): string {
  return dayjs(date).format('YYYY-MM-DD');
}

/**
 * Format time (HH:mm:ss)
 */
export function formatTime(date?: Date | string | number): string {
  return dayjs(date).format('HH:mm:ss');
}

/**
 * Relative time (VD: "2 phút trước", "trong 3 ngày")
 */
export function fromNow(date: Date | string | number): string {
  return dayjs(date).fromNow();
}

/**
 * Relative time đến một thời điểm (VD: "2 phút", "3 ngày")
 */
export function toNow(date: Date | string | number): string {
  return dayjs(date).toNow();
}

/**
 * Tính khoảng cách thời gian (milliseconds)
 */
export function diffMs(date1: Date | string | number, date2?: Date | string | number): number {
  return dayjs(date1).diff(dayjs(date2));
}

/**
 * Tính khoảng cách thời gian theo đơn vị
 */
export function diff(
  date1: Date | string | number,
  date2: Date | string | number | undefined,
  unit: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year',
): number {
  return dayjs(date1).diff(dayjs(date2), unit);
}

/**
 * Cộng thời gian
 */
export function add(
  date: Date | string | number,
  value: number,
  unit: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year',
): Date {
  return dayjs(date).add(value, unit).toDate();
}

/**
 * Trừ thời gian
 */
export function subtract(
  date: Date | string | number,
  value: number,
  unit: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year',
): Date {
  return dayjs(date).subtract(value, unit).toDate();
}

/**
 * Kiểm tra date có hợp lệ không
 */
export function isValid(date: Date | string | number): boolean {
  return dayjs(date).isValid();
}

/**
 * Parse date string
 */
export function parse(date: string | number | Date): dayjs.Dayjs {
  return dayjs(date);
}
