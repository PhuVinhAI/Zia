/**
 * Auto Backup Service - Tự động backup/restore khi deploy
 *
 * Strategy:
 * 1. Backup khi có database changes (debounced)
 * 2. Khi khởi động: restore từ cloud nếu cần
 * 3. Version tracking để tránh race condition
 *
 * Flow:
 * 1. Khi khởi động: Check version, chỉ restore nếu cloud version > local
 * 2. Khi có DB changes: Debounce và backup sau X giây không có thay đổi mới
 */

import { existsSync } from 'node:fs';
import { debugLog } from '../../core/logger/logger.js';
import { CONFIG } from '../../core/config/config.js';
import { onDbChange } from '../database/connection.js';
import {
  uploadBackupToCloud,
  downloadAndRestoreFromCloud,
  isCloudBackupEnabled,
  getCloudBackupInfo,
} from './cloudBackup.service.js';

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let unsubscribeDbChange: (() => void) | null = null;
let pendingBackup = false;
let lastBackupTime = 0;

/**
 * Lấy config từ CONFIG (settings.json)
 */
function getBackupConfig() {
  const config = CONFIG as typeof CONFIG & {
    cloudBackup?: {
      enabled?: boolean;
      debounceMs?: number;
      minIntervalMs?: number;
      restoreDelayMs?: number;
      initialBackupDelayMs?: number;
    };
  };

  return {
    enabled: config.cloudBackup?.enabled ?? true,
    debounceMs: config.cloudBackup?.debounceMs ?? 10000, // 10 giây debounce
    minIntervalMs: config.cloudBackup?.minIntervalMs ?? 60000, // Tối thiểu 1 phút giữa các backup
    restoreDelayMs: config.cloudBackup?.restoreDelayMs ?? 15000, // 15 giây
    initialBackupDelayMs: config.cloudBackup?.initialBackupDelayMs ?? 30000, // 30 giây
  };
}

/**
 * Debounced backup - chỉ backup sau khi không có thay đổi trong X giây
 */
function scheduleBackup(): void {
  const backupConfig = getBackupConfig();

  // Clear timer cũ nếu có
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  pendingBackup = true;

  debounceTimer = setTimeout(async () => {
    debounceTimer = null;

    // Check minimum interval
    const now = Date.now();
    const timeSinceLastBackup = now - lastBackupTime;

    if (timeSinceLastBackup < backupConfig.minIntervalMs) {
      // Chưa đủ thời gian, schedule lại
      const waitTime = backupConfig.minIntervalMs - timeSinceLastBackup;
      debugLog('AUTO_BACKUP', `Waiting ${waitTime}ms before backup (min interval)`);
      debounceTimer = setTimeout(() => scheduleBackup(), waitTime);
      return;
    }

    if (!pendingBackup) return;
    pendingBackup = false;

    debugLog('AUTO_BACKUP', 'Database changed, backing up...');
    const result = await uploadBackupToCloud();

    if (result.success) {
      lastBackupTime = Date.now();
      debugLog('AUTO_BACKUP', result.message);
    } else {
      debugLog('AUTO_BACKUP', `Backup failed: ${result.message}`);
    }
  }, backupConfig.debounceMs);
}

/**
 * Khởi tạo auto backup service
 * Gọi hàm này trong main.ts TRƯỚC khi init database
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

  if (!dbExists) {
    console.log(`📥 Database not found, waiting ${backupConfig.restoreDelayMs / 1000}s before restore...`);
    await new Promise((r) => setTimeout(r, backupConfig.restoreDelayMs));

    console.log('📥 Attempting to restore from cloud...');
    const result = await downloadAndRestoreFromCloud();

    if (result.success && !result.skipped) {
      console.log(`✅ ${result.message}`);
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

  // Subscribe to database changes
  startChangeListener();
}

/**
 * Start listening for database changes
 */
function startChangeListener(): void {
  if (unsubscribeDbChange) return;

  const backupConfig = getBackupConfig();

  // Initial backup sau khi bot ổn định
  setTimeout(async () => {
    debugLog('AUTO_BACKUP', 'Running initial backup...');
    const result = await uploadBackupToCloud();
    if (result.success) {
      lastBackupTime = Date.now();
      console.log(`☁️ Initial backup: ${result.message}`);
    }
  }, backupConfig.initialBackupDelayMs);

  // Listen for database changes
  unsubscribeDbChange = onDbChange(() => {
    scheduleBackup();
  });

  console.log(`☁️ Auto backup on DB changes (debounce: ${backupConfig.debounceMs / 1000}s, min interval: ${backupConfig.minIntervalMs / 1000}s)`);
}

/**
 * Stop listening for changes
 */
export function stopAutoBackup(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (unsubscribeDbChange) {
    unsubscribeDbChange();
    unsubscribeDbChange = null;
  }
}

/**
 * Manual trigger backup to cloud
 */
export async function triggerCloudBackup(): Promise<{ success: boolean; message: string }> {
  return uploadBackupToCloud();
}

/**
 * Manual trigger restore from cloud
 */
export async function triggerCloudRestore(): Promise<{ success: boolean; message: string }> {
  return downloadAndRestoreFromCloud(true);
}
