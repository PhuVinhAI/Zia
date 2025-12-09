/**
 * Logs API - Xem logs hệ thống
 */
import { Hono } from 'hono';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../../');
const logsDir = path.join(projectRoot, 'logs');

export const logsApi = new Hono();

// GET /logs - Danh sách log folders
logsApi.get('/', async (c) => {
  try {
    if (!fs.existsSync(logsDir)) {
      return c.json({ success: true, data: [] });
    }

    const entries = fs.readdirSync(logsDir, { withFileTypes: true });
    const folders = entries
      .filter((e) => e.isDirectory())
      .map((e) => ({
        name: e.name,
        path: e.name,
      }))
      .sort((a, b) => b.name.localeCompare(a.name)); // Newest first

    return c.json({ success: true, data: folders });
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500);
  }
});

// GET /logs/:folder - Danh sách files trong folder
logsApi.get('/:folder', async (c) => {
  try {
    const folder = c.req.param('folder');
    const folderPath = path.join(logsDir, folder);

    if (!fs.existsSync(folderPath)) {
      return c.json({ success: false, error: 'Folder not found' }, 404);
    }

    const entries = fs.readdirSync(folderPath, { withFileTypes: true });
    const files = entries
      .filter((e) => e.isFile())
      .map((e) => {
        const filePath = path.join(folderPath, e.name);
        const stats = fs.statSync(filePath);
        return {
          name: e.name,
          size: stats.size,
          modified: stats.mtime.toISOString(),
        };
      });

    return c.json({ success: true, data: files });
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500);
  }
});

// GET /logs/:folder/:file - Đọc nội dung file log
logsApi.get('/:folder/:file', async (c) => {
  try {
    const folder = c.req.param('folder');
    const file = c.req.param('file');
    const filePath = path.join(logsDir, folder, file);
    const lines = Number(c.req.query('lines')) || 100;
    const offset = Number(c.req.query('offset')) || 0;

    if (!fs.existsSync(filePath)) {
      return c.json({ success: false, error: 'File not found' }, 404);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const allLines = content.split('\n').filter((l) => l.trim());
    const totalLines = allLines.length;

    // Get last N lines with offset
    const start = Math.max(0, totalLines - lines - offset);
    const end = totalLines - offset;
    const selectedLines = allLines.slice(start, end);

    return c.json({
      success: true,
      data: {
        lines: selectedLines,
        totalLines,
        hasMore: start > 0,
      },
    });
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500);
  }
});

// GET /logs/unauthorized - Đọc unauthorized.json
logsApi.get('/file/unauthorized', async (c) => {
  try {
    const filePath = path.join(logsDir, 'unauthorized.json');

    if (!fs.existsSync(filePath)) {
      return c.json({ success: true, data: [] });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content || '[]');

    return c.json({ success: true, data });
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500);
  }
});

// DELETE /logs/:folder - Xóa folder log
logsApi.delete('/:folder', async (c) => {
  try {
    const folder = c.req.param('folder');
    const folderPath = path.join(logsDir, folder);

    if (!fs.existsSync(folderPath)) {
      return c.json({ success: false, error: 'Folder not found' }, 404);
    }

    fs.rmSync(folderPath, { recursive: true });

    return c.json({ success: true, message: `Folder ${folder} deleted` });
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500);
  }
});
