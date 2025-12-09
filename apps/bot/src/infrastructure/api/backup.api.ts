/**
 * Backup API - Backup và Restore database (local + cloud)
 */
import { Hono } from 'hono';
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CONFIG } from '../../core/config/config.js';
import { debugLog } from '../../core/logger/logger.js';
import { closeDatabase, initDatabase, getSqliteDb } from '../database/connection.js';
import {
  isCloudBackupEnabled,
  getCloudBackupInfo,
  triggerCloudBackup,
  triggerCloudRestore,
} from '../backup/index.js';

export const backupApi = new Hono();

// Paths
const getDbPath = () => CONFIG.database?.path ?? 'data/bot.db';
const BACKUP_DIR = 'data/backups';

// Ensure backup directory exists
if (!existsSync(BACKUP_DIR)) {
  mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * GET /backup - Danh sách các bản backup
 */
backupApi.get('/', (c) => {
  try {
    if (!existsSync(BACKUP_DIR)) {
      return c.json({ success: true, data: [] });
    }

    const files = readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith('.db') || f.endsWith('.db.gz'))
      .map((name) => {
        const filePath = join(BACKUP_DIR, name);
        const stats = statSync(filePath);
        return {
          name,
          size: stats.size,
          createdAt: stats.birthtime.toISOString(),
          modifiedAt: stats.mtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return c.json({ success: true, data: files });
  } catch (error) {
    debugLog('BACKUP_API', `List error: ${error}`);
    return c.json({ success: false, error: 'Failed to list backups' }, 500);
  }
});

/**
 * POST /backup - Tạo backup mới
 */
backupApi.post('/', async (c) => {
  try {
    const dbPath = getDbPath();
    if (!existsSync(dbPath)) {
      return c.json({ success: false, error: 'Database not found' }, 404);
    }

    // Checkpoint WAL để đảm bảo dữ liệu được ghi vào file chính
    try {
      const sqlite = getSqliteDb();
      sqlite.exec('PRAGMA wal_checkpoint(TRUNCATE);');
      debugLog('BACKUP_API', 'WAL checkpoint completed');
    } catch (e) {
      debugLog('BACKUP_API', `WAL checkpoint warning: ${e}`);
    }

    // Tạo tên file backup với timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup-${timestamp}.db`;
    const backupPath = join(BACKUP_DIR, backupName);

    // Copy file database
    const dbContent = await readFile(dbPath);
    await writeFile(backupPath, dbContent);

    const stats = statSync(backupPath);
    debugLog('BACKUP_API', `Backup created: ${backupName} (${stats.size} bytes)`);

    return c.json({
      success: true,
      data: {
        name: backupName,
        size: stats.size,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    debugLog('BACKUP_API', `Backup error: ${error}`);
    return c.json({ success: false, error: 'Failed to create backup' }, 500);
  }
});

/**
 * POST /backup/restore/:name - Restore từ backup
 */
backupApi.post('/restore/:name', async (c) => {
  try {
    const { name } = c.req.param();
    const backupPath = join(BACKUP_DIR, name);

    if (!existsSync(backupPath)) {
      return c.json({ success: false, error: 'Backup not found' }, 404);
    }

    const dbPath = getDbPath();

    // Đóng database connection hiện tại
    closeDatabase();
    debugLog('BACKUP_API', 'Database closed for restore');

    // Tạo backup của database hiện tại trước khi restore
    const preRestoreBackup = `pre-restore-${Date.now()}.db`;
    if (existsSync(dbPath)) {
      const currentDb = await readFile(dbPath);
      await writeFile(join(BACKUP_DIR, preRestoreBackup), currentDb);
      debugLog('BACKUP_API', `Pre-restore backup created: ${preRestoreBackup}`);
    }

    // Copy backup file vào vị trí database
    const backupContent = await readFile(backupPath);
    await writeFile(dbPath, backupContent);

    // Xóa WAL và SHM files nếu có
    const walPath = `${dbPath}-wal`;
    const shmPath = `${dbPath}-shm`;
    if (existsSync(walPath)) unlinkSync(walPath);
    if (existsSync(shmPath)) unlinkSync(shmPath);

    // Khởi tạo lại database
    initDatabase();
    debugLog('BACKUP_API', `Database restored from: ${name}`);

    return c.json({
      success: true,
      data: {
        restoredFrom: name,
        preRestoreBackup,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    debugLog('BACKUP_API', `Restore error: ${error}`);
    // Cố gắng khởi tạo lại database
    try {
      initDatabase();
    } catch (e) {
      debugLog('BACKUP_API', `Failed to reinit database: ${e}`);
    }
    return c.json({ success: false, error: 'Failed to restore backup' }, 500);
  }
});

/**
 * GET /backup/download/:name - Download backup file
 */
backupApi.get('/download/:name', async (c) => {
  try {
    const { name } = c.req.param();
    const backupPath = join(BACKUP_DIR, name);

    if (!existsSync(backupPath)) {
      return c.json({ success: false, error: 'Backup not found' }, 404);
    }

    const content = await readFile(backupPath);
    
    return new Response(content, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${name}"`,
        'Content-Length': content.length.toString(),
      },
    });
  } catch (error) {
    debugLog('BACKUP_API', `Download error: ${error}`);
    return c.json({ success: false, error: 'Failed to download backup' }, 500);
  }
});

/**
 * POST /backup/upload - Upload và restore từ file
 */
backupApi.post('/upload', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return c.json({ success: false, error: 'No file uploaded' }, 400);
    }

    // Validate file
    if (!file.name.endsWith('.db')) {
      return c.json({ success: false, error: 'Invalid file type. Only .db files allowed' }, 400);
    }

    // Save uploaded file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const uploadName = `upload-${timestamp}.db`;
    const uploadPath = join(BACKUP_DIR, uploadName);

    const arrayBuffer = await file.arrayBuffer();
    await writeFile(uploadPath, Buffer.from(arrayBuffer));

    const stats = statSync(uploadPath);
    debugLog('BACKUP_API', `Backup uploaded: ${uploadName} (${stats.size} bytes)`);

    return c.json({
      success: true,
      data: {
        name: uploadName,
        originalName: file.name,
        size: stats.size,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    debugLog('BACKUP_API', `Upload error: ${error}`);
    return c.json({ success: false, error: 'Failed to upload backup' }, 500);
  }
});

/**
 * DELETE /backup/:name - Xóa backup
 */
backupApi.delete('/:name', (c) => {
  try {
    const { name } = c.req.param();
    const backupPath = join(BACKUP_DIR, name);

    if (!existsSync(backupPath)) {
      return c.json({ success: false, error: 'Backup not found' }, 404);
    }

    unlinkSync(backupPath);
    debugLog('BACKUP_API', `Backup deleted: ${name}`);

    return c.json({ success: true, data: { deleted: name } });
  } catch (error) {
    debugLog('BACKUP_API', `Delete error: ${error}`);
    return c.json({ success: false, error: 'Failed to delete backup' }, 500);
  }
});

/**
 * GET /backup/info - Thông tin database hiện tại
 */
backupApi.get('/info', (c) => {
  try {
    const dbPath = getDbPath();
    
    if (!existsSync(dbPath)) {
      return c.json({ success: false, error: 'Database not found' }, 404);
    }

    const stats = statSync(dbPath);
    
    // Get table counts
    let tableInfo: Record<string, number> = {};
    try {
      const sqlite = getSqliteDb();
      const tables = ['history', 'sent_messages', 'memories', 'agent_tasks'];
      for (const table of tables) {
        try {
          const result = sqlite.query(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number };
          tableInfo[table] = result?.count ?? 0;
        } catch {
          tableInfo[table] = 0;
        }
      }
    } catch (e) {
      debugLog('BACKUP_API', `Table info error: ${e}`);
    }

    return c.json({
      success: true,
      data: {
        path: dbPath,
        size: stats.size,
        modifiedAt: stats.mtime.toISOString(),
        tables: tableInfo,
      },
    });
  } catch (error) {
    debugLog('BACKUP_API', `Info error: ${error}`);
    return c.json({ success: false, error: 'Failed to get database info' }, 500);
  }
});


// ============================================
// Cloud Backup Endpoints
// ============================================

/**
 * GET /backup/cloud - Thông tin cloud backup
 */
backupApi.get('/cloud', async (c) => {
  try {
    const enabled = isCloudBackupEnabled();
    
    if (!enabled) {
      return c.json({
        success: true,
        data: {
          enabled: false,
          message: 'Cloud backup not configured. Set GITHUB_GIST_TOKEN and GITHUB_GIST_ID',
        },
      });
    }

    const info = await getCloudBackupInfo();
    return c.json({ success: true, data: info });
  } catch (error) {
    debugLog('BACKUP_API', `Cloud info error: ${error}`);
    return c.json({ success: false, error: 'Failed to get cloud backup info' }, 500);
  }
});

/**
 * POST /backup/cloud - Upload backup lên cloud
 */
backupApi.post('/cloud', async (c) => {
  try {
    const result = await triggerCloudBackup();
    
    if (result.success) {
      return c.json({ success: true, data: { message: result.message } });
    } else {
      return c.json({ success: false, error: result.message }, 400);
    }
  } catch (error) {
    debugLog('BACKUP_API', `Cloud backup error: ${error}`);
    return c.json({ success: false, error: 'Failed to backup to cloud' }, 500);
  }
});

/**
 * POST /backup/cloud/restore - Restore từ cloud backup
 */
backupApi.post('/cloud/restore', async (c) => {
  try {
    const result = await triggerCloudRestore();
    
    if (result.success) {
      return c.json({ success: true, data: { message: result.message } });
    } else {
      return c.json({ success: false, error: result.message }, 400);
    }
  } catch (error) {
    debugLog('BACKUP_API', `Cloud restore error: ${error}`);
    return c.json({ success: false, error: 'Failed to restore from cloud' }, 500);
  }
});

/**
 * DELETE /backup/database - Xóa toàn bộ database (reset)
 * Tạo backup trước khi xóa
 */
backupApi.delete('/database', async (c) => {
  try {
    const dbPath = getDbPath();
    
    if (!existsSync(dbPath)) {
      return c.json({ success: false, error: 'Database not found' }, 404);
    }

    // Tạo backup trước khi xóa
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const preDeleteBackup = `pre-delete-${timestamp}.db`;
    const backupPath = join(BACKUP_DIR, preDeleteBackup);

    // Checkpoint WAL trước khi backup
    try {
      const sqlite = getSqliteDb();
      sqlite.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    } catch (e) {
      debugLog('BACKUP_API', `WAL checkpoint warning: ${e}`);
    }

    // Copy database hiện tại làm backup
    const dbContent = await readFile(dbPath);
    await writeFile(backupPath, dbContent);
    debugLog('BACKUP_API', `Pre-delete backup created: ${preDeleteBackup}`);

    // Đóng database connection
    closeDatabase();
    debugLog('BACKUP_API', 'Database closed for deletion');

    // Xóa database files
    const walPath = `${dbPath}-wal`;
    const shmPath = `${dbPath}-shm`;
    
    if (existsSync(dbPath)) unlinkSync(dbPath);
    if (existsSync(walPath)) unlinkSync(walPath);
    if (existsSync(shmPath)) unlinkSync(shmPath);
    
    debugLog('BACKUP_API', 'Database files deleted');

    // Khởi tạo lại database mới (sẽ tự động tạo tables)
    initDatabase();
    debugLog('BACKUP_API', 'New database initialized');

    return c.json({
      success: true,
      data: {
        message: 'Database reset successfully',
        preDeleteBackup,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    debugLog('BACKUP_API', `Database reset error: ${error}`);
    // Cố gắng khởi tạo lại database
    try {
      initDatabase();
    } catch (e) {
      debugLog('BACKUP_API', `Failed to reinit database: ${e}`);
    }
    return c.json({ success: false, error: 'Failed to reset database' }, 500);
  }
});
