# Integration Tests

Hệ thống integration test cho Zia Bot - test thật với API thật.

## Cài đặt

```bash
# Đảm bảo đã cài dependencies
bun install
```

## Chạy Tests

```bash
# Chạy tất cả integration tests
bun test:integration

# Chạy với watch mode
bun test:integration:watch

# Chạy tests cụ thể
bun test:integration -- --grep "Giphy"
bun test:integration -- --grep "YouTube"
bun test:integration -- --grep "Gemini"

# Chạy với verbose output
TEST_VERBOSE=true bun test:integration
```

## Cấu trúc Tests

```
tests/integration/
├── setup.ts                    # Setup và utilities
├── index.ts                    # Entry point
├── README.md                   # Documentation
│
├── ai/                         # AI services
│   ├── gemini.test.ts         # Google Gemini
│   └── groq.test.ts           # Groq AI
│
├── academic/                   # Academic tools
│   └── tvuTools.test.ts       # TVU student system
│
├── background-agent/           # Background agent
│   └── taskRepository.test.ts # Task management
│
├── core/                       # Core functionality
│   └── toolRegistry.test.ts   # Tool parsing & registry
│
├── database/                   # Database
│   └── database.test.ts       # SQLite + Drizzle
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
│   ├── messageProcessor.test.ts # Message chunking
│   ├── quoteParser.test.ts    # Quote parsing
│   └── rateLimitGuard.test.ts # Rate limiting
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
    ├── httpClient.test.ts     # HTTP client
    └── markdown.test.ts       # Markdown parser
```


## API Keys Required

Một số tests yêu cầu API keys. Tests sẽ tự động skip nếu key không có.

| Test Suite | Required Key | Get Key At |
|------------|--------------|------------|
| Giphy | `GIPHY_API_KEY` | https://developers.giphy.com |
| YouTube | `YOUTUBE_API_KEY` | https://console.cloud.google.com |
| Google Search | `GOOGLE_SEARCH_API_KEY`, `GOOGLE_SEARCH_CX` | https://console.cloud.google.com |
| Freepik | `FREEPIK_API_KEY` | https://www.freepik.com/developers |
| E2B | `E2B_API_KEY` | https://e2b.dev |
| ElevenLabs | `ELEVENLABS_API_KEY` | https://elevenlabs.io |
| ComPDF | `COMPDF_API_KEY` | https://www.compdf.com |
| Gemini | `GEMINI_API_KEY` | https://aistudio.google.com |
| Groq | `GROQ_API_KEY` | https://console.groq.com |
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

1. **Rate Limiting**: Một số API có rate limit. Tests đã được thiết kế để handle điều này.

2. **Timeout**: Default timeout là 60s. Có thể tăng cho các tests chậm:
   ```typescript
   test('slow test', async () => { ... }, 120000);
   ```

3. **Cleanup**: Tests tự động cleanup data sau khi chạy.

4. **Tool Context**: Luôn truyền `mockToolContext` làm argument thứ 2 khi gọi `tool.execute()`.
