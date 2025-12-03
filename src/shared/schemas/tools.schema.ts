/**
 * Tool Schemas - Zod validation cho tool parameters
 */
import { z } from 'zod';

// ============ ENTERTAINMENT TOOLS ============

// Jikan Search params
export const JikanSearchSchema = z.object({
  q: z.string().optional(),
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

// ============ SYSTEM TOOLS ============

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

// ============ HELPER FUNCTION ============

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
