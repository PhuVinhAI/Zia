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

// Get Group Members params (không có tham số, lấy từ context)
export const GetGroupMembersSchema = z.object({});

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

// ============ WEATHER API ============

// Weather params (Open-Meteo API)
export const WeatherSchema = z.object({
  location: z.string().min(1, 'Thiếu tên địa điểm'),
  days: z.coerce.number().min(1).max(16).default(7),
  hourlyHours: z.coerce.number().min(0).max(168).default(24),
});

// ============ STEAM API ============

// Steam Search params
export const SteamSearchSchema = z.object({
  query: z.string().min(1, 'Thiếu tên game cần tìm'),
  limit: z.coerce.number().min(1).max(20).default(10),
});

// Steam Game Details params
export const SteamGameSchema = z.object({
  appId: z.coerce.number().min(1, 'Thiếu Steam App ID'),
});

// Steam Top Games params
export const SteamTopGamesSchema = z.object({
  mode: z.enum(['top100in2weeks', 'top100forever', 'top100owned']).default('top100in2weeks'),
  limit: z.coerce.number().min(1).max(50).default(20),
});

// ============ CURRENCY API ============

// Currency Convert params
export const CurrencyConvertSchema = z.object({
  amount: z.coerce.number().min(0.01, 'Số tiền phải lớn hơn 0'),
  from: z.string().min(3, 'Mã tiền tệ nguồn không hợp lệ').max(3),
  to: z.string().min(3, 'Mã tiền tệ đích không hợp lệ').max(3),
});

// Currency Rates params
export const CurrencyRatesSchema = z.object({
  base: z.string().min(3).max(3).default('VND'),
  currencies: z.string().optional(),
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
  targetDescription: z
    .string()
    .optional()
    .describe('Mô tả nhóm/người nhận (VD: "nhóm lớp 12A", "nhóm gia đình") - agent sẽ tự tìm'),
  message: z.string().optional().describe('Nội dung tin nhắn'),
  delayMinutes: z.coerce.number().min(0).default(0).describe('Số phút delay (0 = ngay lập tức)'),
  context: z.string().optional().describe('Ngữ cảnh/lý do tạo task'),
});

// ============ POLL TOOLS ============

// Create Poll params
export const CreatePollSchema = z.object({
  question: z.string().min(1, 'Thiếu câu hỏi bình chọn'),
  options: z.array(z.string()).min(2, 'Cần ít nhất 2 lựa chọn'),
  expiredTime: z.coerce.number().default(0),
  allowMultiChoices: z.boolean().default(false),
  allowAddNewOption: z.boolean().default(false),
  hideVotePreview: z.boolean().default(false),
  isAnonymous: z.boolean().default(false),
});

// Get Poll Detail params
export const GetPollDetailSchema = z.object({
  pollId: z.coerce.number().min(1, 'Thiếu pollId'),
});

// Vote Poll params
export const VotePollSchema = z.object({
  pollId: z.coerce.number().min(1, 'Thiếu pollId'),
  optionIds: z.array(z.coerce.number()).min(1, 'Cần ít nhất 1 option_id để vote'),
});

// Lock Poll params
export const LockPollSchema = z.object({
  pollId: z.coerce.number().min(1, 'Thiếu pollId'),
});

// ============ BOARD/NOTE TOOLS ============

// Create Note params
export const CreateNoteSchema = z.object({
  title: z.string().min(1, 'Thiếu nội dung ghi chú'),
  pinAct: z.boolean().default(true),
});

// Get List Board params
export const GetListBoardSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  count: z.coerce.number().min(1).max(50).default(20),
});

// Edit Note params
export const EditNoteSchema = z.object({
  topicId: z.string().min(1, 'Thiếu topicId'),
  title: z.string().min(1, 'Thiếu nội dung mới'),
  pinAct: z.boolean().default(true),
});

// ============ FORWARD MESSAGE TOOL ============

// Message types for forward
const FORWARD_MSG_TYPES = [
  'text',
  'chat',
  'webchat',
  'chat.photo',
  'photo',
  'image',
  'chat.sticker',
  'sticker',
  'chat.voice',
  'voice',
  'chat.video.msg',
  'video',
  'share.file',
  'file',
  'gif',
  'doodle',
] as const;

// Forward Message params
export const ForwardMessageSchema = z.object({
  message: z.string().default(''), // Có thể rỗng cho media
  targetThreadIds: z.string().min(1, 'Thiếu ID người/nhóm nhận'),
  targetType: z.enum(['user', 'group']).default('user'),
  originalMsgId: z.string().optional(),
  originalTimestamp: z.coerce.number().optional(),
  msgType: z.enum(FORWARD_MSG_TYPES).default('text'),
});

// ============ REMINDER TOOLS ============

// Repeat modes
const REMINDER_REPEAT_MODES = ['none', 'daily', 'weekly', 'monthly'] as const;

// Create Reminder params
export const CreateReminderSchema = z.object({
  title: z.string().min(1, 'Thiếu tiêu đề nhắc nhở'),
  startTime: z.coerce.number().min(1, 'Thiếu thời gian nhắc (Unix timestamp ms)'),
  repeat: z.enum(REMINDER_REPEAT_MODES).default('none'),
});

// Get Reminder params
export const GetReminderSchema = z.object({
  reminderId: z.string().min(1, 'Thiếu reminderId'),
});

// Remove Reminder params
export const RemoveReminderSchema = z.object({
  reminderId: z.string().min(1, 'Thiếu reminderId'),
});

// ============ UTILITY TOOLS ============

// QR Code params
export const QRCodeSchema = z.object({
  data: z
    .string()
    .min(1, 'Thiếu nội dung cần tạo QR')
    .max(2000, 'Nội dung quá dài (tối đa 2000 ký tự)'),
  size: z.coerce.number().min(100).max(1000).default(300),
});

// URL Shortener params
export const UrlShortenerSchema = z.object({
  url: z.string().url('URL không hợp lệ'),
  alias: z.string().min(3).max(30).optional(),
});

// ============ HELPER FUNCTION ============

/**
 * Ví dụ cấu trúc đúng cho từng tool - giúp AI tránh ảo giác
 */
export const TOOL_EXAMPLES: Record<string, string> = {
  // Weather
  weather: `[tool:weather]{"location":"Hà Nội","days":7}[/tool]`,

  // Steam
  steamSearch: `[tool:steamSearch]{"query":"Counter-Strike","limit":5}[/tool]`,
  steamGame: `[tool:steamGame]{"appId":730}[/tool]`,
  steamTop: `[tool:steamTop]{"mode":"top100in2weeks","limit":10}[/tool]`,

  // Currency
  currencyConvert: `[tool:currencyConvert]{"amount":100,"from":"USD","to":"VND"}[/tool]`,
  currencyRates: `[tool:currencyRates]{"base":"VND","currencies":"USD,EUR,JPY"}[/tool]`,

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
  scheduleTask: `[tool:scheduleTask]{"type":"send_message","targetDescription":"nhóm lớp 12A","message":"Hello","delayMinutes":5}[/tool]`,
  clearHistory: `[tool:clearHistory]{}[/tool]`,
  flush_logs: `[tool:flush_logs]{}[/tool]`,
  getAllFriends: `[tool:getAllFriends]{"limit":50}[/tool]`,
  getFriendOnlines: `[tool:getFriendOnlines]{"limit":10}[/tool]`,
  getUserInfo: `[tool:getUserInfo]{"userId":"123"}[/tool]`,
  getGroupMembers: `[tool:getGroupMembers]{}[/tool]`,

  // Academic
  tvuLogin: `[tool:tvuLogin]{"username":"MSSV","password":"matkhau"}[/tool]`,
  tvuGrades: `[tool:tvuGrades]{}[/tool]`,
  tvuSchedule: `[tool:tvuSchedule]{"hocKy":20241}[/tool]`,
  tvuSemesters: `[tool:tvuSemesters]{}[/tool]`,
  tvuStudentInfo: `[tool:tvuStudentInfo]{}[/tool]`,
  tvuNotifications: `[tool:tvuNotifications]{"limit":20}[/tool]`,
  tvuCurriculum: `[tool:tvuCurriculum]{}[/tool]`,
  tvuTuition: `[tool:tvuTuition]{}[/tool]`,

  // Poll tools
  createPoll: `[tool:createPoll]{"question":"Trưa ăn gì?","options":["Cơm","Phở","Bún"],"allowMultiChoices":true}[/tool]`,
  getPollDetail: `[tool:getPollDetail]{"pollId":123456}[/tool]`,
  votePoll: `[tool:votePoll]{"pollId":123456,"optionIds":[1001]}[/tool]`,
  lockPoll: `[tool:lockPoll]{"pollId":123456}[/tool]`,

  // Board/Note tools
  createNote: `[tool:createNote]{"title":"🚨 THÔNG BÁO: Mai họp lúc 8h","pinAct":true}[/tool]`,
  getListBoard: `[tool:getListBoard]{"page":1,"count":20}[/tool]`,
  editNote: `[tool:editNote]{"topicId":"topic_123","title":"Nội dung mới","pinAct":true}[/tool]`,

  // Reminder tools
  createReminder: `[tool:createReminder]{"title":"Deadline nộp báo cáo","startTime":1733580000000,"repeat":"none"}[/tool]`,
  getReminder: `[tool:getReminder]{"reminderId":"reminder_123"}[/tool]`,
  removeReminder: `[tool:removeReminder]{"reminderId":"reminder_123"}[/tool]`,

  // Forward Message tool (hỗ trợ text và media)
  forwardMessage: `[tool:forwardMessage]{"message":"","targetThreadIds":"123456789","targetType":"user","originalMsgId":"msg_abc123","msgType":"chat.photo"}[/tool]`,

  // Utility tools
  qrCode: `[tool:qrCode]{"data":"https://example.com","size":300}[/tool]`,
  urlShortener: `[tool:urlShortener]{"url":"https://example.com/very-long-url"}[/tool]`,
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
    const errorWithExample = example ? `${errorMsg}\n\n📝 Cấu trúc đúng:\n${example}` : errorMsg;
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
export type GetGroupMembersParams = z.infer<typeof GetGroupMembersSchema>;
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
export type WeatherParams = z.infer<typeof WeatherSchema>;
export type SteamSearchParams = z.infer<typeof SteamSearchSchema>;
export type SteamGameParams = z.infer<typeof SteamGameSchema>;
export type SteamTopGamesParams = z.infer<typeof SteamTopGamesSchema>;
export type CurrencyConvertParams = z.infer<typeof CurrencyConvertSchema>;
export type CurrencyRatesParams = z.infer<typeof CurrencyRatesSchema>;
export type SaveMemoryParams = z.infer<typeof SaveMemorySchema>;
export type RecallMemoryParams = z.infer<typeof RecallMemorySchema>;
export type ScheduleTaskParams = z.infer<typeof ScheduleTaskSchema>;

// Poll types
export type CreatePollParams = z.infer<typeof CreatePollSchema>;
export type GetPollDetailParams = z.infer<typeof GetPollDetailSchema>;
export type VotePollParams = z.infer<typeof VotePollSchema>;
export type LockPollParams = z.infer<typeof LockPollSchema>;

// Board/Note types
export type CreateNoteParams = z.infer<typeof CreateNoteSchema>;
export type GetListBoardParams = z.infer<typeof GetListBoardSchema>;
export type EditNoteParams = z.infer<typeof EditNoteSchema>;

// Reminder types
export type CreateReminderParams = z.infer<typeof CreateReminderSchema>;
export type GetReminderParams = z.infer<typeof GetReminderSchema>;
export type RemoveReminderParams = z.infer<typeof RemoveReminderSchema>;

// Forward Message types
export type ForwardMessageParams = z.infer<typeof ForwardMessageSchema>;

// Utility types
export type QRCodeParams = z.infer<typeof QRCodeSchema>;
export type UrlShortenerParams = z.infer<typeof UrlShortenerSchema>;
