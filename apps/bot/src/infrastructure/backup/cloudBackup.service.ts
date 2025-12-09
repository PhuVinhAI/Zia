/**
 * Cloud Backup Service - Backup/Restore database qua external storage
 * Sử dụng GitHub Gist làm storage (miễn phí, dễ setup)
 *
 * Env vars cần thiết:
 * - GITHUB_GIST_TOKEN: Personal Access Token với scope "gist"
 * - GITHUB_GIST_ID: ID của Gist để lưu backup (tạo 1 lần)
 *
 * Anti-race condition:
 * - Mỗi backup có version number tăng dần
 * - Restore chỉ thực hiện nếu local DB không tồn tại HOẶC version cloud > local
 * - Lock file để tránh concurrent backup/restore
 */

import { existsSync, mkdirSync, statSync, unlinkSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { debugLog } from '../../core/logger/logger.js';
import { CONFIG } from '../../core/config/config.js';
import { closeDatabase, initDatabase, getSqliteDb } from '../database/connection.js';

const GIST_API = 'https://api.github.com/gists';
const BACKUP_FILENAME = 'bot-database-backup.b64';
const LOCK_FILE = 'data/.backup.lock';
const VERSION_FILE = 'data/.backup.version';

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

interface BackupMetadata {
  timestamp: string;
  size: number;
  checksum: string;
  version: number; // Incremental version để tránh race condition
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
 * Acquire lock để tránh concurrent operations
 */
async function acquireLock(timeout = 30000): Promise<boolean> {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (!existsSync(LOCK_FILE)) {
      try {
        await writeFile(LOCK_FILE, `${Date.now()}`);
        return true;
      } catch {
        // Another process might have created it
      }
    } else {
      // Check if lock is stale (older than 2 minutes)
      try {
        const lockTime = Number(await readFile(LOCK_FILE, 'utf-8'));
        if (Date.now() - lockTime > 120000) {
          unlinkSync(LOCK_FILE);
          continue;
        }
      } catch {}
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  return false;
}

/**
 * Release lock
 */
function releaseLock(): void {
  try {
    if (existsSync(LOCK_FILE)) {
      unlinkSync(LOCK_FILE);
    }
  } catch {}
}

/**
 * Get local backup version
 */
async function getLocalVersion(): Promise<number> {
  try {
    if (existsSync(VERSION_FILE)) {
      const content = await readFile(VERSION_FILE, 'utf-8');
      return Number(content) || 0;
    }
  } catch {}
  return 0;
}

/**
 * Set local backup version
 */
async function setLocalVersion(version: number): Promise<void> {
  const dir = VERSION_FILE.substring(0, VERSION_FILE.lastIndexOf('/'));
  if (dir && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  await writeFile(VERSION_FILE, String(version));
}

/**
 * Get cloud backup metadata
 */
async function getCloudMetadata(): Promise<BackupMetadata | null> {
  const config = getConfig();
  if (!config.enabled) return null;

  try {
    const response = await fetch(`${GIST_API}/${config.gistId}`, {
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/vnd.github+json',
      },
    });

    if (!response.ok) return null;

    const gist: GistResponse = await response.json();
    if (gist.files['metadata.json']) {
      return JSON.parse(gist.files['metadata.json'].content);
    }
  } catch {}

  return null;
}

/**
 * Upload backup lên GitHub Gist
 */
export async function uploadBackupToCloud(): Promise<{ success: boolean; message: string }> {
  const config = getConfig();

  if (!config.enabled) {
    return { success: false, message: 'Cloud backup not configured (missing GITHUB_GIST_TOKEN or GITHUB_GIST_ID)' };
  }

  // Acquire lock
  const hasLock = await acquireLock(5000); // 5s timeout cho upload
  if (!hasLock) {
    return { success: false, message: 'Another backup/restore operation in progress' };
  }

  try {
    const dbPath = CONFIG.database?.path ?? 'data/bot.db';

    if (!existsSync(dbPath)) {
      return { success: false, message: 'Database file not found' };
    }

    // Checkpoint WAL trước khi backup
    try {
      const sqlite = getSqliteDb();
      sqlite.run('PRAGMA wal_checkpoint(TRUNCATE)');
      debugLog('CLOUD_BACKUP', 'WAL checkpoint completed');
    } catch (e) {
      debugLog('CLOUD_BACKUP', `WAL checkpoint warning: ${e}`);
    }

    // Đọc database và encode base64
    const dbContent = await readFile(dbPath);
    const base64Content = dbContent.toString('base64');
    const stats = statSync(dbPath);

    // Get current version và increment
    const cloudMeta = await getCloudMetadata();
    const newVersion = (cloudMeta?.version || 0) + 1;

    // Metadata với version
    const metadata: BackupMetadata = {
      timestamp: new Date().toISOString(),
      size: stats.size,
      checksum: Bun.hash(dbContent).toString(16),
      version: newVersion,
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
        description: `Bot Database Backup - v${newVersion} - ${metadata.timestamp}`,
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

    // Update local version
    await setLocalVersion(newVersion);

    debugLog('CLOUD_BACKUP', `Backup uploaded v${newVersion} (${stats.size} bytes)`);
    return {
      success: true,
      message: `Backup v${newVersion} uploaded: ${metadata.timestamp} (${(stats.size / 1024).toFixed(2)} KB)`,
    };
  } catch (error) {
    debugLog('CLOUD_BACKUP', `Upload error: ${error}`);
    return { success: false, message: `Upload failed: ${error}` };
  } finally {
    releaseLock();
  }
}

/**
 * Download và restore backup từ GitHub Gist
 * Chỉ restore nếu:
 * - Local DB không tồn tại, HOẶC
 * - Cloud version > local version
 */
export async function downloadAndRestoreFromCloud(
  force = false
): Promise<{ success: boolean; message: string; skipped?: boolean }> {
  const config = getConfig();

  if (!config.enabled) {
    return { success: false, message: 'Cloud backup not configured' };
  }

  const dbPath = CONFIG.database?.path ?? 'data/bot.db';
  const dbExists = existsSync(dbPath);

  // Check versions trước khi acquire lock
  if (dbExists && !force) {
    const localVersion = await getLocalVersion();
    const cloudMeta = await getCloudMetadata();

    if (cloudMeta && localVersion >= cloudMeta.version) {
      debugLog('CLOUD_BACKUP', `Skip restore: local v${localVersion} >= cloud v${cloudMeta.version}`);
      return {
        success: true,
        skipped: true,
        message: `Skipped: local version (v${localVersion}) is up to date`,
      };
    }
  }

  // Acquire lock
  const hasLock = await acquireLock(10000); // 10s timeout
  if (!hasLock) {
    return { success: false, message: 'Another backup/restore operation in progress' };
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

    // Parse metadata
    let metadata: BackupMetadata | null = null;
    if (gist.files['metadata.json']) {
      try {
        metadata = JSON.parse(gist.files['metadata.json'].content);
      } catch {}
    }

    // Double-check version sau khi có lock
    if (dbExists && !force && metadata) {
      const localVersion = await getLocalVersion();
      if (localVersion >= metadata.version) {
        return {
          success: true,
          skipped: true,
          message: `Skipped: local version (v${localVersion}) is up to date`,
        };
      }
    }

    // Gist API truncates large files, need to fetch raw content
    const backupFile = gist.files[BACKUP_FILENAME];
    let base64Content: string;

    if (backupFile.content && backupFile.content.length < 1000000) {
      base64Content = backupFile.content;
    } else {
      const rawResponse = await fetch(
        `https://gist.githubusercontent.com/raw/${config.gistId}/${BACKUP_FILENAME}`
      );
      base64Content = await rawResponse.text();
    }

    // Decode base64
    const dbContent = Buffer.from(base64Content, 'base64');
    
    // Debug: Log restore info
    debugLog('CLOUD_BACKUP', `Restore: base64 length=${base64Content.length}, decoded size=${dbContent.length} bytes`);
    
    // Validate SQLite header (first 16 bytes should be "SQLite format 3\0")
    const sqliteHeader = dbContent.slice(0, 16).toString('utf-8');
    if (!sqliteHeader.startsWith('SQLite format 3')) {
      debugLog('CLOUD_BACKUP', `Invalid SQLite header: ${sqliteHeader.slice(0, 20)}`);
      return { success: false, message: 'Backup file is not a valid SQLite database' };
    }

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
    
    // Verify file was written correctly
    const writtenSize = statSync(dbPath).size;
    debugLog('CLOUD_BACKUP', `File written: expected=${dbContent.length}, actual=${writtenSize}`);
    if (writtenSize !== dbContent.length) {
      return { success: false, message: `File write mismatch: expected ${dbContent.length}, got ${writtenSize}` };
    }

    // Remove WAL/SHM files if exist
    const walPath = `${dbPath}-wal`;
    const shmPath = `${dbPath}-shm`;
    try {
      if (existsSync(walPath)) unlinkSync(walPath);
      if (existsSync(shmPath)) unlinkSync(shmPath);
    } catch {}

    // Update local version
    if (metadata?.version) {
      await setLocalVersion(metadata.version);
    }

    // Reinitialize database
    initDatabase();

    const version = metadata?.version || '?';
    debugLog('CLOUD_BACKUP', `Backup v${version} restored (${dbContent.length} bytes)`);
    return {
      success: true,
      message: `Restored v${version}: ${metadata?.timestamp || gist.updated_at} (${(dbContent.length / 1024).toFixed(2)} KB)`,
    };
  } catch (error) {
    debugLog('CLOUD_BACKUP', `Restore error: ${error}`);
    return { success: false, message: `Restore failed: ${error}` };
  } finally {
    releaseLock();
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
  version?: number;
  localVersion?: number;
}> {
  const config = getConfig();

  if (!config.enabled) {
    return { enabled: false };
  }

  try {
    const [cloudMeta, localVersion] = await Promise.all([getCloudMetadata(), getLocalVersion()]);

    return {
      enabled: true,
      lastBackup: cloudMeta?.timestamp,
      size: cloudMeta?.size,
      version: cloudMeta?.version,
      localVersion,
    };
  } catch {
    return { enabled: true };
  }
}
