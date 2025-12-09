/**
 * Settings API - Hono REST API để quản lý settings
 * Thay thế file watcher bằng API endpoint
 *
 * Authentication: Handled by main API router (index.ts)
 * Usage: curl -H "Authorization: Bearer YOUR_API_KEY" http://host/api/settings
 */
import { Hono } from 'hono';
import { SettingsSchema, type Settings } from '../../core/config/config.schema.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../../');
const settingsPath = path.join(projectRoot, 'settings.json');

// Event emitter để notify khi settings thay đổi
type SettingsChangeListener = (settings: Settings) => void;
const listeners: SettingsChangeListener[] = [];

export function onSettingsChange(listener: SettingsChangeListener) {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx > -1) listeners.splice(idx, 1);
  };
}

function notifyListeners(settings: Settings) {
  for (const listener of listeners) {
    try {
      listener(settings);
    } catch (e) {
      console.error('[SettingsAPI] Listener error:', e);
    }
  }
}

// Load settings từ file
function loadSettingsFromFile(): Settings {
  const data = fs.readFileSync(settingsPath, 'utf-8');
  const raw = JSON.parse(data);
  const result = SettingsSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid settings: ${result.error.message}`);
  }
  return result.data;
}

// Save settings to file
function saveSettingsToFile(settings: Settings) {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
}

// Hono app - Auth được handle ở index.ts
export const settingsApi = new Hono();

// GET /settings - Lấy toàn bộ settings
settingsApi.get('/', (c) => {
  try {
    const settings = loadSettingsFromFile();
    return c.json({ success: true, data: settings });
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500);
  }
});

// GET /settings/schema/all - Lấy schema keys (đặt trước /:key để không bị override)
settingsApi.get('/schema/all', (c) => {
  const shape = SettingsSchema.shape;
  const keys = Object.keys(shape);
  return c.json({ success: true, data: keys });
});

// GET /settings/:key - Lấy một section (bot, gemini, etc.)
settingsApi.get('/:key', (c) => {
  try {
    const key = c.req.param('key');
    const settings = loadSettingsFromFile();
    const value = (settings as Record<string, unknown>)[key];
    if (value === undefined) {
      return c.json({ success: false, error: `Key "${key}" not found` }, 404);
    }
    return c.json({ success: true, data: value });
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500);
  }
});

// PUT /settings - Update toàn bộ settings + reload
settingsApi.put('/', async (c) => {
  try {
    const body = await c.req.json();
    const result = SettingsSchema.safeParse(body);
    if (!result.success) {
      return c.json(
        { success: false, error: 'Validation failed', details: result.error.issues },
        400,
      );
    }
    saveSettingsToFile(result.data);
    notifyListeners(result.data);
    return c.json({ success: true, message: 'Settings updated and reloaded' });
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500);
  }
});

// PATCH /settings/:key - Update một section + reload
settingsApi.patch('/:key', async (c) => {
  try {
    const key = c.req.param('key');
    const body = await c.req.json();
    const settings = loadSettingsFromFile();

    if (!Object.hasOwn(settings, key)) {
      return c.json({ success: false, error: `Key "${key}" not found` }, 404);
    }

    // Merge với section hiện tại
    const current = (settings as Record<string, unknown>)[key];
    const merged =
      typeof current === 'object' && current !== null ? { ...current, ...body } : body;

    (settings as Record<string, unknown>)[key] = merged;

    // Validate lại toàn bộ
    const result = SettingsSchema.safeParse(settings);
    if (!result.success) {
      return c.json(
        { success: false, error: 'Validation failed', details: result.error.issues },
        400,
      );
    }

    saveSettingsToFile(result.data);
    notifyListeners(result.data);
    return c.json({ success: true, message: `Settings.${key} updated and reloaded`, data: merged });
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500);
  }
});

// POST /settings/reload - Force reload từ file
settingsApi.post('/reload', (c) => {
  try {
    const settings = loadSettingsFromFile();
    notifyListeners(settings);
    return c.json({ success: true, message: 'Settings reloaded' });
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500);
  }
});
