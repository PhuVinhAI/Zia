/**
 * Tool Schemas - Zod validation cho tool parameters
 */
import { z } from 'zod';

// ============ ENTERTAINMENT TOOLS ============

// Jikan Search params
export const JikanSearchSchema = z.object({
  q: z.coerce.string().optional(), // Coerce để chấp nhận cả number
  mediaType: z.enum(['anime', 'manga']).default('anime'),
  type: z
    .enum([
      'tv',
      'movie',
      'ova',
      'special',
      'ona',
      'music',
      'manga',
      'novel',
      'lightnovel',
      'oneshot',
      'doujin',
      'manhwa',
      'manhua',
    ])
    .optional(),
  status: z
    .enum(['airing', 'complete', 'upcoming', 'publishing', 'hiatus', 'discontinued'])
    .optional(),
  minScore: z.coerce.number().min(1).max(10).optional(),
  genres: z.string().optional(),
  orderBy: z.enum(['title', 'score', 'popularity', 'favorites', 'rank']).optional(),
  sort: z.enum(['desc', 'asc']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(25).default(10),
});

// Jikan Details params
export const JikanDetailsSchema = z.object({
  id: z.coerce.number().min(1, 'Thiếu ID anime/manga'),
  mediaType: z.enum(['anime', 'manga']).default('anime'),
});

// Jikan Top params
export const JikanTopSchema = z.object({
  mediaType: z.enum(['anime', 'manga']).default('anime'),
  type: z
    .enum([
      'tv',
      'movie',
      'ova',
      'special',
      'ona',
      'music',
      'manga',
      'novel',
      'lightnovel',
      'oneshot',
      'doujin',
      'manhwa',
      'manhua',
    ])
    .optional(),
  filter: z.enum(['airing', 'upcoming', 'bypopularity', 'favorite']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(25).default(10),
});

// Jikan Season params
export const JikanSeasonSchema = z.object({
  mode: z.enum(['now', 'upcoming', 'schedule']).default('now'),
  day: z
    .enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
    .optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(25).default(10),
});

// Jikan Characters params
export const JikanCharactersSchema = z.object({
  id: z.coerce.number().min(1, 'Thiếu ID anime/manga'),
  mediaType: z.enum(['anime', 'manga']).default('anime'),
  limit: z.coerce.number().min(1).max(50).default(10),
});

// Jikan Episodes params
export const JikanEpisodesSchema = z.object({
  id: z.coerce.number().min(1, 'Thiếu ID anime'),
  page: z.coerce.number().min(1).default(1),
});

// Jikan Genres params
export const JikanGenresSchema = z.object({
  mediaType: z.enum(['anime', 'manga']).default('anime'),
});

// Jikan Recommendations params
export const JikanRecommendationsSchema = z.object({
  id: z.coerce.number().min(1, 'Thiếu ID anime/manga'),
  mediaType: z.enum(['anime', 'manga']).default('anime'),
  limit: z.coerce.number().min(1).max(50).default(10),
});

// ============ NEKOS API TOOLS ============

// Nekos Images params (random)
export const NekosImagesSchema = z.object({
  tags: z.string().optional(),
  withoutTags: z.string().optional(),
  rating: z.enum(['safe', 'suggestive', 'borderline', 'explicit']).default('safe'),
  artist: z.coerce.number().optional(),
  limit: z.coerce.number().min(1).max(25).default(1),
});

// ============ GIPHY API TOOLS ============

// Giphy GIF params
export const GiphyGifSchema = z.object({
  mode: z.enum(['search', 'trending', 'random']).default('search'),
  query: z.string().optional(),
  limit: z.coerce.number().min(1).max(25).default(1),
  rating: z.enum(['y', 'g', 'pg', 'pg-13', 'r']).default('r'),
});

// ============ FREEPIK AI IMAGE TOOLS ============

// Freepik Seedream v4 Image Generation params
export const FreepikImageSchema = z.object({
  prompt: z
    .string()
    .min(1, 'Thiếu prompt mô tả ảnh')
    .max(2000, 'Prompt quá dài (tối đa 2000 ký tự)'),
  aspectRatio: z
    .enum([
      'square_1_1',
      'widescreen_16_9',
      'social_story_9_16',
      'portrait_2_3',
      'traditional_3_4',
      'standard_3_2',
      'classic_4_3',
    ])
    .default('square_1_1'),
  guidanceScale: z.coerce.number().min(0).max(20).default(2.5),
  seed: z.coerce.number().min(0).max(2147483647).optional(),
});

// ============ ELEVENLABS TTS TOOLS ============

// Text to Speech params (Yui voice + Eleven v3 Alpha)
export const TextToSpeechSchema = z.object({
  text: z.string().min(1, 'Thiếu văn bản cần đọc').max(5000, 'Văn bản quá dài (tối đa 5000 ký tự)'),
  stability: z.coerce.number().min(0).max(1).optional(),
  similarityBoost: z.coerce.number().min(0).max(1).optional(),
  style: z.coerce.number().min(0).max(1).optional(),
});

// ============ SYSTEM TOOLS ============

// Create File params (txt, docx, json, csv, code, etc.)
export const CreateFileSchema = z.object({
  filename: z
    .string()
    .min(1, 'Thiếu tên file')
    .max(100, 'Tên file quá dài')
    .refine((name) => name.includes('.'), 'Tên file phải có đuôi mở rộng (vd: report.docx)'),
  content: z
    .string()
    .min(1, 'Thiếu nội dung')
    .max(100000, 'Nội dung quá dài (tối đa 100000 ký tự)'),
  title: z.string().max(200, 'Tiêu đề quá dài').optional(),
  author: z.string().max(100, 'Tên tác giả quá dài').optional(),
});

// Get All Friends params
export const GetAllFriendsSchema = z.object({
  limit: z.coerce.number().min(1).max(200).default(50),
});

// Get Friend Onlines params
export const GetFriendOnlinesSchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(10),
  includeNames: z.boolean().default(true),
});

// Get User Info params
export const GetUserInfoSchema = z.object({
  userId: z.string().optional(),
});

// Create Chart params
export const CreateChartSchema = z.object({
  type: z.enum(['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea']),
  title: z.string().min(1, 'Thiếu tiêu đề biểu đồ'),
  labels: z.array(z.string()).min(1, 'Cần ít nhất 1 label'),
  datasets: z
    .array(
      z.object({
        label: z.string().optional(),
        data: z.array(z.coerce.number()),
        backgroundColor: z.union([z.string(), z.array(z.string())]).optional(),
        borderColor: z.union([z.string(), z.array(z.string())]).optional(),
        borderWidth: z.coerce.number().optional(),
        fill: z.boolean().optional(),
        tension: z.coerce.number().optional(),
      }),
    )
    .min(1, 'Cần ít nhất 1 dataset'),
  width: z.coerce.number().min(200).max(2000).optional(),
  height: z.coerce.number().min(200).max(2000).optional(),
});

// ============ ACADEMIC TOOLS ============

// TVU Login params
export const TvuLoginSchema = z.object({
  username: z.string().min(1, 'Thiếu mã số sinh viên'),
  password: z.string().min(1, 'Thiếu mật khẩu'),
});

// TVU Schedule params
export const TvuScheduleSchema = z.object({
  hocKy: z.coerce.number().min(1, 'Thiếu mã học kỳ (hocKy)'),
});

// TVU Notifications params
export const TvuNotificationsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
});

// ============ YOUTUBE API TOOLS ============

// YouTube Search params
export const YouTubeSearchSchema = z.object({
  q: z.string().min(1, 'Thiếu từ khóa tìm kiếm'),
  type: z.enum(['video', 'channel', 'playlist']).default('video'),
  maxResults: z.coerce.number().min(1).max(50).default(5),
  order: z.enum(['relevance', 'date', 'rating', 'viewCount', 'title']).optional(),
  videoDuration: z.enum(['any', 'short', 'medium', 'long']).optional(),
  pageToken: z.string().optional(),
});

// YouTube Video Details params
export const YouTubeVideoSchema = z.object({
  videoId: z.string().min(1, 'Thiếu ID video YouTube'),
});

// YouTube Channel Details params
export const YouTubeChannelSchema = z.object({
  channelId: z.string().min(1, 'Thiếu ID channel YouTube'),
});

// ============ GOOGLE CUSTOM SEARCH API ============

// Google Search params (chấp nhận cả q và query)
export const GoogleSearchSchema = z
  .object({
    q: z.string().optional(),
    query: z.string().optional(),
    num: z.coerce.number().min(1).max(10).default(10),
    start: z.coerce.number().min(1).optional(),
    searchType: z.enum(['web', 'image']).default('web'),
    safe: z.enum(['off', 'active']).default('off'),
  })
  .transform((data) => ({
    ...data,
    q: data.q || data.query || '',
  }))
  .refine((data) => data.q.length > 0, { message: 'Thiếu từ khóa tìm kiếm (q hoặc query)' });

// ============ MEMORY TOOLS ============

// Memory types
const MEMORY_TYPES = ['conversation', 'fact', 'person', 'preference', 'task', 'note'] as const;

// Save Memory params
export const SaveMemorySchema = z.object({
  content: z.string().min(5, 'Nội dung quá ngắn (tối thiểu 5 ký tự)').max(2000, 'Nội dung quá dài'),
  type: z.enum(MEMORY_TYPES).default('note'),
  importance: z.coerce.number().min(1).max(10).default(5),
});

// Recall Memory params
export const RecallMemorySchema = z.object({
  query: z.string().min(2, 'Query quá ngắn (tối thiểu 2 ký tự)').max(500, 'Query quá dài'),
  type: z.enum(MEMORY_TYPES).optional(),
  limit: z.coerce.number().min(1).max(10).default(5),
});

// ============ CREATE APP TOOL ============

// All available CDN libraries
const APP_LIBRARIES = [
  // CSS
  'tailwind',
  'bootstrap',
  'daisyui',
  // JS Frameworks
  'alpine',
  'petite',
  'jquery',
  // 2D Game Engines
  'phaser',
  'pixijs',
  'kaboom',
  'kontra',
  'excalibur',
  // 3D Engines
  'three',
  'babylon',
  'aframe',
  'playcanvas',
  // Physics
  'matter',
  'p2',
  'cannon',
  // Animation
  'anime',
  'gsap',
  'motion',
  'lottie',
  'confetti',
  'particles',
  // Charts
  'chartjs',
  'apexcharts',
  'echarts',
  'd3',
  // Audio
  'howler',
  'tone',
  'pizzicato',
  // Utilities
  'lodash',
  'dayjs',
  'axios',
  'localforage',
  'uuid',
  // UI Components
  'sweetalert',
  'toastify',
  'tippy',
  'sortable',
  'swiper',
  // Markdown & Code
  'marked',
  'prism',
  'highlight',
  'katex',
  // Icons
  'fontawesome',
  'lucide',
  'boxicons',
  'heroicons',
  // Forms
  'imask',
  'cleave',
  // Canvas & Drawing
  'fabric',
  'konva',
  'paper',
  'rough',
  // Export
  'html2canvas',
  'jspdf',
  'qrcode',
  'qrcodejs',
] as const;

// Create App params (HTML single-file app with CDN libraries)
export const CreateAppSchema = z.object({
  name: z.string().min(1, 'Thiếu tên app').max(100, 'Tên app quá dài'),
  html: z.string().min(1, 'Thiếu nội dung HTML'),
  css: z.string().optional().default(''),
  js: z.string().optional().default(''),
  title: z.string().optional(),
  description: z.string().optional(),
  libraries: z.array(z.enum(APP_LIBRARIES)).optional().default(['tailwind']),
});

// ============ BACKGROUND AGENT TOOLS ============

// Task types (accept_friend được xử lý tự động, không cần task)
const TASK_TYPES = ['send_message', 'send_friend_request'] as const;

// Schedule Task params
export const ScheduleTaskSchema = z.object({
  type: z.enum(TASK_TYPES).describe('Loại task: send_message, send_friend_request'),
  targetUserId: z.string().optional().describe('ID người dùng đích'),
  targetThreadId: z.string().optional().describe('ID thread/nhóm đích (cho send_message)'),
  message: z.string().optional().describe('Nội dung tin nhắn'),
  delayMinutes: z.coerce.number().min(0).default(0).describe('Số phút delay (0 = ngay lập tức)'),
  context: z.string().optional().describe('Ngữ cảnh/lý do tạo task'),
});

// ============ HELPER FUNCTION ============

/**
 * Ví dụ cấu trúc đúng cho từng tool - giúp AI tránh ảo giác
 */
export const TOOL_EXAMPLES: Record<string, string> = {
  // Entertainment
  jikanSearch: `[tool:jikanSearch]{"q":"naruto","mediaType":"anime","limit":5}[/tool]`,
  jikanDetails: `[tool:jikanDetails]{"id":20,"mediaType":"anime"}[/tool]`,
  jikanTop: `[tool:jikanTop]{"mediaType":"anime","filter":"airing","limit":10}[/tool]`,
  jikanSeason: `[tool:jikanSeason]{"mode":"now","limit":10}[/tool]`,
  jikanCharacters: `[tool:jikanCharacters]{"id":20,"mediaType":"anime","limit":10}[/tool]`,
  jikanEpisodes: `[tool:jikanEpisodes]{"id":20,"page":1}[/tool]`,
  jikanGenres: `[tool:jikanGenres]{"mediaType":"anime"}[/tool]`,
  jikanRecommendations: `[tool:jikanRecommendations]{"id":20,"mediaType":"anime","limit":5}[/tool]`,
  nekosImages: `[tool:nekosImages]{"tags":"catgirl","rating":"safe","limit":1}[/tool]`,
  giphyGif: `[tool:giphyGif]{"mode":"search","query":"happy","limit":1}[/tool]`,

  // System
  googleSearch: `[tool:googleSearch]{"q":"từ khóa tìm kiếm","num":5}[/tool]`,
  youtubeSearch: `[tool:youtubeSearch]{"q":"music video","maxResults":5}[/tool]`,
  youtubeVideo: `[tool:youtubeVideo]{"videoId":"dQw4w9WgXcQ"}[/tool]`,
  youtubeChannel: `[tool:youtubeChannel]{"channelId":"UC..."}[/tool]`,
  createChart: `[tool:createChart]{"type":"bar","title":"Biểu đồ","labels":["A","B","C"],"datasets":[{"label":"Data","data":[10,20,30]}]}[/tool]`,
  createFile: `[tool:createFile]{"filename":"report.docx","content":"# Tiêu đề\\n\\nNội dung..."}[/tool]`,
  createApp: `[tool:createApp]{"name":"MyApp","html":"<div>Hello</div>","js":"console.log('hi')","libraries":["tailwind"]}[/tool]`,
  executeCode: `[tool:executeCode]{"code":"print('Hello')","language":"python"}[/tool]`,
  freepikImage: `[tool:freepikImage]{"prompt":"a cute cat","aspectRatio":"square_1_1"}[/tool]`,
  textToSpeech: `[tool:textToSpeech]{"text":"Xin chào"}[/tool]`,
  solveMath: `[tool:solveMath]{"problem":"Giải $x^2 = 4$","solution":"$x = \\pm 2$"}[/tool]`,
  saveMemory: `[tool:saveMemory]{"content":"User thích màu xanh","type":"preference","importance":7}[/tool]`,
  recallMemory: `[tool:recallMemory]{"query":"sở thích","limit":5}[/tool]`,
  scheduleTask: `[tool:scheduleTask]{"type":"send_message","targetUserId":"123","message":"Hello","delayMinutes":5}[/tool]`,
  clearHistory: `[tool:clearHistory]{}[/tool]`,
  flush_logs: `[tool:flush_logs]{}[/tool]`,
  getAllFriends: `[tool:getAllFriends]{"limit":50}[/tool]`,
  getFriendOnlines: `[tool:getFriendOnlines]{"limit":10}[/tool]`,
  getUserInfo: `[tool:getUserInfo]{"userId":"123"}[/tool]`,

  // Academic
  tvuLogin: `[tool:tvuLogin]{"username":"MSSV","password":"matkhau"}[/tool]`,
  tvuGrades: `[tool:tvuGrades]{}[/tool]`,
  tvuSchedule: `[tool:tvuSchedule]{"hocKy":20241}[/tool]`,
  tvuSemesters: `[tool:tvuSemesters]{}[/tool]`,
  tvuStudentInfo: `[tool:tvuStudentInfo]{}[/tool]`,
  tvuNotifications: `[tool:tvuNotifications]{"limit":20}[/tool]`,
  tvuCurriculum: `[tool:tvuCurriculum]{}[/tool]`,
  tvuTuition: `[tool:tvuTuition]{}[/tool]`,
};

/**
 * Validate params với Zod schema
 * @returns { success: true, data } hoặc { success: false, error }
 */
export function validateParams<T>(
  schema: z.ZodSchema<T>,
  params: unknown,
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(params);
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message || 'Tham số không hợp lệ',
    };
  }
  return { success: true, data: result.data };
}

/**
 * Validate params và trả về error kèm ví dụ cấu trúc đúng
 * Giúp AI tránh ảo giác khi gọi tool sai cấu trúc
 */
export function validateParamsWithExample<T>(
  schema: z.ZodSchema<T>,
  params: unknown,
  toolName: string,
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(params);
  if (!result.success) {
    const errorMsg = result.error.issues[0]?.message || 'Tham số không hợp lệ';
    const example = TOOL_EXAMPLES[toolName];
    const errorWithExample = example
      ? `${errorMsg}\n\n📝 Cấu trúc đúng:\n${example}`
      : errorMsg;
    return {
      success: false,
      error: errorWithExample,
    };
  }
  return { success: true, data: result.data };
}

// Type exports
export type JikanSearchParams = z.infer<typeof JikanSearchSchema>;
export type JikanDetailsParams = z.infer<typeof JikanDetailsSchema>;
export type JikanTopParams = z.infer<typeof JikanTopSchema>;
export type JikanSeasonParams = z.infer<typeof JikanSeasonSchema>;
export type JikanCharactersParams = z.infer<typeof JikanCharactersSchema>;
export type JikanEpisodesParams = z.infer<typeof JikanEpisodesSchema>;
export type JikanGenresParams = z.infer<typeof JikanGenresSchema>;
export type JikanRecommendationsParams = z.infer<typeof JikanRecommendationsSchema>;
export type GetAllFriendsParams = z.infer<typeof GetAllFriendsSchema>;
export type GetFriendOnlinesParams = z.infer<typeof GetFriendOnlinesSchema>;
export type GetUserInfoParams = z.infer<typeof GetUserInfoSchema>;
export type TvuLoginParams = z.infer<typeof TvuLoginSchema>;
export type TvuScheduleParams = z.infer<typeof TvuScheduleSchema>;
export type TvuNotificationsParams = z.infer<typeof TvuNotificationsSchema>;
export type NekosImagesParams = z.infer<typeof NekosImagesSchema>;
export type GiphyGifParams = z.infer<typeof GiphyGifSchema>;
export type TextToSpeechParams = z.infer<typeof TextToSpeechSchema>;
export type FreepikImageParams = z.infer<typeof FreepikImageSchema>;
export type CreateFileParams = z.infer<typeof CreateFileSchema>;
export type CreateChartParams = z.infer<typeof CreateChartSchema>;
export type YouTubeSearchParams = z.infer<typeof YouTubeSearchSchema>;
export type YouTubeVideoParams = z.infer<typeof YouTubeVideoSchema>;
export type YouTubeChannelParams = z.infer<typeof YouTubeChannelSchema>;
export type CreateAppParams = z.infer<typeof CreateAppSchema>;
export type GoogleSearchParams = z.infer<typeof GoogleSearchSchema>;
export type SaveMemoryParams = z.infer<typeof SaveMemorySchema>;
export type RecallMemoryParams = z.infer<typeof RecallMemorySchema>;
export type ScheduleTaskParams = z.infer<typeof ScheduleTaskSchema>;
