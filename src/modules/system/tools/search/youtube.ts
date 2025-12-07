/**
 * Tool: youtube - Tìm kiếm và lấy thông tin từ YouTube
 * Sử dụng YouTube Data API v3
 */

import { debugLog } from '../../../../core/logger/logger.js';
import {
  validateParamsWithExample,
  YouTubeChannelSchema,
  YouTubeSearchSchema,
  YouTubeVideoSchema,
} from '../../../../shared/schemas/tools.schema.js';
import type { ToolDefinition, ToolResult } from '../../../../shared/types/tools.types.js';
import {
  formatViewCount,
  getChannelDetails,
  getVideoDetails,
  parseDuration,
  searchYouTube,
} from '../../services/youtubeClient.js';

export const youtubeSearchTool: ToolDefinition = {
  name: 'youtubeSearch',
  description: 'Tìm kiếm video, channel hoặc playlist trên YouTube.',
  parameters: [
    { name: 'q', type: 'string', description: 'Từ khóa tìm kiếm', required: true },
    {
      name: 'type',
      type: 'string',
      description: 'Loại: video, channel, playlist',
      required: false,
    },
    { name: 'maxResults', type: 'number', description: 'Số kết quả (1-50)', required: false },
    {
      name: 'order',
      type: 'string',
      description: 'Sắp xếp: relevance, date, viewCount',
      required: false,
    },
  ],
  execute: async (params): Promise<ToolResult> => {
    const validation = validateParamsWithExample(YouTubeSearchSchema, params, 'youtubeSearch');
    if (!validation.success) return { success: false, error: validation.error };
    const data = validation.data;

    try {
      const result = await searchYouTube({
        q: data.q,
        type: data.type,
        maxResults: data.maxResults,
        order: data.order,
      });
      const items = result.items.map((item) => ({
        type: item.id.kind.replace('youtube#', ''),
        id: item.id.videoId || item.id.channelId || item.id.playlistId,
        title: item.snippet.title,
        description: item.snippet.description.substring(0, 200),
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        url: item.id.videoId
          ? `https://youtube.com/watch?v=${item.id.videoId}`
          : item.id.channelId
            ? `https://youtube.com/channel/${item.id.channelId}`
            : `https://youtube.com/playlist?list=${item.id.playlistId}`,
      }));
      debugLog('YOUTUBE', `Found ${items.length} results for "${data.q}"`);
      return {
        success: true,
        data: {
          query: data.q,
          totalResults: result.pageInfo.totalResults,
          items,
          nextPageToken: result.nextPageToken,
        },
      };
    } catch (error: any) {
      return { success: false, error: `Lỗi YouTube: ${error.message}` };
    }
  },
};

export const youtubeVideoTool: ToolDefinition = {
  name: 'youtubeVideo',
  description: 'Lấy thông tin chi tiết video YouTube: title, duration, views, likes.',
  parameters: [
    { name: 'videoId', type: 'string', description: 'ID video YouTube', required: true },
  ],
  execute: async (params): Promise<ToolResult> => {
    const validation = validateParamsWithExample(YouTubeVideoSchema, params, 'youtubeVideo');
    if (!validation.success) return { success: false, error: validation.error };
    const data = validation.data;

    try {
      const video = await getVideoDetails({ videoId: data.videoId });
      if (!video) return { success: false, error: 'Không tìm thấy video' };

      const result = {
        id: video.id,
        title: video.snippet.title,
        description: video.snippet.description,
        channelId: video.snippet.channelId,
        channelTitle: video.snippet.channelTitle,
        publishedAt: video.snippet.publishedAt,
        thumbnail: video.snippet.thumbnails.maxres?.url || video.snippet.thumbnails.high?.url,
        tags: video.snippet.tags?.slice(0, 10),
        duration: video.contentDetails?.duration
          ? parseDuration(video.contentDetails.duration)
          : undefined,
        viewCount: video.statistics?.viewCount,
        viewCountFormatted: video.statistics?.viewCount
          ? formatViewCount(video.statistics.viewCount)
          : undefined,
        likeCount: video.statistics?.likeCount,
        likeCountFormatted: video.statistics?.likeCount
          ? formatViewCount(video.statistics.likeCount)
          : undefined,
        commentCount: video.statistics?.commentCount,
        url: `https://youtube.com/watch?v=${video.id}`,
      };
      debugLog('YOUTUBE', `Got video: ${video.snippet.title}`);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: `Lỗi YouTube: ${error.message}` };
    }
  },
};

export const youtubeChannelTool: ToolDefinition = {
  name: 'youtubeChannel',
  description: 'Lấy thông tin channel YouTube: tên, subscriber, số video.',
  parameters: [
    { name: 'channelId', type: 'string', description: 'ID channel YouTube', required: true },
  ],
  execute: async (params): Promise<ToolResult> => {
    const validation = validateParamsWithExample(YouTubeChannelSchema, params, 'youtubeChannel');
    if (!validation.success) return { success: false, error: validation.error };
    const data = validation.data;

    try {
      const channel = await getChannelDetails({ channelId: data.channelId });
      if (!channel) return { success: false, error: 'Không tìm thấy channel' };

      const result = {
        id: channel.id,
        title: channel.snippet.title,
        description: channel.snippet.description,
        customUrl: channel.snippet.customUrl,
        publishedAt: channel.snippet.publishedAt,
        country: channel.snippet.country,
        thumbnail: channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.default?.url,
        subscriberCount: channel.statistics?.subscriberCount,
        subscriberCountFormatted: channel.statistics?.subscriberCount
          ? formatViewCount(channel.statistics.subscriberCount)
          : undefined,
        videoCount: channel.statistics?.videoCount,
        viewCount: channel.statistics?.viewCount,
        viewCountFormatted: channel.statistics?.viewCount
          ? formatViewCount(channel.statistics.viewCount)
          : undefined,
        url: channel.snippet.customUrl
          ? `https://youtube.com/${channel.snippet.customUrl}`
          : `https://youtube.com/channel/${channel.id}`,
      };
      debugLog('YOUTUBE', `Got channel: ${channel.snippet.title}`);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: `Lỗi YouTube: ${error.message}` };
    }
  },
};
