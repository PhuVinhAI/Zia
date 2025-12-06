/**
 * Integration Test Runner
 * Chạy tất cả integration tests
 *
 * Usage:
 *   bun test:integration           - Chạy tất cả tests
 *   bun test:integration:watch     - Chạy với watch mode
 *   bun test:integration -- --grep "Giphy"  - Chạy tests matching pattern
 *
 * Environment:
 *   TEST_VERBOSE=true  - Hiển thị chi tiết response data
 */

// Re-export setup utilities
export * from './setup.js';

// Test suites info
export const TEST_SUITES = {
  entertainment: {
    jikan: 'Jikan API (MyAnimeList) - Anime/Manga search',
    nekos: 'Nekos API - Anime images',
    giphy: 'Giphy API - GIF search (requires GIPHY_API_KEY)',
  },
  system: {
    youtube: 'YouTube Data API (requires YOUTUBE_API_KEY)',
    googleSearch: 'Google Custom Search (requires GOOGLE_SEARCH_API_KEY)',
    freepik: 'Freepik AI Image Generation (requires FREEPIK_API_KEY)',
    executeCode: 'E2B Code Execution (requires E2B_API_KEY)',
    elevenlabs: 'ElevenLabs TTS (requires ELEVENLABS_API_KEY)',
    compdf: 'ComPDF DOCX to PDF (requires COMPDF_API_KEY)',
    createChart: 'Chart.js Chart Creation',
  },
  ai: {
    gemini: 'Google Gemini AI (requires GEMINI_API_KEY)',
    groq: 'Groq AI (requires GROQ_API_KEY)',
  },
  database: {
    database: 'SQLite + Drizzle ORM',
    memory: 'Memory Store (Vector Search)',
  },
  files: {
    createFile: 'File Creation (DOCX, XLSX, PPTX)',
  },
  utils: {
    markdown: 'Markdown Parser & Converter',
    httpClient: 'HTTP Client (ky)',
  },
};

console.log(`
╔══════════════════════════════════════════════════════════════╗
║                  ZIA BOT INTEGRATION TESTS                   ║
╠══════════════════════════════════════════════════════════════╣
║  Run: bun test:integration                                   ║
║  Watch: bun test:integration:watch                           ║
║  Filter: bun test:integration -- --grep "pattern"            ║
╚══════════════════════════════════════════════════════════════╝
`);
