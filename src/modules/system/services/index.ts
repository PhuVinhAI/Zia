/**
 * System Services - External API clients
 * 
 * Note: Some services have conflicting type names (SearchParams).
 * Import directly from specific files if you need those types.
 */

// Currency
export { convertCurrency } from './currencyClient.js';

// Document conversion
export { convertDocxToPdfLocal, convertDocxToPdfBase64Local } from './docxToPdfService.js';

// Text-to-speech
export { textToSpeech } from './elevenlabsClient.js';

// Image generation
export { generateSeedreamImage, getSeedreamTaskStatus, pollTaskUntilComplete } from './freepikClient.js';

// Web search
export { googleSearch } from './googleSearchClient.js';

// Steam
export { searchGames, getGameDetails, getTopGames } from './steamClient.js';

// Utility
export { generateQRCode, shortenUrl } from './utilityClient.js';

// Weather
export { getWeather } from './weatherClient.js';

// YouTube
export { searchYouTube, getVideoDetails, getChannelDetails } from './youtubeClient.js';
