/**
 * Freepik API Client - Seedream v4 Image Generation
 * Docs: https://docs.freepik.com/api-reference/text-to-image/seedream-4/post-seedream-v4
 */

import ky, { type KyInstance } from 'ky';
import { debugLog } from '../../../core/logger/logger.js';

// ═══════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════

const BASE_URL = 'https://api.freepik.com/v1';
const FREEPIK_API_KEY = process.env.FREEPIK_API_KEY || '';

// ═══════════════════════════════════════════════════
// KY INSTANCE
// ═══════════════════════════════════════════════════

import { CONFIG } from '../../../core/config/config.js';

const freepikApi: KyInstance = ky.create({
  prefixUrl: BASE_URL,
  timeout: CONFIG.freepik?.timeoutMs ?? 60000,
  retry: {
    limit: CONFIG.freepik?.retryLimit ?? 2,
    methods: ['get', 'post'],
    statusCodes: [408, 500, 502, 503, 504],
  },
  headers: {
    'Content-Type': 'application/json',
    'x-freepik-api-key': FREEPIK_API_KEY,
  },
  hooks: {
    beforeRequest: [
      (request) => {
        if (!FREEPIK_API_KEY) {
          throw new Error('FREEPIK_API_KEY chưa được cấu hình trong .env');
        }
        debugLog('FREEPIK', `→ ${request.method} ${request.url}`);
      },
    ],
    afterResponse: [
      (_request, _options, response) => {
        debugLog('FREEPIK', `← ${response.status}`);
        return response;
      },
    ],
  },
});

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

export interface FreepikTaskResponse {
  data: {
    task_id: string;
    status: 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    generated?: string[];
  };
}

export interface FreepikTaskStatus {
  data: {
    task_id: string;
    status: 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    generated?: string[];
    error?: string;
  };
}

// ═══════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════

/**
 * Tạo ảnh với Seedream v4 model
 */
export async function generateSeedreamImage(params: {
  prompt: string;
  aspectRatio?: string;
  guidanceScale?: number;
  seed?: number;
}): Promise<FreepikTaskResponse> {
  const body: Record<string, any> = {
    prompt: params.prompt,
  };

  if (params.aspectRatio) body.aspect_ratio = params.aspectRatio;
  if (params.guidanceScale !== undefined) body.guidance_scale = params.guidanceScale;
  if (params.seed !== undefined) body.seed = params.seed;

  debugLog('FREEPIK', `Generating image: "${params.prompt.slice(0, 50)}..."`);

  return freepikApi
    .post('ai/text-to-image/seedream-v4', { json: body })
    .json<FreepikTaskResponse>();
}

/**
 * Kiểm tra trạng thái task Seedream
 */
export async function getSeedreamTaskStatus(taskId: string): Promise<FreepikTaskStatus> {
  return freepikApi.get(`ai/text-to-image/seedream-v4/${taskId}`).json<FreepikTaskStatus>();
}

/**
 * Poll task cho đến khi hoàn thành hoặc timeout
 */
export async function pollTaskUntilComplete(
  taskId: string,
  maxAttempts = CONFIG.freepik?.pollMaxAttempts ?? 30,
  intervalMs = CONFIG.freepik?.pollIntervalMs ?? 2000,
): Promise<FreepikTaskStatus> {
  debugLog('FREEPIK', `Polling task ${taskId}...`);

  for (let i = 0; i < maxAttempts; i++) {
    const status = await getSeedreamTaskStatus(taskId);

    debugLog('FREEPIK', `Task ${taskId}: ${status.data.status} (${i + 1}/${maxAttempts})`);

    if (status.data.status === 'COMPLETED' || status.data.status === 'FAILED') {
      return status;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Task ${taskId} timeout sau ${(maxAttempts * intervalMs) / 1000}s`);
}
