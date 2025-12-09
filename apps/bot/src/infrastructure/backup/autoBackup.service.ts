/**
 * Auto Backup Service - Tự động backup/restore khi deploy
 *
 * Strategy để tránh race condition trên Render:
 * 1. KHÔNG rely vào shutdown backup (Render chỉ cho 10s, không đủ)
 * 2. Backup thường xuyên (mặc định 5 phút) để giảm data loss
 * 3. Dùng version number để tránh restore backup cũ
 * 4. Lock file để tránh concurrent operations
 *
 * Flow:
 * 1. Khi khởi động: Check version, chỉ restore nếu cloud version > local
 * 2. Định kỳ: Auto backup lên cloud
 */

import { existsSync } from 'node:fs';
import { debugLog } from '../../core/logger/logger.js';
import { CONFIG } from '../../core/config/config.js';
import {
  uploadBackupToCloud,
  downloadAndRestoreFromCloud,
  isCloudBackupEnabled,
  getCloudBackupInfo,
} from './cloudBackup.service.js';

let autoBackupTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Lấy config từ CONFIG (settings.json)
 */
function getBackupConfig() {
  // Type assertion để access cloudBackup (đã được thêm vào config.schema.ts)
  const config = CONFIG as typeof CONFIG & {
    cloudBackup?: {
      enabled?: boolean;
      autoBackupIntervalMs?: number;
      restoreDelayMs?: number;
      initialBackupDelayMs?: number;
    };
  };

  return {
    enabled: config.cloudBackup?.enabled ?? true,
    autoBackupIntervalMs: config.cloudBackup?.autoBackupIntervalMs ?? 300000, // 5 phút
    restoreDelayMs: config.cloudBackup?.restoreDelayMs ?? 15000, // 15 giây
    initialBackupDelayMs: config.cloudBackup?.initialBackupDelayMs ?? 30000, // 30 giây
  };
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
    // Database không tồn tại - đợi một chút rồi restore
    // Delay này cho phép instance cũ có thời gian backup trước khi bị kill
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
    // Database tồn tại - check xem có cần sync từ cloud không
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

  // Start periodic backup
  startPeriodicBackup();
}

/**
 * Start periodic backup job
 */
function startPeriodicBackup(): void {
  if (autoBackupTimer) return;

  const backupConfig = getBackupConfig();

  // Backup ngay lập tức khi start (sau delay để bot ổn định)
  setTimeout(async () => {
    debugLog('AUTO_BACKUP', 'Running initial backup...');
    const result = await uploadBackupToCloud();
    if (result.success) {
      console.log(`☁️ Initial backup: ${result.message}`);
    }
  }, backupConfig.initialBackupDelayMs);

  // Periodic backup
  autoBackupTimer = setInterval(async () => {
    debugLog('AUTO_BACKUP', 'Running periodic backup...');
    const result = await uploadBackupToCloud();

    if (result.success) {
      debugLog('AUTO_BACKUP', result.message);
    } else {
      debugLog('AUTO_BACKUP', `Periodic backup failed: ${result.message}`);
    }
  }, backupConfig.autoBackupIntervalMs);

  console.log(`☁️ Auto backup enabled (every ${backupConfig.autoBackupIntervalMs / 60000} minutes)`);
}

/**
 * Stop periodic backup
 */
export function stopPeriodicBackup(): void {
  if (autoBackupTimer) {
    clearInterval(autoBackupTimer);
    autoBackupTimer = null;
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
  return downloadAndRestoreFromCloud(true); // force = true để bỏ qua version check
}
