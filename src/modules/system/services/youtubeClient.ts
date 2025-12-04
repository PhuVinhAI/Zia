/**
 * YouTube Data API v3 Client
 * Docs: https://developers.google.com/youtube/v3
 */

import { debugLog } from '../../../core/logger/logger.js';
import { http } from '../../../shared/utils/httpClient.js';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';

interface YouTubeSearchResult {
  kind: string;
  etag: string;
  nextPageToken?: string;
  prevPageToken?: string;
  regionCode?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: YouTubeSearchItem[];
}

interface YouTubeSearchItem {
  kind: string;
  etag: string;
  id: {
    kind: string;
    videoId?: string;
    channelId?: string;
    playlistId?: string;
  };
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: {
      default?: { url: string; width?: number; height?: number };
      medium?: { url: string; width?: number; height?: number };
      high?: { url: string; width?: number; height?: number };
    };
    channelTitle: string;
    liveBroadcastContent: string;
  };
}

interface YouTubeVideoDetails {
  kind: string;
  etag: string;
  items: YouTubeVideoItem[];
}

export interface YouTubeVideoItem {
  kind: string;
  etag: string;
  id: string;
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: {
      default?: { url: string; width?: number; height?: number };
      medium?: { url: string; width?: number; height?: number };
      high?: { url: string; width?: number; height?: number };
      standard?: { url: string; width?: number; height?: number };
      maxres?: { url: string; width?: number; height?: number };
    };
    channelTitle: string;
    tags?: string[];
    categoryId: string;
  };
  contentDetails?: {
    duration: string;
    dimension: string;
    definition: string;
    caption: string;
  };
  statistics?: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
}

interface YouTubeChannelDetails {
  kind: string;
  etag: string;
  items: YouTubeChannelItem[];
}

export interface YouTubeChannelItem {
  kind: string;
  etag: string;
  id: string;
  snippet: {
    title: string;
    description: string;
    customUrl?: string;
    publishedAt: string;
    thumbnails: {
      default?: { url: string; width?: number; height?: number };
      medium?: { url: string; width?: number; height?: number };
      high?: { url: string; width?: number; height?: number };
    };
    country?: string;
  };
  statistics?: {
    viewCount: string;
    subscriberCount: string;
    videoCount: string;
  };
}

export interface SearchParams {
  q: string;
  type?: 'video' | 'channel' | 'playlist';
  maxResults?: number;
  order?: 'relevance' | 'date' | 'rating' | 'viewCount' | 'title';
  regionCode?: string;
  videoDuration?: 'any' | 'short' | 'medium' | 'long';
  pageToken?: string;
}

export interface VideoDetailsParams {
  videoId: string;
}

export interface ChannelDetailsParams {
  channelId: string;
}

/**
 * Search YouTube for videos, channels, or playlists
 */
export async function searchYouTube(params: SearchParams): Promise<YouTubeSearchResult> {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY chưa được cấu hình trong .env');
  }

  const searchParams: Record<string, string> = {
    key: YOUTUBE_API_KEY,
    part: 'snippet',
    q: params.q,
    type: params.type || 'video',
    maxResults: String(params.maxResults || 10),
  };

  if (params.order) searchParams.order = params.order;
  if (params.regionCode) searchParams.regionCode = params.regionCode;
  if (params.videoDuration) searchParams.videoDuration = params.videoDuration;
  if (params.pageToken) searchParams.pageToken = params.pageToken;

  debugLog('YOUTUBE', `Searching: ${params.q} (type: ${params.type || 'video'})`);

  const result = await http
    .get(`${YOUTUBE_API_BASE}/search`, { searchParams })
    .json<YouTubeSearchResult>();

  return result;
}

/**
 * Get video details by ID
 */
export async function getVideoDetails(
  params: VideoDetailsParams,
): Promise<YouTubeVideoItem | null> {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY chưa được cấu hình trong .env');
  }

  const searchParams = {
    key: YOUTUBE_API_KEY,
    part: 'snippet,contentDetails,statistics',
    id: params.videoId,
  };

  debugLog('YOUTUBE', `Getting video details: ${params.videoId}`);

  const data = await http
    .get(`${YOUTUBE_API_BASE}/videos`, { searchParams })
    .json<YouTubeVideoDetails>();

  return data.items?.[0] || null;
}

/**
 * Get channel details by ID
 */
export async function getChannelDetails(
  params: ChannelDetailsParams,
): Promise<YouTubeChannelItem | null> {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY chưa được cấu hình trong .env');
  }

  const searchParams = {
    key: YOUTUBE_API_KEY,
    part: 'snippet,statistics',
    id: params.channelId,
  };

  debugLog('YOUTUBE', `Getting channel details: ${params.channelId}`);

  const data = await http
    .get(`${YOUTUBE_API_BASE}/channels`, { searchParams })
    .json<YouTubeChannelDetails>();

  return data.items?.[0] || null;
}

/**
 * Parse ISO 8601 duration to readable format
 */
export function parseDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return isoDuration;

  const hours = match[1] ? `${match[1]}:` : '';
  const minutes = match[2] || '0';
  const seconds = match[3]?.padStart(2, '0') || '00';

  return hours ? `${hours}${minutes.padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
}

/**
 * Format view count to readable format
 */
export function formatViewCount(count: string): string {
  const num = parseInt(count, 10);
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return count;
}
