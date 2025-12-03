/**
 * Entertainment Module - Jikan API (MyAnimeList) Tools
 */
export { jikanSearchTool } from "./tools/jikanSearch.js";
export { jikanDetailsTool } from "./tools/jikanDetails.js";
export { jikanTopTool } from "./tools/jikanTop.js";
export { jikanSeasonTool } from "./tools/jikanSeason.js";
export { jikanCharactersTool } from "./tools/jikanCharacters.js";
export { jikanRecommendationsTool } from "./tools/jikanRecommendations.js";
export { jikanGenresTool } from "./tools/jikanGenres.js";
export { jikanEpisodesTool } from "./tools/jikanEpisodes.js";

// Module metadata
export const EntertainmentModule = {
  name: "Entertainment",
  description: "Anime/Manga information via Jikan API",
};
