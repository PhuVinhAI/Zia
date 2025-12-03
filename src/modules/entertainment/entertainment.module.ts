/**
 * Entertainment Module - Anime/Manga via Jikan API
 */
import {
  BaseModule,
  type ITool,
  type ModuleMetadata,
} from "../../core/index.js";

// Import tools
import { jikanSearchTool } from "./tools/jikanSearch.js";
import { jikanDetailsTool } from "./tools/jikanDetails.js";
import { jikanTopTool } from "./tools/jikanTop.js";
import { jikanSeasonTool } from "./tools/jikanSeason.js";
import { jikanCharactersTool } from "./tools/jikanCharacters.js";
import { jikanRecommendationsTool } from "./tools/jikanRecommendations.js";
import { jikanGenresTool } from "./tools/jikanGenres.js";
import { jikanEpisodesTool } from "./tools/jikanEpisodes.js";

export class EntertainmentModule extends BaseModule {
  readonly metadata: ModuleMetadata = {
    name: "entertainment",
    description: "Anime/Manga information via Jikan API (MyAnimeList)",
    version: "1.0.0",
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
  ];

  get tools(): ITool[] {
    return this._tools;
  }

  async onLoad(): Promise<void> {
    console.log(`[Entertainment] 🎬 Loading ${this._tools.length} Jikan tools`);
  }
}

// Export singleton instance
export const entertainmentModule = new EntertainmentModule();

// Re-export tools
export * from "./tools/index.js";
