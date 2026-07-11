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

// Nekos Images params (random) - chỉ lấy ảnh safe, không hỗ trợ NSFW
export const NekosImagesSchema = z.object({
  tags: z.string().optional(),
  withoutTags: z.string().optional(),
  artist: z.coerce.number().optional(),
  limit: z.coerce.number().min(1).max(25).default(1),
});

// ============ GIPHY API TOOLS ============

// Giphy GIF params - chỉ lấy GIF an toàn (rating 'g'), không hỗ trợ NSFW
export const GiphyGifSchema = z.object({
  mode: z.enum(['search', 'trending', 'random']).default('search'),
  query: z.string().optional(),
  limit: z.coerce.number().min(1).max(25).default(1),
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

// ============ MICROSOFT EDGE TTS TOOLS ============

// Text to Speech params (Microsoft Edge TTS - miễn phí, không cần API key)
export const TextToSpeechSchema = z.object({
  text: z.string().min(1, 'Thiếu văn bản cần đọc').max(5000, 'Văn bản quá dài (tối đa 5000 ký tự)'),
  voice: z.string().optional().describe('Mã giọng đọc, vd: vi-VN-HoaiMyNeural'),
  rate: z.string().optional().describe('Tốc độ đọc, vd: "+0%", "-10%", "+50%"'),
  volume: z.string().optional().describe('Âm lượng, vd: "+0%", "+50%"'),
  pitch: z.string().optional().describe('Cao độ, vd: "+0Hz", "-10Hz"'),
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

// ============ GROUP ADMIN TOOLS ============

// Get Group Info params (không có tham số)
export const GetGroupInfoSchema = z.object({});

// Kick Member params
export const KickMemberSchema = z.object({
  userId: z.string().min(1, 'Thiếu userId của thành viên cần kick'),
});

// Block Member params
export const BlockMemberSchema = z.object({
  userId: z.string().min(1, 'Thiếu userId của thành viên cần chặn'),
});

// Add Member params
export const AddMemberSchema = z.object({
  userId: z.string().min(1, 'Thiếu userId của người cần thêm'),
});

// Review Pending Members params
export const ReviewPendingMembersSchema = z.object({
  memberIds: z.array(z.string()).min(1, 'Cần ít nhất 1 userId'),
  isApprove: z.boolean().describe('true = Duyệt, false = Từ chối'),
});

// Update Group Settings params
export const UpdateGroupSettingsSchema = z.object({
  blockName: z.boolean().optional().describe('Chặn đổi tên/ảnh nhóm'),
  signAdminMsg: z.boolean().optional().describe('Đánh dấu tin admin'),
  joinAppr: z.boolean().optional().describe('Phê duyệt thành viên mới'),
  lockSendMsg: z.boolean().optional().describe('Chỉ admin được chat'),
  lockCreatePost: z.boolean().optional().describe('Chặn tạo ghi chú'),
  lockCreatePoll: z.boolean().optional().describe('Chặn tạo bình chọn'),
});

// Change Group Name params
export const ChangeGroupNameSchema = z.object({
  newName: z.string().min(1, 'Thiếu tên mới').max(100, 'Tên quá dài'),
});

// Change Group Avatar params
export const ChangeGroupAvatarSchema = z.object({
  filePath: z.string().min(1, 'Thiếu đường dẫn file ảnh'),
});

// Add/Remove Group Deputy params
export const GroupDeputySchema = z.object({
  userId: z.string().min(1, 'Thiếu userId'),
});

// Change Group Owner params
export const ChangeGroupOwnerSchema = z.object({
  userId: z.string().min(1, 'Thiếu userId của người nhận quyền'),
});

// Get Group Link Info params
export const GetGroupLinkInfoSchema = z.object({
  link: z.string().min(1, 'Thiếu link nhóm'),
});

// Create Group params
export const CreateGroupSchema = z.object({
  members: z.array(z.string()).min(1, 'Cần ít nhất 1 userId trong members'),
  name: z.string().max(100, 'Tên nhóm quá dài').optional(),
  avatarPath: z.string().optional(),
});

// Join Group Link params
export const JoinGroupLinkSchema = z.object({
  link: z
    .string()
    .min(1, 'Thiếu link nhóm')
    .refine((val) => val.includes('zalo.me/g/'), 'Link phải có dạng https://zalo.me/g/...'),
});

// Leave Group params
export const LeaveGroupSchema = z.object({
  groupId: z.string().optional().describe('ID nhóm cần rời (mặc định: threadId hiện tại)'),
  silent: z.boolean().default(false).describe('Rời âm thầm không thông báo'),
});

// Disperse Group params (giải tán nhóm)
export const DisperseGroupSchema = z.object({
  groupId: z.string().optional().describe('ID nhóm cần giải tán (mặc định: threadId hiện tại)'),
  confirm: z.boolean().describe('Phải truyền true để xác nhận giải tán'),
});

// Get Group Link Detail params (lấy link nhóm)
export const GetGroupLinkDetailSchema = z.object({
  groupId: z.string().optional().describe('ID nhóm cần lấy link (mặc định: threadId hiện tại)'),
});

// ============ FRIEND REQUEST TOOLS ============

// Find User by Phone params
export const FindUserByPhoneSchema = z.object({
  phoneNumber: z.string().min(9, 'Số điện thoại không hợp lệ').max(15, 'Số điện thoại quá dài'),
});

// Send Friend Request params
export const SendFriendRequestSchema = z.object({
  userId: z.string().min(1, 'Thiếu userId của người cần kết bạn'),
  message: z.string().max(150, 'Lời nhắn tối đa 150 ký tự').optional(),
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
  nekosImages: `[tool:nekosImages]{"tags":"catgirl","limit":1}[/tool]`,
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

  // Group Admin tools - Info
  getGroupInfo: `[tool:getGroupInfo]{}[/tool]`,

  // Group Admin tools - Member Management
  kickMember: `[tool:kickMember]{"userId":"123456789"}[/tool]`,
  blockMember: `[tool:blockMember]{"userId":"123456789"}[/tool]`,
  addMember: `[tool:addMember]{"userId":"123456789"}[/tool]`,
  getPendingMembers: `[tool:getPendingMembers]{}[/tool]`,
  reviewPendingMembers: `[tool:reviewPendingMembers]{"memberIds":["uid1","uid2"],"isApprove":true}[/tool]`,

  // Group Admin tools - Settings
  updateGroupSettings: `[tool:updateGroupSettings]{"lockSendMsg":true,"joinAppr":true}[/tool]`,
  changeGroupName: `[tool:changeGroupName]{"newName":"Nhóm AI Vô Địch"}[/tool]`,
  changeGroupAvatar: `[tool:changeGroupAvatar]{"filePath":"./avatar.jpg"}[/tool]`,

  // Group Admin tools - Roles
  addGroupDeputy: `[tool:addGroupDeputy]{"userId":"123456789"}[/tool]`,
  removeGroupDeputy: `[tool:removeGroupDeputy]{"userId":"123456789"}[/tool]`,
  changeGroupOwner: `[tool:changeGroupOwner]{"userId":"123456789"}[/tool]`,

  // Group Admin tools - Link
  enableGroupLink: `[tool:enableGroupLink]{}[/tool]`,
  disableGroupLink: `[tool:disableGroupLink]{}[/tool]`,
  getGroupLinkInfo: `[tool:getGroupLinkInfo]{"link":"https://zalo.me/g/abc123"}[/tool]`,

  // Group Creation & Join
  createGroup: `[tool:createGroup]{"members":["uid1","uid2"],"name":"Nhóm hỗ trợ"}[/tool]`,
  joinGroupLink: `[tool:joinGroupLink]{"link":"https://zalo.me/g/abcxyz"}[/tool]`,

  // Group Leave & Disperse (Destructive)
  leaveGroup: `[tool:leaveGroup]{"silent":false}[/tool]`,
  disperseGroup: `[tool:disperseGroup]{"confirm":true}[/tool]`,

  // Group Link Detail
  getGroupLinkDetail: `[tool:getGroupLinkDetail]{}[/tool]`,

  // Friend Request tools
  findUserByPhone: `[tool:findUserByPhone]{"phoneNumber":"0912345678"}[/tool]`,
  sendFriendRequest: `[tool:sendFriendRequest]{"userId":"123456789","message":"Xin chào!"}[/tool]`,
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

// Group Admin types
export type GetGroupInfoParams = z.infer<typeof GetGroupInfoSchema>;
export type KickMemberParams = z.infer<typeof KickMemberSchema>;
export type BlockMemberParams = z.infer<typeof BlockMemberSchema>;
export type AddMemberParams = z.infer<typeof AddMemberSchema>;
export type ReviewPendingMembersParams = z.infer<typeof ReviewPendingMembersSchema>;
export type UpdateGroupSettingsParams = z.infer<typeof UpdateGroupSettingsSchema>;
export type ChangeGroupNameParams = z.infer<typeof ChangeGroupNameSchema>;
export type ChangeGroupAvatarParams = z.infer<typeof ChangeGroupAvatarSchema>;
export type GroupDeputyParams = z.infer<typeof GroupDeputySchema>;
export type ChangeGroupOwnerParams = z.infer<typeof ChangeGroupOwnerSchema>;
export type GetGroupLinkInfoParams = z.infer<typeof GetGroupLinkInfoSchema>;
export type CreateGroupParams = z.infer<typeof CreateGroupSchema>;
export type JoinGroupLinkParams = z.infer<typeof JoinGroupLinkSchema>;
export type LeaveGroupParams = z.infer<typeof LeaveGroupSchema>;
export type DisperseGroupParams = z.infer<typeof DisperseGroupSchema>;
export type GetGroupLinkDetailParams = z.infer<typeof GetGroupLinkDetailSchema>;

// Friend Request types
export type FindUserByPhoneParams = z.infer<typeof FindUserByPhoneSchema>;
export type SendFriendRequestParams = z.infer<typeof SendFriendRequestSchema>;
