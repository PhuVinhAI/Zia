/**
 * API Server - Hono HTTP server cho bot management
 */
import { Hono } from 'hono';
import { settingsApi, onSettingsChange } from './settings.api.js';

export const apiApp = new Hono();

// Mount settings API
apiApp.route('/settings', settingsApi);

// Health check
apiApp.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Export để sử dụng
export { onSettingsChange };
export { settingsApi };
