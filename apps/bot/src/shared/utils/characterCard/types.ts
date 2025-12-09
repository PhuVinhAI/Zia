/**
 * Character Card Types - Định nghĩa kiểu dữ liệu cho Character Card
 * Hỗ trợ V1, V2, V3 spec
 * @link https://github.com/malfoyslastname/character-card-spec-v2
 */

// ═══════════════════════════════════════════════════
// V2 WORLD INFO TYPES
// ═══════════════════════════════════════════════════

export interface V2WorldInfoEntryExtensions {
  position?: number;
  exclude_recursion?: boolean;
  probability?: number;
  useProbability?: boolean;
  depth?: number;
  selectiveLogic?: number;
  group?: string;
  group_override?: boolean;
  group_weight?: number;
  prevent_recursion?: boolean;
  delay_until_recursion?: boolean;
  scan_depth?: number;
  match_whole_words?: boolean;
  use_group_scoring?: boolean;
  case_sensitive?: boolean;
  automation_id?: string;
  role?: number;
  vectorized?: boolean;
  display_index?: number;
}

export interface V2WorldInfoEntry {
  keys: string[];
  secondary_keys?: string[];
  comment?: string;
  content: string;
  constant?: boolean;
  selective?: boolean;
  insertion_order?: number;
  enabled?: boolean;
  position?: string;
  extensions?: V2WorldInfoEntryExtensions;
  id?: number;
}

export interface V2WorldInfoBook {
  name?: string;
  entries: V2WorldInfoEntry[];
  extensions?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════
// CHARACTER DATA EXTENSIONS
// ═══════════════════════════════════════════════════

export interface DepthPrompt {
  depth?: number;
  prompt?: string;
  role?: 'system' | 'user' | 'assistant';
}

export interface RegexScriptData {
  id?: string;
  scriptName?: string;
  findRegex?: string;
  replaceString?: string;
  trimStrings?: string[];
  placement?: number[];
  disabled?: boolean;
  markdownOnly?: boolean;
  promptOnly?: boolean;
  runOnEdit?: boolean;
  substituteRegex?: number;
  minDepth?: number;
  maxDepth?: number;
}

export interface V2CharDataExtensions {
  talkativeness?: number;
  fav?: boolean;
  world?: string;
  depth_prompt?: DepthPrompt;
  regex_scripts?: RegexScriptData[];
  // Non-standard extensions
  pygmalion_id?: string;
  github_repo?: string;
  source_url?: string;
  chub?: { full_path: string };
  risuai?: { source: string[] };
  sd_character_prompt?: { positive: string; negative: string };
  [key: string]: unknown;
}

// ═══════════════════════════════════════════════════
// V2 CHARACTER DATA
// ═══════════════════════════════════════════════════

export interface V2CharData {
  name: string;
  description: string;
  character_version?: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  creator_notes?: string;
  tags?: string[];
  system_prompt?: string;
  post_history_instructions?: string;
  creator?: string;
  alternate_greetings?: string[];
  character_book?: V2WorldInfoBook;
  extensions?: V2CharDataExtensions;
}

// ═══════════════════════════════════════════════════
// V1 CHARACTER DATA (Legacy)
// ═══════════════════════════════════════════════════

export interface V1CharData {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  creatorcomment?: string;
  tags?: string[];
  talkativeness?: number;
  fav?: boolean | string;
  create_date?: string;
  data?: V2CharData; // V2 extension
}

// ═══════════════════════════════════════════════════
// CHARACTER CARD (Unified)
// ═══════════════════════════════════════════════════

export interface CharacterCard {
  spec?: 'chara_card_v2' | 'chara_card_v3';
  spec_version?: string;
  data: V2CharData;
}

// ═══════════════════════════════════════════════════
// PARSED CHARACTER (Normalized)
// ═══════════════════════════════════════════════════

export interface ParsedCharacter {
  // Basic info
  name: string;
  description: string;
  personality: string;
  scenario: string;
  firstMessage: string;
  exampleMessages: string;
  
  // Optional info
  creatorNotes?: string;
  systemPrompt?: string;
  postHistoryInstructions?: string;
  alternateGreetings?: string[];
  tags?: string[];
  creator?: string;
  characterVersion?: string;
  
  // Extensions
  talkativeness?: number;
  depthPrompt?: DepthPrompt;
  worldInfo?: V2WorldInfoBook;
  
  // Metadata
  specVersion: 1 | 2 | 3;
  rawData: V1CharData | CharacterCard;
}

// ═══════════════════════════════════════════════════
// ACTIVE CHARACTER SESSION
// ═══════════════════════════════════════════════════

export interface CharacterSession {
  character: ParsedCharacter;
  activatedAt: number;
  activatedBy: string; // userId
  messageCount: number;
  imageUrl?: string; // URL của ảnh character card
}
