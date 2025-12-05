/**
 * Google Custom Search API Client
 * Docs: https://developers.google.com/custom-search/v1/overview
 */

import { debugLog } from '../../../core/logger/logger.js';
import { http } from '../../../shared/utils/httpClient.js';

const GOOGLE_SEARCH_API_BASE = 'https://www.googleapis.com/customsearch/v1';
const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY || '';
const GOOGLE_SEARCH_CX = process.env.GOOGLE_SEARCH_CX || '';

interface GoogleSearchResult {
  kind: string;
  url: {
    type: string;
    template: string;
  };
  queries: {
    request: GoogleSearchQuery[];
    nextPage?: GoogleSearchQuery[];
  };
  context: {
    title: string;
  };
  searchInformation: {
    searchTime: number;
    formattedSearchTime: string;
    totalResults: string;
    formattedTotalResults: string;
  };
  items?: GoogleSearchItem[];
}

interface GoogleSearchQuery {
  title: string;
  totalResults: string;
  searchTerms: string;
  count: number;
  startIndex: number;
  inputEncoding: string;
  outputEncoding: string;
  safe: string;
  cx: string;
}

export interface GoogleSearchItem {
  kind: string;
  title: string;
  htmlTitle: string;
  link: string;
  displayLink: string;
  snippet: string;
  htmlSnippet: string;
  cacheId?: string;
  formattedUrl: string;
  htmlFormattedUrl: string;
  pagemap?: {
    cse_thumbnail?: Array<{ src: string; width: string; height: string }>;
    metatags?: Array<Record<string, string>>;
    cse_image?: Array<{ src: string }>;
  };
}

export interface SearchParams {
  q: string;
  num?: number;
  start?: number;
  searchType?: 'web' | 'image';
  safe?: 'off' | 'active';
  lr?: string;
  gl?: string;
}

/**
 * Search Google using Custom Search API
 */
export async function googleSearch(params: SearchParams): Promise<{
  totalResults: string;
  searchTime: number;
  items: GoogleSearchItem[];
  nextStartIndex?: number;
}> {
  if (!GOOGLE_SEARCH_API_KEY) {
    throw new Error('GOOGLE_SEARCH_API_KEY chưa được cấu hình trong .env');
  }
  if (!GOOGLE_SEARCH_CX) {
    throw new Error('GOOGLE_SEARCH_CX chưa được cấu hình trong .env');
  }

  const searchParams: Record<string, string> = {
    key: GOOGLE_SEARCH_API_KEY,
    cx: GOOGLE_SEARCH_CX,
    q: params.q,
    num: String(params.num || 10),
  };

  if (params.start) searchParams.start = String(params.start);
  if (params.searchType === 'image') searchParams.searchType = 'image';
  if (params.safe) searchParams.safe = params.safe;
  if (params.lr) searchParams.lr = params.lr;
  if (params.gl) searchParams.gl = params.gl;

  debugLog('GOOGLE_SEARCH', `Searching: ${params.q}`);

  const result = await http
    .get(GOOGLE_SEARCH_API_BASE, { searchParams })
    .json<GoogleSearchResult>();

  return {
    totalResults: result.searchInformation.totalResults,
    searchTime: result.searchInformation.searchTime,
    items: result.items || [],
    nextStartIndex: result.queries.nextPage?.[0]?.startIndex,
  };
}
