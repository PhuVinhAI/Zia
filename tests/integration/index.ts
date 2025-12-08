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
 *   
 * Config:
 *   Tests đọc API keys từ .env.test (không phải .env)
 */

// Re-export setup utilities
export * from './setup.js';

// Test suites info
export const TEST_SUITES = {
  core: {
    baseModule: 'BaseModule & BaseTool classes',
    serviceContainer: 'Service Container (DI)',
    eventBus: 'Event Bus (Pub/Sub)',
    logger: 'Pino Logger',
    moduleManager: 'Module Manager',
    toolRegistry: 'Tool Registry',
    context: 'Bot Context',
  },
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
    docxToPdf: 'Local DOC/DOCX to PDF (mammoth + word-extractor + pdfkit, no API key)',
    createChart: 'Chart.js Chart Creation',
    createApp: 'HTML App Creation',
    clearHistory: 'Clear Chat History',
    memory: 'Long-term Memory',
    scheduleTask: 'Task Scheduling',
    solveMath: 'Math Solver',
  },
  ai: {
    groq: 'Groq AI (requires GROQ_API_KEY)',
  },
  database: {
    database: 'SQLite + Drizzle ORM',
    databaseService: 'Database Service',
    repositories: 'Database Repositories',
  },
  infrastructure: {
    keyManager: 'Gemini Key Manager',
    geminiConfig: 'Gemini Config',
    geminiProvider: 'Gemini Provider (generateContent, parseAIResponse)',
    geminiStream: 'Gemini Streaming',
    character: 'Character Config',
    prompts: 'System Prompts',
    memoryStore: 'Memory Store (Vector Search)',
    zalo: 'Zalo Service (zca-js)',
    zaloTypes: 'Zalo Types (TextStyle)',
  },
  gateway: {
    classifier: 'Message Classifier',
    messageProcessor: 'Message Processor',
    quoteParser: 'Quote Parser',
    rateLimitGuard: 'Rate Limit Guard',
    promptBuilder: 'Prompt Builder',
    toolHandler: 'Tool Handler',
    userFilter: 'User Filter',
    messageBuffer: 'Message Buffer (RxJS)',
    mediaProcessor: 'Media Processor (Gemini)',
    responseHandler: 'Response Handler (Stream Callbacks)',
  },
  backgroundAgent: {
    taskRepository: 'Task Repository',
    contextBuilder: 'Context Builder',
    actionExecutor: 'Action Executor',
    agentRunner: 'Agent Runner',
  },
  files: {
    createFile: 'File Creation (DOCX, XLSX, PPTX)',
  },
  utils: {
    markdown: 'Markdown Parser & Converter',
    httpClient: 'HTTP Client (ky)',
    datetime: 'DateTime Utils (Day.js)',
    messageChunker: 'Message Chunker',
    taskManager: 'Task Manager',
    tokenCounter: 'Token Counter',
    userStore: 'User Store',
    messageStore: 'Message Store',
    historyConverter: 'History Converter',
    historyLoader: 'History Loader',
    historyStore: 'History Store',
  },
  academic: {
    tvuTools: 'TVU Student System',
  },
};

console.log(`
╔══════════════════════════════════════════════════════════════╗
║                  ZIA BOT INTEGRATION TESTS                   ║
╠══════════════════════════════════════════════════════════════╣
║  Run: bun test:integration                                   ║
║  Watch: bun test:integration:watch                           ║
║  Filter: bun test:integration -- --grep "pattern"            ║
║                                                              ║
║  Config: Tests đọc API keys từ .env.test                     ║
╚══════════════════════════════════════════════════════════════╝
`);
