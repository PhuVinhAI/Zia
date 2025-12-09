/**
 * Character Card Validator
 * Validates character card data structure
 * Supports V1, V2, V3 specs
 */

import type { CharacterCard, V1CharData } from './types.js';

export class CharacterCardValidator {
  private lastValidationError: string | null = null;
  private card: any;

  constructor(card: any) {
    this.card = card;
  }

  /**
   * Get the field that caused validation to fail
   */
  get error(): string | null {
    return this.lastValidationError;
  }

  /**
   * Validate against V1, V2, or V3 spec
   * @returns Spec version number (1, 2, 3) or false if invalid
   */
  validate(): 1 | 2 | 3 | false {
    this.lastValidationError = null;

    if (this.validateV3()) return 3;
    if (this.validateV2()) return 2;
    if (this.validateV1()) return 1;

    return false;
  }

  /**
   * Validate V1 spec (legacy TavernAI format)
   */
  validateV1(): boolean {
    const requiredFields = ['name', 'description', 'personality', 'scenario', 'first_mes', 'mes_example'];
    
    return requiredFields.every(field => {
      if (!Object.hasOwn(this.card, field)) {
        this.lastValidationError = field;
        return false;
      }
      return true;
    });
  }

  /**
   * Validate V2 spec
   */
  validateV2(): boolean {
    return this.validateSpecV2() 
      && this.validateSpecVersionV2() 
      && this.validateDataV2() 
      && this.validateCharacterBookV2();
  }

  /**
   * Validate V3 spec
   */
  validateV3(): boolean {
    return this.validateSpecV3() 
      && this.validateSpecVersionV3() 
      && this.validateDataV3();
  }

  // ═══════════════════════════════════════════════════
  // V2 VALIDATION HELPERS
  // ═══════════════════════════════════════════════════

  private validateSpecV2(): boolean {
    if (this.card.spec !== 'chara_card_v2') {
      this.lastValidationError = 'spec';
      return false;
    }
    return true;
  }

  private validateSpecVersionV2(): boolean {
    if (this.card.spec_version !== '2.0') {
      this.lastValidationError = 'spec_version';
      return false;
    }
    return true;
  }

  private validateDataV2(): boolean {
    const data = this.card.data;

    if (!data) {
      this.lastValidationError = 'No character data found';
      return false;
    }

    // Required fields for V2
    const requiredFields = [
      'name', 'description', 'personality', 'scenario', 
      'first_mes', 'mes_example', 'creator_notes', 'system_prompt',
      'post_history_instructions', 'alternate_greetings', 'tags', 
      'creator', 'character_version', 'extensions'
    ];

    const hasAllFields = requiredFields.every(field => {
      if (!Object.hasOwn(data, field)) {
        this.lastValidationError = `data.${field}`;
        return false;
      }
      return true;
    });

    if (!hasAllFields) return false;

    // Type checks
    if (!Array.isArray(data.alternate_greetings)) {
      this.lastValidationError = 'data.alternate_greetings must be array';
      return false;
    }

    if (!Array.isArray(data.tags)) {
      this.lastValidationError = 'data.tags must be array';
      return false;
    }

    if (typeof data.extensions !== 'object') {
      this.lastValidationError = 'data.extensions must be object';
      return false;
    }

    return true;
  }

  private validateCharacterBookV2(): boolean {
    const characterBook = this.card.data?.character_book;

    // Character book is optional
    if (!characterBook) return true;

    const requiredFields = ['extensions', 'entries'];
    const hasAllFields = requiredFields.every(field => {
      if (!Object.hasOwn(characterBook, field)) {
        this.lastValidationError = `data.character_book.${field}`;
        return false;
      }
      return true;
    });

    if (!hasAllFields) return false;

    if (!Array.isArray(characterBook.entries)) {
      this.lastValidationError = 'data.character_book.entries must be array';
      return false;
    }

    if (typeof characterBook.extensions !== 'object') {
      this.lastValidationError = 'data.character_book.extensions must be object';
      return false;
    }

    return true;
  }

  // ═══════════════════════════════════════════════════
  // V3 VALIDATION HELPERS
  // ═══════════════════════════════════════════════════

  private validateSpecV3(): boolean {
    if (this.card.spec !== 'chara_card_v3') {
      this.lastValidationError = 'spec';
      return false;
    }
    return true;
  }

  private validateSpecVersionV3(): boolean {
    const version = Number(this.card.spec_version);
    if (version < 3.0 || version >= 4.0) {
      this.lastValidationError = 'spec_version';
      return false;
    }
    return true;
  }

  private validateDataV3(): boolean {
    const data = this.card.data;

    if (!data || typeof data !== 'object') {
      this.lastValidationError = 'No character data found';
      return false;
    }

    // V3 requires at least name
    if (!data.name || typeof data.name !== 'string') {
      this.lastValidationError = 'data.name';
      return false;
    }

    return true;
  }
}

/**
 * Quick validation helper
 */
export function validateCharacterCard(card: any): { valid: boolean; version: 1 | 2 | 3 | false; error?: string } {
  const validator = new CharacterCardValidator(card);
  const version = validator.validate();
  
  return {
    valid: version !== false,
    version,
    error: validator.error || undefined
  };
}
