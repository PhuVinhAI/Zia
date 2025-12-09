/**
 * Entertainment Module - Anime/Manga via Jikan API
 */
import { BaseModule, type ITool, type ModuleMetadata } from '../../core/index.js';
import { giphyGifTool } from './tools/giphyGif.js';
import { jikanCharactersTool } from './tools/jikanCharacters.js';
import { jikanDetailsTool } from './tools/jikanDetails.js';
import { jikanEpisodesTool } from './tools/jikanEpisodes.js';
import { jikanGenresTool } from './tools/jikanGenres.js';
import { jikanRecommendationsTool } from './tools/jikanRecommendations.js';
// Import tools
import { jikanSearchTool } from './tools/jikanSearch.js';
import { jikanSeasonTool } from './tools/jikanSeason.js';
import { jikanTopTool } from './tools/jikanTop.js';
import { nekosImagesTool } from './tools/nekosImages.js';

export class EntertainmentModule extends BaseModule {
  readonly metadata: ModuleMetadata = {
    name: 'entertainment',
    description: 'Anime/Manga information via Jikan API (MyAnimeList)',
    version: '1.0.0',
  };

  private _tools: ITool[] = [
    jikanSearchTool,
    jikanDetailsTool,
    jikanTopTool,
    jikanSeasonTool,
    jikanCharactersTool,
    jikanRecommendationsTool,
    jikanGenresTool,
    jikanEpisodesTool,
    nekosImagesTool,
    giphyGifTool,
  ];

  get tools(): ITool[] {
    return this._tools;
  }

  async onLoad(): Promise<void> {
    console.log(`[Entertainment] 🎬 Loading ${this._tools.length} entertainment tools`);
  }
}

// Export singleton instance
export const entertainmentModule = new EntertainmentModule();

// Re-export tools
export * from './tools/index.js';
