/**
 * Auto Backup Service - Tự động backup/restore khi deploy
 *
 * Strategy: THROTTLE thay vì DEBOUNCE
 * - Backup NGAY khi có thay đổi đầu tiên
 * - Sau đó throttle: chỉ backup tối đa 1 lần mỗi X giây
 * - Nếu có thay đổi trong khi đang chờ throttle → đánh dấu dirty, backup sau khi hết throttle
 *
 * Điều này đảm bảo:
 * - Data luôn được backup ngay khi có thể
 * - Không spam backup quá nhiều
 * - Không bị mất data vì debounce reset liên tục
 */

import { existsSync } from 'node:fs';
import { debugLog } from '../../core/logger/logger.js';
import { CONFIG } from '../../core/config/config.js';
import { onDbChange, checkDatabaseIntegrity, removeDatabaseFiles } from '../database/connection.js';
import {
  uploadBackupToCloud,
  downloadAndRestoreFromCloud,
  isCloudBackupEnabled,
  getCloudBackupInfo,
} from './cloudBackup.service.js';

let unsubscribeDbChange: (() => void) | null = null;
let lastBackupTime = 0;
let isDirty = false;
let isBackingUp = false;
let throttleTimer: ReturnType<typeof setTimeout> | null = null;
let justRestored = false; // Flag để skip initial backup sau restore

/**
 * Lấy config từ CONFIG (settings.json)
 */
function getBackupConfig() {
  const config = CONFIG as typeof CONFIG & {
    cloudBackup?: {
      enabled?: boolean;
      throttleMs?: number;
      restoreDelayMs?: number;
      initialBackupDelayMs?: number;
    };
  };

  return {
    enabled: config.cloudBackup?.enabled ?? true,
    throttleMs: config.cloudBackup?.throttleMs ?? 30000, // 30 giây throttle
    restoreDelayMs: config.cloudBackup?.restoreDelayMs ?? 15000,
    initialBackupDelayMs: config.cloudBackup?.initialBackupDelayMs ?? 30000,
  };
}

/**
 * Thực hiện backup
 */
async function doBackup(): Promise<void> {
  if (isBackingUp) {
    isDirty = true; // Đánh dấu cần backup lại sau
    return;
  }

  isBackingUp = true;
  isDirty = false;

  try {
    const result = await uploadBackupToCloud();
    if (result.success) {
      lastBackupTime = Date.now();
      debugLog('AUTO_BACKUP', result.message);
    } else {
      debugLog('AUTO_BACKUP', `Backup failed: ${result.message}`);
      isDirty = true; // Retry later
    }
  } catch (e) {
    debugLog('AUTO_BACKUP', `Backup error: ${e}`);
    isDirty = true;
  } finally {
    isBackingUp = false;

    // Nếu có thay đổi trong khi đang backup → schedule backup tiếp
    if (isDirty) {
      scheduleBackup();
    }
  }
}

/**
 * Schedule backup với throttle
 */
function scheduleBackup(): void {
  const backupConfig = getBackupConfig();
  const now = Date.now();
  const timeSinceLastBackup = now - lastBackupTime;

  // Nếu đã qua throttle time → backup ngay
  if (timeSinceLastBackup >= backupConfig.throttleMs) {
    doBackup();
    return;
  }

  // Chưa đủ thời gian → schedule backup sau khi hết throttle
  if (throttleTimer) return; // Đã có timer rồi

  isDirty = true;
  const waitTime = backupConfig.throttleMs - timeSinceLastBackup;

  throttleTimer = setTimeout(() => {
    throttleTimer = null;
    if (isDirty) {
      doBackup();
    }
  }, waitTime);

  debugLog('AUTO_BACKUP', `Throttled, will backup in ${Math.round(waitTime / 1000)}s`);
}

/**
 * Khởi tạo auto backup service
 */
export async function initAutoBackup(): Promise<void> {
  const backupConfig = getBackupConfig();

  if (!backupConfig.enabled) {
    console.log('☁️ Cloud backup disabled in settings');
    return;
  }

  if (!isCloudBackupEnabled()) {
    console.log('☁️ Cloud backup not configured (set GITHUB_GIST_TOKEN and GITHUB_GIST_ID)');
    return;
  }

  console.log('☁️ Cloud backup enabled');

  const dbPath = CONFIG.database?.path ?? 'data/bot.db';
  const dbExists = existsSync(dbPath);
  const dbHealthy = dbExists && checkDatabaseIntegrity(dbPath);

  // Nếu DB corrupt → xóa và restore
  if (dbExists && !dbHealthy) {
    console.log('⚠️ Database corrupt detected, removing for cloud restore...');
    removeDatabaseFiles(dbPath);
  }

  if (!dbExists || !dbHealthy) {
    console.log(`📥 Database not found/corrupt, waiting ${backupConfig.restoreDelayMs / 1000}s before restore...`);
    await new Promise((r) => setTimeout(r, backupConfig.restoreDelayMs));

    console.log('📥 Attempting to restore from cloud...');
    const result = await downloadAndRestoreFromCloud();

    if (result.success && !result.skipped) {
      console.log(`✅ ${result.message}`);
      justRestored = true; // Đánh dấu vừa restore, skip initial backup
    } else if (result.skipped) {
      console.log(`⏭️ ${result.message}`);
    } else {
      console.log(`⚠️ ${result.message} - Starting with fresh database`);
    }
  } else {
    const info = await getCloudBackupInfo();

    if (info.version && info.localVersion !== undefined) {
      if (info.version > info.localVersion) {
        console.log(`📥 Cloud has newer version (v${info.version} > local v${info.localVersion}), syncing...`);
        const result = await downloadAndRestoreFromCloud();
        if (result.success) {
          console.log(`✅ ${result.message}`);
        }
      } else {
        console.log(`☁️ Local database is up to date (v${info.localVersion})`);
      }
    } else if (info.lastBackup) {
      console.log(`☁️ Last cloud backup: ${info.lastBackup}`);
    }
  }

  // Start listening for changes
  startChangeListener();
}

/**
 * Start listening for database changes
 */
function startChangeListener(): void {
  if (unsubscribeDbChange) return;

  const backupConfig = getBackupConfig();

  // Initial backup sau khi bot ổn định (skip nếu vừa restore)
  setTimeout(async () => {
    if (justRestored) {
      console.log(`☁️ Skipping initial backup (just restored from cloud)`);
      justRestored = false;
      return;
    }
    debugLog('AUTO_BACKUP', 'Running initial backup...');
    await doBackup();
    console.log(`☁️ Initial backup completed`);
  }, backupConfig.initialBackupDelayMs);

  // Listen for database changes
  unsubscribeDbChange = onDbChange(() => {
    scheduleBackup();
  });

  console.log(`☁️ Auto backup on DB changes (throttle: ${backupConfig.throttleMs / 1000}s)`);
}

/**
 * Stop auto backup
 */
export function stopAutoBackup(): void {
  if (throttleTimer) {
    clearTimeout(throttleTimer);
    throttleTimer = null;
  }
  if (unsubscribeDbChange) {
    unsubscribeDbChange();
    unsubscribeDbChange = null;
  }
}

/**
 * Manual trigger backup
 */
export async function triggerCloudBackup(): Promise<{ success: boolean; message: string }> {
  return uploadBackupToCloud();
}

/**
 * Manual trigger restore
 */
export async function triggerCloudRestore(): Promise<{ success: boolean; message: string }> {
  return downloadAndRestoreFromCloud(true);
}
