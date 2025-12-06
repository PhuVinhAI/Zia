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
├── core/                       # Core functionality
│   └── toolRegistry.test.ts   # Tool parsing & registry
│
├── database/                   # Database
│   ├── database.test.ts       # SQLite + Drizzle
│   └── memory.test.ts         # Vector memory store
│
├── entertainment/              # Entertainment APIs
│   ├── jikan.test.ts          # MyAnimeList API
│   ├── nekos.test.ts          # Nekos anime images
│   └── giphy.test.ts          # Giphy GIF search
│
├── files/                      # File creation
│   └── createFile.test.ts     # DOCX, XLSX, PPTX
│
├── gateway/                    # Message processing
│   └── messageProcessor.test.ts # Message chunking
│
├── system/                     # System tools
│   ├── youtube.test.ts        # YouTube Data API
│   ├── googleSearch.test.ts   # Google Custom Search
│   ├── freepik.test.ts        # Freepik AI images
│   ├── executeCode.test.ts    # E2B code execution
│   ├── elevenlabs.test.ts     # ElevenLabs TTS
│   ├── compdf.test.ts         # DOCX to PDF conversion
│   └── createChart.test.ts    # Chart.js charts
│
└── utils/                      # Utilities
    ├── markdown.test.ts       # Markdown parser
    └── httpClient.test.ts     # HTTP client
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

## Tests Không Cần API Key

Các tests sau chạy được mà không cần API key:

- **Jikan API** - MyAnimeList (public API)
- **Nekos API** - Anime images (public API)
- **Database** - SQLite local
- **Memory Store** - Vector search local
- **File Creation** - DOCX, XLSX, PPTX
- **Chart Creation** - Chart.js
- **Markdown Utils** - Parser & converter
- **HTTP Client** - Using public APIs

## Viết Test Mới

```typescript
import { describe, test, expect, beforeAll } from 'bun:test';
import { hasApiKey, TEST_CONFIG } from '../setup.js';

const SKIP = !hasApiKey('yourApiKey');

describe.skipIf(SKIP)('Your Test Suite', () => {
  beforeAll(() => {
    if (SKIP) console.log('⏭️  Skipping: API key not configured');
  });

  test('your test case', async () => {
    // Test implementation
    expect(result).toBeDefined();
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

4. **Parallel**: Bun test runner chạy tests parallel. Nếu cần sequential:
   ```bash
   bun test:integration -- --no-parallel
   ```
