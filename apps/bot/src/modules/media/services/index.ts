/**
 * Media Services
 */
export { convertDocxToPdfBase64Local, convertDocxToPdfLocal } from './docxToPdfService.js';
export {
  DEFAULT_PITCH,
  DEFAULT_RATE,
  DEFAULT_VOICE,
  DEFAULT_VOLUME,
  OUTPUT_FORMATS,
  textToSpeech,
} from './edgeTtsClient.js';
export {
  generateSeedreamImage,
  getSeedreamTaskStatus,
  pollTaskUntilComplete,
} from './freepikClient.js';
