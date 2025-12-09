/**
 * Character Card Module
 * Parse, validate, and manage character cards for roleplay
 */

// Types
export type {
  CharacterCard,
  CharacterSession,
  DepthPrompt,
  ParsedCharacter,
  RegexScriptData,
  V1CharData,
  V2CharData,
  V2CharDataExtensions,
  V2WorldInfoBook,
  V2WorldInfoEntry,
  V2WorldInfoEntryExtensions,
} from './types.js';

// Parser
export {
  fetchAndParseCharacterCard,
  hasCharacterData,
  parseCharacterData,
  parseFromJSON,
  parseFromPNG,
} from './parser.js';

// Validator
export {
  CharacterCardValidator,
  validateCharacterCard,
} from './validator.js';

// Prompt Builder
export {
  buildCharacterPrompt,
  buildCharacterSummary,
  getFirstMessage,
  getRandomGreeting,
} from './promptBuilder.js';

// Store
export {
  activateCharacter,
  CHARACTER_COMMANDS,
  clearAllSessions,
  deactivateCharacter,
  getActiveCharacter,
  getAllActiveSessions,
  getSessionStats,
  hasActiveCharacter,
  incrementMessageCount,
  parseCharacterCommand,
} from './store.js';
