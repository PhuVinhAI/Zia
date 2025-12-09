/**
 * Auto Backup Service - Tự động backup/restore khi deploy
 *
 * Flow:
 * 1. Khi khởi động: Check nếu database không tồn tại -> restore từ cloud
 * 2. Định kỳ: Auto backup lên cloud (mỗi X phút)
 * 3. Trước khi shutdown: Backup lên cloud (graceful shutdown)
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

// Auto backup interval (default: 30 minutes)
const AUTO_BACKUP_INTERVAL_MS = Number(process.env.AUTO_BACKUP_INTERVAL_MS) || 30 * 60 * 1000;

let autoBackupTimer: ReturnType<typeof setInterval> | null = null;
let isShuttingDown = false;

/**
 * Khởi tạo auto backup service
 * Gọi hàm này trong main.ts TRƯỚC khi init database
 */
export async function initAutoBackup(): Promise<void> {
  if (!isCloudBackupEnabled()) {
    console.log('☁️ Cloud backup not configured (set GITHUB_GIST_TOKEN and GITHUB_GIST_ID)');
    return;
  }

  console.log('☁️ Cloud backup enabled');

  const dbPath = CONFIG.database?.path ?? 'data/bot.db';

  // Check if database exists
  if (!existsSync(dbPath)) {
    console.log('📥 Database not found, attempting to restore from cloud...');

    const result = await downloadAndRestoreFromCloud();

    if (result.success) {
      console.log(`✅ ${result.message}`);
    } else {
      console.log(`⚠️ ${result.message} - Starting with fresh database`);
    }
  } else {
    // Database exists, show cloud backup info
    const info = await getCloudBackupInfo();
    if (info.lastBackup) {
      console.log(`☁️ Last cloud backup: ${info.lastBackup}`);
    }
  }

  // Start periodic backup
  startPeriodicBackup();

  // Register shutdown handlers
  registerShutdownHandlers();
}

/**
 * Start periodic backup job
 */
function startPeriodicBackup(): void {
  if (autoBackupTimer) return;

  autoBackupTimer = setInterval(async () => {
    if (isShuttingDown) return;

    debugLog('AUTO_BACKUP', 'Running periodic backup...');
    const result = await uploadBackupToCloud();

    if (result.success) {
      debugLog('AUTO_BACKUP', result.message);
    } else {
      debugLog('AUTO_BACKUP', `Periodic backup failed: ${result.message}`);
    }
  }, AUTO_BACKUP_INTERVAL_MS);

  console.log(`☁️ Auto backup enabled (every ${AUTO_BACKUP_INTERVAL_MS / 60000} minutes)`);
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
 * Register graceful shutdown handlers
 */
function registerShutdownHandlers(): void {
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n🛑 Received ${signal}, backing up before shutdown...`);
    stopPeriodicBackup();

    const result = await uploadBackupToCloud();
    if (result.success) {
      console.log(`✅ Shutdown backup: ${result.message}`);
    } else {
      console.log(`⚠️ Shutdown backup failed: ${result.message}`);
    }

    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
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
  return downloadAndRestoreFromCloud();
}
