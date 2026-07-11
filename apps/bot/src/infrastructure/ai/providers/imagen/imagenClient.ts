/**
 * Imagen Client - Native Google Imagen via @google/genai SDK
 *
 * Model rotation thông qua imagenKeyManager (mirror Gemini pattern):
 * - 3 models: imagen-4.0-generate-001 / -ultra / -fast
 * - Retry khi gặp 429 (rate limit) → chuyển key
 * - Retry khi gặp 403 (permission denied) → chuyển key
 * - Retry khi gặp 503 (overload) → retry với delay
 *
 * Docs: https://ai.google.dev/gemini-api/docs/image-generation
 *       https://github.com/googleapis/js-genai/blob/main/codegen_instructions.md (Generate Content → Image Generation)
 */
import { GoogleGenAI } from '@google/genai';
import { CONFIG } from '../../../../core/config/config.js';
import { debugLog } from '../../../../core/logger/logger.js';
import {
  imagenKeyManager,
  isImagenPermissionDeniedError,
  isImagenRateLimitError,
} from './imagenKeyManager.js';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

// Enum literals match the Zod schema in `tools.schema.ts` (ImagenImageSchema.personGeneration).
// Imported from shared schema as single source of truth.
import type { ImagenAspectRatio, ImagenPersonGeneration } from '../../../../shared/schemas/tools.schema.js';

export interface ImagenParams {
  prompt: string;
  /** Aspect ratio */
  aspectRatio?: ImagenAspectRatio;
  /** Number of images to generate (1-4). Default: 1 */
  numberOfImages?: number;
  /** Person generation policy */
  personGeneration?: ImagenPersonGeneration;
}

// Decode base64 (standard OR URL-safe) với round-trip check.
// Thử standard trước; nếu mismatch thì convert URL-safe chars (-_) sang standard (+/)
// rồi decode lại. Throw nếu cả hai cách đều sai.
function decodeBase64Robust(input: string, idx: number): Buffer {
  const tryDecode = (s: string): Buffer | null => {
    const buf = Buffer.from(s, 'base64');
    const a = buf.toString('base64').replace(/=+$/, '');
    const b = s.replace(/=+$/, '');
    if (buf.length === 0 || a !== b) return null;
    return buf;
  };

  // 1. Try standard alphabet (+/=) trực tiếp
  const std = tryDecode(input);
  if (std) return std;

  // 2. Try URL-safe alphabet (-_): convert sang standard rồi decode lại
  const urlSafe = tryDecode(input.replace(/-/g, '+').replace(/_/g, '/'));
  if (urlSafe) return urlSafe;

  throw new Error(`Image #${idx} base64 decode failed (cả standard và URL-safe đều không match)`);
}

export interface ImagenImageResult {
  /** Buffers ready for upload to Zalo */
  imageBuffers: Array<{ buffer: Buffer; mimeType: 'image/png' | 'image/jpeg' }>;
  model: string;
  prompt: string;
  count: number;
}

// ═══════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════

const RETRYABLE_STATUS_CODES = [503, 429, 500, 502, 504];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate image(s) using Imagen. Auto-rotates model + key on rate-limit/permission errors.
 */
export async function generateImagenImages(params: ImagenParams): Promise<ImagenImageResult> {
  const prompt = params.prompt;
  const aspectRatio = params.aspectRatio ?? '1:1';
  const numberOfImages = params.numberOfImages ?? 1;
  const personGeneration = params.personGeneration ?? 'allow_adult';

  let lastError: any = null;

  for (let attempt = 0; attempt <= CONFIG.retry.maxRetries; attempt++) {
    try {
      const ai = imagenKeyManager.getCurrentAI();
      const model = imagenKeyManager.getCurrentModel();
      debugLog(
        'IMAGEN',
        `Generating ${numberOfImages}× image(s) with model=${model}, aspect=${aspectRatio}, prompt="${prompt.slice(0, 50)}..."`,
      );

      // Response shape (per @google/genai v2.x — confirmed via codegen_instructions.md):
      // response.generatedImages: Array<{ image: { imageBytes: base64 string } }>
      const response = await ai.models.generateImages({
        model,
        prompt,
        config: {
          numberOfImages,
          aspectRatio,
          personGeneration,
        } as any, // SDK enum types are stringly-typed; cast is safe but kept narrow
      });

      if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error('Imagen trả về 0 ảnh');
      }

      const imageBuffers: ImagenImageResult['imageBuffers'] = response.generatedImages.map(
        (gen, idx) => {
          const base64 = gen.image?.imageBytes;
          if (!base64) {
            throw new Error(`Image #${idx} thiếu imageBytes (response bị hỏng)`);
          }
          // Defensive base64 decode — surface malformed data thay vì silently return bytes rác.
          // Thử standard alphabet (+/=) trước; nếu round-trip fail thì thử URL-safe alphabet (-_).
          // Node Buffer.from chỉ hiểu standard alphabet — URLs-safe phải chuyển đổi trước khi decode.
          const buffer = decodeBase64Robust(base64, idx);
          return {
            buffer,
            mimeType: 'image/png' as const,
          };
        },
      );

      if (attempt > 0) {
        console.log(`[Imagen] ✅ Thành công sau ${attempt} lần retry`);
      }
      debugLog('IMAGEN', `Generated ${imageBuffers.length} image(s) successfully`);

      return {
        imageBuffers,
        model,
        prompt,
        count: imageBuffers.length,
      };
    } catch (error: any) {
      lastError = error;

      // 429 → chuyển key/model, gọi ngay không delay
      if (isImagenRateLimitError(error)) {
        const rotated = imagenKeyManager.handleRateLimitError();
        if (rotated && attempt < CONFIG.retry.maxRetries) {
          console.log(
            `[Imagen] ⚠️ 429 rate limit, chuyển sang key #${imagenKeyManager.getCurrentKeyIndex()}/${imagenKeyManager.getTotalKeys()} (${imagenKeyManager.getCurrentModelName()})`,
          );
          continue;
        }
        break;
      }

      // 403 → chuyển key (không chuyển model vì do auth)
      if (isImagenPermissionDeniedError(error)) {
        const rotated = imagenKeyManager.handlePermissionDeniedError();
        if (rotated) {
          console.log(
            `[Imagen] ⚠️ 403 permission denied, chuyển sang key #${imagenKeyManager.getCurrentKeyIndex()}/${imagenKeyManager.getTotalKeys()}`,
          );
          continue;
        }
        console.log('[Imagen] ❌ Tất cả keys đều bị permission denied');
        break;
      }

      // 503/500/502/504 → retry với exponential delay
      const status = error?.status || error?.code;
      if (RETRYABLE_STATUS_CODES.includes(status) && attempt < CONFIG.retry.maxRetries) {
        const delayMs = CONFIG.retry.baseDelayMs * 2 ** attempt;
        console.log(
          `[Imagen] ⚠️ Lỗi ${status}: retry ${attempt + 1}/${CONFIG.retry.maxRetries} sau ${delayMs}ms`,
        );
        await sleep(delayMs);
        continue;
      }

      break;
    }
  }

  console.error('[Imagen] ❌ Lỗi Imagen:', lastError);
  throw new Error(`Imagen generation failed: ${lastError?.message || 'Unknown error'}`);
}

/** Get current model name (for display) */
export function getCurrentImagenModelName(): string {
  return imagenKeyManager.getCurrentModelName();
}
