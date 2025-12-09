/**
 * Cloud Backup Service - Backup/Restore database qua external storage
 * Sử dụng GitHub Gist làm storage (miễn phí, dễ setup)
 *
 * Env vars cần thiết:
 * - GITHUB_GIST_TOKEN: Personal Access Token với scope "gist"
 * - GITHUB_GIST_ID: ID của Gist để lưu backup (tạo 1 lần)
 */

import { existsSync, mkdirSync, statSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { debugLog } from '../../core/logger/logger.js';
import { CONFIG } from '../../core/config/config.js';
import { closeDatabase, initDatabase, getSqliteDb } from '../database/connection.js';

const GIST_API = 'https://api.github.com/gists';
const BACKUP_FILENAME = 'bot-database-backup.b64'; // Base64 encoded

interface GistFile {
  content: string;
  filename?: string;
}

interface GistResponse {
  id: string;
  files: Record<string, GistFile>;
  updated_at: string;
  description: string;
}

/**
 * Lấy config từ env
 */
function getConfig() {
  return {
    token: process.env.GITHUB_GIST_TOKEN,
    gistId: process.env.GITHUB_GIST_ID,
    enabled: !!process.env.GITHUB_GIST_TOKEN && !!process.env.GITHUB_GIST_ID,
  };
}

/**
 * Upload backup lên GitHub Gist
 */
export async function uploadBackupToCloud(): Promise<{ success: boolean; message: string }> {
  const config = getConfig();

  if (!config.enabled) {
    return { success: false, message: 'Cloud backup not configured (missing GITHUB_GIST_TOKEN or GITHUB_GIST_ID)' };
  }

  try {
    const dbPath = CONFIG.database?.path ?? 'data/bot.db';

    if (!existsSync(dbPath)) {
      return { success: false, message: 'Database file not found' };
    }

    // Checkpoint WAL trước khi backup
    try {
      const sqlite = getSqliteDb();
      sqlite.exec('PRAGMA wal_checkpoint(TRUNCATE);');
      debugLog('CLOUD_BACKUP', 'WAL checkpoint completed');
    } catch (e) {
      debugLog('CLOUD_BACKUP', `WAL checkpoint warning: ${e}`);
    }

    // Đọc database và encode base64
    const dbContent = await readFile(dbPath);
    const base64Content = dbContent.toString('base64');
    const stats = statSync(dbPath);

    // Metadata
    const metadata = {
      timestamp: new Date().toISOString(),
      size: stats.size,
      checksum: Bun.hash(dbContent).toString(16),
    };

    // Upload lên Gist
    const response = await fetch(`${GIST_API}/${config.gistId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json',
      },
      body: JSON.stringify({
        description: `Bot Database Backup - ${metadata.timestamp}`,
        files: {
          [BACKUP_FILENAME]: { content: base64Content },
          'metadata.json': { content: JSON.stringify(metadata, null, 2) },
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} - ${error}`);
    }

    debugLog('CLOUD_BACKUP', `Backup uploaded successfully (${stats.size} bytes)`);
    return {
      success: true,
      message: `Backup uploaded: ${metadata.timestamp} (${(stats.size / 1024).toFixed(2)} KB)`,
    };
  } catch (error) {
    debugLog('CLOUD_BACKUP', `Upload error: ${error}`);
    return { success: false, message: `Upload failed: ${error}` };
  }
}

/**
 * Download và restore backup từ GitHub Gist
 */
export async function downloadAndRestoreFromCloud(): Promise<{ success: boolean; message: string }> {
  const config = getConfig();

  if (!config.enabled) {
    return { success: false, message: 'Cloud backup not configured' };
  }

  try {
    // Fetch Gist
    const response = await fetch(`${GIST_API}/${config.gistId}`, {
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/vnd.github+json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, message: 'Gist not found' };
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const gist: GistResponse = await response.json();

    // Check if backup file exists
    if (!gist.files[BACKUP_FILENAME]) {
      return { success: false, message: 'No backup found in Gist' };
    }

    // Gist API truncates large files, need to fetch raw content
    const backupFile = gist.files[BACKUP_FILENAME];
    let base64Content: string;

    if (backupFile.content.length < 1000000) {
      // Content included in response
      base64Content = backupFile.content;
    } else {
      // Need to fetch raw URL
      const rawResponse = await fetch(`https://gist.githubusercontent.com/raw/${config.gistId}/${BACKUP_FILENAME}`);
      base64Content = await rawResponse.text();
    }

    // Decode base64
    const dbContent = Buffer.from(base64Content, 'base64');

    // Get metadata if available
    let metadata: { timestamp?: string; size?: number } = {};
    if (gist.files['metadata.json']) {
      try {
        metadata = JSON.parse(gist.files['metadata.json'].content);
      } catch {}
    }

    const dbPath = CONFIG.database?.path ?? 'data/bot.db';
    const dataDir = dbPath.substring(0, dbPath.lastIndexOf('/'));

    // Ensure data directory exists
    if (dataDir && !existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    // Close existing database if open
    try {
      closeDatabase();
    } catch {}

    // Write database file
    await writeFile(dbPath, dbContent);

    // Remove WAL/SHM files if exist
    const walPath = `${dbPath}-wal`;
    const shmPath = `${dbPath}-shm`;
    try {
      if (existsSync(walPath)) await Bun.write(walPath, '').then(() => {});
      if (existsSync(shmPath)) await Bun.write(shmPath, '').then(() => {});
    } catch {}

    // Reinitialize database
    initDatabase();

    debugLog('CLOUD_BACKUP', `Backup restored from cloud (${dbContent.length} bytes)`);
    return {
      success: true,
      message: `Restored from backup: ${metadata.timestamp || gist.updated_at} (${(dbContent.length / 1024).toFixed(2)} KB)`,
    };
  } catch (error) {
    debugLog('CLOUD_BACKUP', `Restore error: ${error}`);
    return { success: false, message: `Restore failed: ${error}` };
  }
}

/**
 * Check if cloud backup is configured
 */
export function isCloudBackupEnabled(): boolean {
  return getConfig().enabled;
}

/**
 * Get cloud backup info
 */
export async function getCloudBackupInfo(): Promise<{
  enabled: boolean;
  lastBackup?: string;
  size?: number;
}> {
  const config = getConfig();

  if (!config.enabled) {
    return { enabled: false };
  }

  try {
    const response = await fetch(`${GIST_API}/${config.gistId}`, {
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/vnd.github+json',
      },
    });

    if (!response.ok) {
      return { enabled: true };
    }

    const gist: GistResponse = await response.json();

    let metadata: { timestamp?: string; size?: number } = {};
    if (gist.files['metadata.json']) {
      try {
        metadata = JSON.parse(gist.files['metadata.json'].content);
      } catch {}
    }

    return {
      enabled: true,
      lastBackup: metadata.timestamp || gist.updated_at,
      size: metadata.size,
    };
  } catch {
    return { enabled: true };
  }
}
