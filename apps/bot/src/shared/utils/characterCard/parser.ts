/**
 * Character Card Parser
 * Parse character card data from PNG metadata or JSON
 */

import { debugLog } from '../../../core/logger/logger.js';
import type { CharacterCard, ParsedCharacter, V1CharData, V2CharData } from './types.js';
import { CharacterCardValidator } from './validator.js';

// PNG chunk types
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * Extract tEXt chunks from PNG buffer
 */
function extractTextChunks(buffer: Buffer): Map<string, string> {
  const chunks = new Map<string, string>();
  
  // Verify PNG signature
  for (let i = 0; i < 8; i++) {
    if (buffer[i] !== PNG_SIGNATURE[i]) {
      throw new Error('Invalid PNG signature');
    }
  }

  let offset = 8; // Skip signature

  while (offset < buffer.length) {
    // Read chunk length (4 bytes, big-endian)
    const length = buffer.readUInt32BE(offset);
    offset += 4;

    // Read chunk type (4 bytes)
    const type = buffer.toString('ascii', offset, offset + 4);
    offset += 4;

    // Read chunk data
    const data = buffer.subarray(offset, offset + length);
    offset += length;

    // Skip CRC (4 bytes)
    offset += 4;

    // Process tEXt chunks
    if (type === 'tEXt') {
      // tEXt format: keyword\0text
      const nullIndex = data.indexOf(0);
      if (nullIndex > 0) {
        const keyword = data.toString('ascii', 0, nullIndex);
        const text = data.toString('ascii', nullIndex + 1);
        chunks.set(keyword.toLowerCase(), text);
      }
    }

    // Stop at IEND
    if (type === 'IEND') break;
  }

  return chunks;
}

/**
 * Parse character card from PNG buffer
 */
export function parseFromPNG(buffer: Buffer): ParsedCharacter | null {
  try {
    const chunks = extractTextChunks(buffer);
    
    // Try ccv3 first (V3 spec)
    let jsonData: string | undefined;
    
    if (chunks.has('ccv3')) {
      jsonData = Buffer.from(chunks.get('ccv3')!, 'base64').toString('utf8');
      debugLog('CHAR_CARD', 'Found ccv3 chunk');
    } else if (chunks.has('chara')) {
      jsonData = Buffer.from(chunks.get('chara')!, 'base64').toString('utf8');
      debugLog('CHAR_CARD', 'Found chara chunk');
    }

    if (!jsonData) {
      debugLog('CHAR_CARD', 'No character data found in PNG');
      return null;
    }

    const cardData = JSON.parse(jsonData);
    return parseCharacterData(cardData);
  } catch (error: any) {
    debugLog('CHAR_CARD', `Failed to parse PNG: ${error.message}`);
    return null;
  }
}

/**
 * Parse character card from JSON string
 */
export function parseFromJSON(json: string): ParsedCharacter | null {
  try {
    const cardData = JSON.parse(json);
    return parseCharacterData(cardData);
  } catch (error: any) {
    debugLog('CHAR_CARD', `Failed to parse JSON: ${error.message}`);
    return null;
  }
}

/**
 * Parse and normalize character data from any format
 */
export function parseCharacterData(data: any): ParsedCharacter | null {
  const validator = new CharacterCardValidator(data);
  const version = validator.validate();

  if (version === false) {
    debugLog('CHAR_CARD', `Validation failed: ${validator.error}`);
    return null;
  }

  debugLog('CHAR_CARD', `Detected spec version: V${version}`);

  switch (version) {
    case 1:
      return normalizeV1(data as V1CharData);
    case 2:
    case 3:
      return normalizeV2V3(data as CharacterCard, version);
    default:
      return null;
  }
}

/**
 * Normalize V1 character data
 */
function normalizeV1(card: V1CharData): ParsedCharacter {
  // V1 might have V2 data embedded
  if (card.data) {
    return normalizeV2V3({ data: card.data } as CharacterCard, 2);
  }

  return {
    name: card.name,
    description: card.description,
    personality: card.personality,
    scenario: card.scenario,
    firstMessage: card.first_mes,
    exampleMessages: card.mes_example,
    creatorNotes: card.creatorcomment,
    tags: card.tags,
    talkativeness: card.talkativeness,
    specVersion: 1,
    rawData: card,
  };
}

/**
 * Normalize V2/V3 character data
 */
function normalizeV2V3(card: CharacterCard, version: 2 | 3): ParsedCharacter {
  const data = card.data;

  return {
    name: data.name,
    description: data.description,
    personality: data.personality,
    scenario: data.scenario,
    firstMessage: data.first_mes,
    exampleMessages: data.mes_example,
    creatorNotes: data.creator_notes,
    systemPrompt: data.system_prompt,
    postHistoryInstructions: data.post_history_instructions,
    alternateGreetings: data.alternate_greetings,
    tags: data.tags,
    creator: data.creator,
    characterVersion: data.character_version,
    talkativeness: data.extensions?.talkativeness,
    depthPrompt: data.extensions?.depth_prompt,
    worldInfo: data.character_book,
    specVersion: version,
    rawData: card,
  };
}

/**
 * Check if a buffer is a valid PNG with character data
 */
export function hasCharacterData(buffer: Buffer): boolean {
  try {
    const chunks = extractTextChunks(buffer);
    return chunks.has('ccv3') || chunks.has('chara');
  } catch {
    return false;
  }
}

/**
 * Fetch and parse character card from URL
 */
export async function fetchAndParseCharacterCard(url: string): Promise<ParsedCharacter | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      debugLog('CHAR_CARD', `Failed to fetch: ${response.status}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    return parseFromPNG(buffer);
  } catch (error: any) {
    debugLog('CHAR_CARD', `Failed to fetch and parse: ${error.message}`);
    return null;
  }
}
