/**
 * API Server - Hono HTTP server cho bot management
 * Tất cả API endpoints cho Dashboard
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { bearerAuth } from 'hono/bearer-auth';
import { settingsApi, onSettingsChange } from './settings.api.js';
import { statsApi } from './stats.api.js';
import { usersApi } from './users.api.js';
import { tasksApi } from './tasks.api.js';
import { memoriesApi } from './memories.api.js';
import { historyApi } from './history.api.js';
import { logsApi } from './logs.api.js';

// API Key từ env
const API_KEY = process.env.SETTINGS_API_KEY;

export const apiApp = new Hono();

// CORS cho tất cả routes
apiApp.use('*', cors());

// Bearer auth middleware - chỉ bật khi có API_KEY
if (API_KEY) {
  apiApp.use('*', bearerAuth({ token: API_KEY }));
  console.log('[API] 🔐 Authentication enabled for all endpoints');
} else {
  console.warn('[API] ⚠️ No SETTINGS_API_KEY set - API is PUBLIC (dev mode only!)');
}

// Health check (không cần auth)
apiApp.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount all API routes
apiApp.route('/settings', settingsApi);
apiApp.route('/stats', statsApi);
apiApp.route('/users', usersApi);
apiApp.route('/tasks', tasksApi);
apiApp.route('/memories', memoriesApi);
apiApp.route('/history', historyApi);
apiApp.route('/logs', logsApi);

// API documentation endpoint
apiApp.get('/', (c) => {
  return c.json({
    name: 'Zia Bot API',
    version: '1.0.0',
    endpoints: {
      '/health': 'Health check',
      '/settings': 'Bot settings management',
      '/stats': 'System statistics',
      '/users': 'User management',
      '/tasks': 'Background tasks',
      '/memories': 'Long-term memory',
      '/history': 'Conversation history',
      '/logs': 'System logs',
    },
  });
});

// Export
export { onSettingsChange };
export { settingsApi };
