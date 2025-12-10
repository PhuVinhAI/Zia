/**
 * Cron Utilities - Parse va tinh toan cron expression
 * Format: "phut gio ngay thang thu" (standard 5-field cron)
 *
 * Vi du:
 * - "0 8 * * *" = 8:00 moi ngay
 * - "30 12 * * 1-5" = 12:30 thu 2-6 (Mon-Fri)
 * - "0 9 1 * *" = 9:00 ngay 1 moi thang
 */

import { debugLog } from '../../core/logger/logger.js';

interface CronFields {
  minute: number[];
  hour: number[];
  dayOfMonth: number[];
  month: number[];
  dayOfWeek: number[];
}

/**
 * Parse mot field cua cron expression
 * Ho tro: *, so, range (1-5), step, list (1,3,5)
 */
function parseField(field: string, min: number, max: number): number[] | null {
  const values: number[] = [];

  // Xu ly list (1,3,5)
  const parts = field.split(',');

  for (const part of parts) {
    // Xu ly step
    const stepMatch = part.match(/^(.+)\/(\d+)$/);
    let range: string;
    let step = 1;

    if (stepMatch) {
      range = stepMatch[1];
      step = parseInt(stepMatch[2], 10);
      if (isNaN(step) || step < 1) return null;
    } else {
      range = part;
    }

    // Xu ly range hoac single value
    if (range === '*') {
      // Tat ca gia tri voi step
      for (let i = min; i <= max; i += step) {
        values.push(i);
      }
    } else if (range.includes('-')) {
      // Range (1-5)
      const [startStr, endStr] = range.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (isNaN(start) || isNaN(end) || start < min || end > max || start > end) {
        return null;
      }

      for (let i = start; i <= end; i += step) {
        values.push(i);
      }
    } else {
      // Single value
      const val = parseInt(range, 10);
      if (isNaN(val) || val < min || val > max) {
        return null;
      }
      values.push(val);
    }
  }

  return values.length > 0 ? [...new Set(values)].sort((a, b) => a - b) : null;
}

/**
 * Parse cron expression thanh cac fields
 */
function parseCron(expression: string): CronFields | null {
  const parts = expression.trim().split(/\s+/);

  if (parts.length !== 5) {
    debugLog('CRON', `Invalid cron: expected 5 fields, got ${parts.length}`);
    return null;
  }

  const [minuteStr, hourStr, dayOfMonthStr, monthStr, dayOfWeekStr] = parts;

  const minute = parseField(minuteStr, 0, 59);
  const hour = parseField(hourStr, 0, 23);
  const dayOfMonth = parseField(dayOfMonthStr, 1, 31);
  const month = parseField(monthStr, 1, 12);
  const dayOfWeek = parseField(dayOfWeekStr, 0, 6); // 0 = Sunday

  if (!minute || !hour || !dayOfMonth || !month || !dayOfWeek) {
    debugLog('CRON', `Invalid cron field in: ${expression}`);
    return null;
  }

  return { minute, hour, dayOfMonth, month, dayOfWeek };
}

/**
 * Kiem tra cron expression co hop le khong
 */
export function isValidCron(expression: string): boolean {
  return parseCron(expression) !== null;
}

/**
 * Tinh thoi diem chay tiep theo cua cron expression
 */
export function getNextCronTime(expression: string, from?: Date): Date | null {
  const fields = parseCron(expression);
  if (!fields) return null;

  const now = from ? new Date(from) : new Date();
  // Bat dau tu phut tiep theo
  const next = new Date(now);
  next.setSeconds(0, 0);
  next.setMinutes(next.getMinutes() + 1);

  // Gioi han tim kiem: 2 nam
  const maxDate = new Date(now);
  maxDate.setFullYear(maxDate.getFullYear() + 2);

  while (next < maxDate) {
    // Kiem tra thang
    if (!fields.month.includes(next.getMonth() + 1)) {
      next.setMonth(next.getMonth() + 1, 1);
      next.setHours(0, 0, 0, 0);
      continue;
    }

    // Kiem tra ngay trong thang
    const dayOfMonth = next.getDate();
    const dayOfWeek = next.getDay();

    const dayOfMonthMatch = fields.dayOfMonth.includes(dayOfMonth);
    const dayOfWeekMatch = fields.dayOfWeek.includes(dayOfWeek);

    // Kiem tra xem field co phai la * khong
    const dayOfMonthIsWildcard = fields.dayOfMonth.length === 31;
    const dayOfWeekIsWildcard = fields.dayOfWeek.length === 7;

    let dayMatch: boolean;
    if (dayOfMonthIsWildcard && dayOfWeekIsWildcard) {
      dayMatch = true;
    } else if (dayOfMonthIsWildcard) {
      dayMatch = dayOfWeekMatch;
    } else if (dayOfWeekIsWildcard) {
      dayMatch = dayOfMonthMatch;
    } else {
      // Ca hai deu duoc chi dinh -> match mot trong hai
      dayMatch = dayOfMonthMatch || dayOfWeekMatch;
    }

    if (!dayMatch) {
      next.setDate(next.getDate() + 1);
      next.setHours(0, 0, 0, 0);
      continue;
    }

    // Kiem tra gio
    if (!fields.hour.includes(next.getHours())) {
      const nextHour = fields.hour.find((h) => h > next.getHours());
      if (nextHour !== undefined) {
        next.setHours(nextHour, fields.minute[0], 0, 0);
        continue;
      }
      next.setDate(next.getDate() + 1);
      next.setHours(0, 0, 0, 0);
      continue;
    }

    // Kiem tra phut
    if (!fields.minute.includes(next.getMinutes())) {
      const nextMinute = fields.minute.find((m) => m > next.getMinutes());
      if (nextMinute !== undefined) {
        next.setMinutes(nextMinute, 0, 0);
        continue;
      }
      next.setHours(next.getHours() + 1, 0, 0, 0);
      continue;
    }

    // Tat ca dieu kien deu match!
    return next;
  }

  debugLog('CRON', `Could not find next run time for: ${expression}`);
  return null;
}

/**
 * Kiem tra xem thoi diem hien tai co match voi cron expression khong
 */
export function matchesCron(expression: string, date?: Date): boolean {
  const fields = parseCron(expression);
  if (!fields) return false;

  const d = date || new Date();

  if (!fields.minute.includes(d.getMinutes())) return false;
  if (!fields.hour.includes(d.getHours())) return false;
  if (!fields.month.includes(d.getMonth() + 1)) return false;

  const dayOfMonth = d.getDate();
  const dayOfWeek = d.getDay();
  const dayOfMonthMatch = fields.dayOfMonth.includes(dayOfMonth);
  const dayOfWeekMatch = fields.dayOfWeek.includes(dayOfWeek);
  const dayOfMonthIsWildcard = fields.dayOfMonth.length === 31;
  const dayOfWeekIsWildcard = fields.dayOfWeek.length === 7;

  if (dayOfMonthIsWildcard && dayOfWeekIsWildcard) {
    return true;
  } else if (dayOfMonthIsWildcard) {
    return dayOfWeekMatch;
  } else if (dayOfWeekIsWildcard) {
    return dayOfMonthMatch;
  } else {
    return dayOfMonthMatch || dayOfWeekMatch;
  }
}

/**
 * Format cron expression thanh mo ta de doc (tieng Viet)
 */
export function describeCron(expression: string): string {
  const fields = parseCron(expression);
  if (!fields) return 'Cron khong hop le';

  const parts: string[] = [];

  // Phut va gio
  if (fields.minute.length === 1 && fields.hour.length === 1) {
    parts.push(`luc ${fields.hour[0]}:${fields.minute[0].toString().padStart(2, '0')}`);
  } else if (fields.minute.length === 60 && fields.hour.length === 24) {
    parts.push('moi phut');
  } else if (fields.minute.length === 1 && fields.hour.length === 24) {
    parts.push(`phut ${fields.minute[0]} moi gio`);
  } else {
    parts.push(`phut ${fields.minute.join(',')} gio ${fields.hour.join(',')}`);
  }

  // Ngay trong tuan
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  if (fields.dayOfWeek.length < 7) {
    const days = fields.dayOfWeek.map((d) => dayNames[d]).join(', ');
    parts.push(`cac ngay ${days}`);
  }

  // Ngay trong thang
  if (fields.dayOfMonth.length < 31) {
    parts.push(`ngay ${fields.dayOfMonth.join(', ')}`);
  }

  // Thang
  if (fields.month.length < 12) {
    parts.push(`thang ${fields.month.join(', ')}`);
  }

  return parts.join(' ');
}
