/**
 * Type declarations for msedge-tts (Microsoft Edge Text-to-Speech)
 *
 * Thư viện này không có @types/msedge-tts chính thức và package gốc chỉ chứa
 * JavaScript. File này cung cấp các type cần thiết cho TypeScript compiler.
 *
 * Xem thêm: https://www.npmjs.com/package/msedge-tts
 */

declare module 'msedge-tts' {
  /**
   * Output audio formats được hỗ trợ bởi Microsoft Edge TTS.
   * Property keys tuân theo dạng `AUDIO_<rate>KHZ_<bitrate>KBITRATE_<channels>_<format>`
   * và value là chuỗi định danh mà Edge TTS service chấp nhận.
   */
  export const OUTPUT_FORMAT: Readonly<Record<string, string>>;

  /**
   * Tuỳ chọn truyền vào `MsEdgeTTS.toStream`.
   * Chuỗi theo định dạng mà Edge TTS chấp nhận, ví dụ: "+0%", "-10%", "+50Hz".
   */
  export interface MsEdgeTTSStreamOptions {
    rate?: string;
    volume?: string;
    pitch?: string;
  }

  /**
   * Kết quả trả về từ `MsEdgeTTS.toStream`.
   */
  export interface MsEdgeTTSStreamResult {
    /** Readable stream chứa dữ liệu âm thanh (binary). */
    audioStream: NodeJS.ReadableStream;
    /** Optional: Readable stream chứa metadata boundary events. */
    metadataStream?: NodeJS.ReadableStream;
  }

  /**
   * Microsoft Edge Text-to-Speech client (sử dụng giọng Neural miễn phí).
   */
  export class MsEdgeTTS {
    constructor();

    /**
     * Cấu hình voice (ví dụ: "vi-VN-HoaiMyNeural") và output format
     * (giá trị từ `OUTPUT_FORMAT` constants).
     */
    setMetadata(voice: string, outputFormat: string): Promise<void>;

    /**
     * Chuyển văn bản thành audio + metadata streams.
     */
    toStream(text: string, options?: MsEdgeTTSStreamOptions): MsEdgeTTSStreamResult;
  }
}
