# Integration Tests

Hệ thống integration test cho Zia Bot - test thật với API thật.

## Cài đặt

```bash
# Đảm bảo đã cài dependencies
bun install

# Tạo file .env.test với API keys (copy từ .env.example)
cp .env.example .env.test
# Sau đó điền các API keys vào .env.test
```

## Chạy Tests

```bash
# Chạy tất cả integration tests
bun test:integration

# Chạy với watch mode
bun test:integration:watch

# Chạy tests theo category
bun test:core          # Core modules
bun test:gateway       # Gateway components
bun test:ai            # AI services
bun test:system        # System tools
bun test:utils         # Utilities
bun test:database      # Database
bun test:entertainment # Entertainment APIs
bun test:agent         # Background agent

# Chạy tests cụ thể
bun test:integration -- --grep "Giphy"
bun test:integration -- --grep "Gemini"

# Chạy với verbose output
TEST_VERBOSE=true bun test:integration
```

## Cấu trúc Tests

```
tests/integration/
├── setup.ts                    # Setup và utilities (đọc .env.test)
├── index.ts                    # Entry point
├── README.md                   # Documentation
│
├── ai/                         # AI services
│   └── groq.test.ts           # Groq AI
│
├── academic/                   # Academic tools
│   └── tvuTools.test.ts       # TVU student system
│
├── background-agent/           # Background agent
│   ├── actionExecutor.test.ts # Action execution
│   ├── agentRunner.test.ts    # Agent runner
│   ├── contextBuilder.test.ts # Context building
│   └── taskRepository.test.ts # Task management
│
├── core/                       # Core functionality
│   ├── baseModule.test.ts     # BaseModule & BaseTool
│   ├── context.test.ts        # Bot Context
│   ├── eventBus.test.ts       # Event Bus (Pub/Sub)
│   ├── logger.test.ts         # Pino Logger
│   ├── moduleManager.test.ts  # Module Manager
│   ├── serviceContainer.test.ts # Service Container (DI)
│   └── toolRegistry.test.ts   # Tool Registry
│
├── database/                   # Database
│   ├── database.test.ts       # SQLite + Drizzle
│   ├── databaseService.test.ts # Database Service
│   └── repositories.test.ts   # Repositories
│
├── entertainment/              # Entertainment APIs
│   ├── giphy.test.ts          # Giphy GIF search
│   ├── jikanTools.test.ts     # MyAnimeList tools
│   └── nekos.test.ts          # Nekos anime images
│
├── files/                      # File creation
│   └── createFile.test.ts     # DOCX, XLSX, PPTX
│
├── gateway/                    # Message processing
│   ├── classifier.test.ts     # Message classification
│   ├── mediaProcessor.test.ts # Media processing
│   ├── messageBuffer.test.ts  # Message buffering (RxJS)
│   ├── messageProcessor.test.ts # Message processing
│   ├── promptBuilder.test.ts  # Prompt building
│   ├── quoteParser.test.ts    # Quote parsing
│   ├── rateLimitGuard.test.ts # Rate limiting
│   ├── responseHandler.test.ts # Response handling
│   ├── toolHandler.test.ts    # Tool handling
│   └── userFilter.test.ts     # User filtering
│
├── infrastructure/             # Infrastructure
│   ├── character.test.ts      # Character config
│   ├── geminiConfig.test.ts   # Gemini config
│   ├── geminiProvider.test.ts # Gemini provider (generateContent)
│   ├── geminiStream.test.ts   # Gemini streaming
│   ├── keyManager.test.ts     # Key manager
│   ├── memoryStore.test.ts    # Memory store
│   ├── prompts.test.ts        # System prompts
│   ├── zalo.test.ts           # Zalo service
│   └── zaloTypes.test.ts      # Zalo types
│
├── system/                     # System tools
│   ├── clearHistory.test.ts   # Clear chat history
│   ├── compdf.test.ts         # DOCX to PDF
│   ├── createApp.test.ts      # HTML app creation
│   ├── createChart.test.ts    # Chart.js charts
│   ├── elevenlabs.test.ts     # ElevenLabs TTS
│   ├── executeCode.test.ts    # E2B code execution
│   ├── freepik.test.ts        # Freepik AI images
│   ├── googleSearch.test.ts   # Google Custom Search
│   ├── memory.test.ts         # Long-term memory
│   ├── scheduleTask.test.ts   # Task scheduling
│   ├── solveMath.test.ts      # Math solver
│   └── youtube.test.ts        # YouTube Data API
│
└── utils/                      # Utilities
    ├── datetime.test.ts       # DateTime utils
    ├── historyConverter.test.ts # History converter
    ├── historyLoader.test.ts  # History loader
    ├── historyStore.test.ts   # History store
    ├── httpClient.test.ts     # HTTP client
    ├── markdown.test.ts       # Markdown parser
    ├── messageChunker.test.ts # Message chunker
    ├── messageStore.test.ts   # Message store
    ├── taskManager.test.ts    # Task manager
    ├── tokenCounter.test.ts   # Token counter
    └── userStore.test.ts      # User store
```

## API Keys Required

Tests đọc API keys từ file `.env.test` (không phải `.env`).
Tests sẽ tự động skip nếu key không có.

| Test Suite | Required Key | Get Key At |
|------------|--------------|------------|
| Giphy | `GIPHY_API_KEY` | https://developers.giphy.com |
| YouTube | `YOUTUBE_API_KEY` | https://console.cloud.google.com |
| Google Search | `GOOGLE_SEARCH_API_KEY`, `GOOGLE_SEARCH_CX` | https://console.cloud.google.com |
| Freepik | `FREEPIK_API_KEY` | https://www.freepik.com/developers |
| E2B | `E2B_API_KEY` | https://e2b.dev |
| ElevenLabs | `ELEVENLABS_API_KEY` | https://elevenlabs.io |
| ComPDF | `COMPDF_API_KEY` | https://www.compdf.com |
| Gemini | `GEMINI_API_KEY_1` ... `GEMINI_API_KEY_N` | https://aistudio.google.com |
| Groq | `GROQ_API_KEY` | https://console.groq.com |
| Zalo | `ZALO_CREDENTIALS_BASE64` | Zalo login |
| TVU | `TVU_USERNAME`, `TVU_PASSWORD` | TVU student portal |

## Tests Không Cần API Key

Các tests sau chạy được mà không cần API key:

- **Jikan API** - MyAnimeList (public API)
- **Nekos API** - Anime images (public API)
- **Database** - SQLite local
- **File Creation** - DOCX, XLSX, PPTX
- **Chart Creation** - Chart.js
- **Markdown Utils** - Parser & converter
- **HTTP Client** - Using public APIs
- **Gateway** - Message processing, classification
- **Core** - BaseModule, EventBus, ServiceContainer
- **Utils** - DateTime, MessageChunker, TaskManager

## Viết Test Mới

```typescript
import { describe, test, expect, beforeAll } from 'bun:test';
import { hasApiKey, TEST_CONFIG, mockToolContext } from '../setup.js';

const SKIP = !hasApiKey('yourApiKey');

describe.skipIf(SKIP)('Your Test Suite', () => {
  beforeAll(() => {
    if (SKIP) console.log('⏭️  Skipping: API key not configured');
  });

  test('your test case', async () => {
    // Tool execute cần 2 arguments: (params, context)
    const result = await yourTool.execute({ param: 'value' }, mockToolContext);
    expect(result.success).toBe(true);
  }, TEST_CONFIG.timeout);
});
```

## Tips

1. **Environment**: Tests đọc từ `.env.test`, không phải `.env`. Điều này cho phép tách biệt config test và production.

2. **Rate Limiting**: Một số API có rate limit. Tests đã được thiết kế để handle điều này với key rotation.

3. **Timeout**: Default timeout là 60s. Có thể tăng cho các tests chậm:
   ```typescript
   test('slow test', async () => { ... }, 120000);
   ```

4. **Cleanup**: Tests tự động cleanup data sau khi chạy.

5. **Tool Context**: Luôn truyền `mockToolContext` làm argument thứ 2 khi gọi `tool.execute()`.

6. **Gemini Keys**: Hỗ trợ nhiều keys (`GEMINI_API_KEY_1` đến `GEMINI_API_KEY_N`) với auto-rotation khi bị rate limit.
