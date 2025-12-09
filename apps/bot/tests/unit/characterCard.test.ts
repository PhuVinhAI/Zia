/**
 * Character Card Parser Tests
 */

import { describe, expect, it } from 'bun:test';
import {
  CharacterCardValidator,
  parseCharacterData,
  buildCharacterPrompt,
  buildCharacterSummary,
  getFirstMessage,
} from '../../src/shared/utils/characterCard/index.js';

describe('CharacterCardValidator', () => {
  it('should validate V1 character card', () => {
    const v1Card = {
      name: 'Test Character',
      description: 'A test character',
      personality: 'Friendly',
      scenario: 'Test scenario',
      first_mes: 'Hello!',
      mes_example: '<START>\n{{user}}: Hi\n{{char}}: Hello!',
    };

    const validator = new CharacterCardValidator(v1Card);
    expect(validator.validate()).toBe(1);
  });

  it('should validate V2 character card', () => {
    const v2Card = {
      spec: 'chara_card_v2',
      spec_version: '2.0',
      data: {
        name: 'Test Character',
        description: 'A test character',
        personality: 'Friendly',
        scenario: 'Test scenario',
        first_mes: 'Hello!',
        mes_example: '<START>\n{{user}}: Hi\n{{char}}: Hello!',
        creator_notes: 'Test notes',
        system_prompt: '',
        post_history_instructions: '',
        alternate_greetings: [],
        tags: ['test'],
        creator: 'Tester',
        character_version: '1.0',
        extensions: {},
      },
    };

    const validator = new CharacterCardValidator(v2Card);
    expect(validator.validate()).toBe(2);
  });

  it('should validate V3 character card', () => {
    const v3Card = {
      spec: 'chara_card_v3',
      spec_version: '3.0',
      data: {
        name: 'Test Character',
        description: 'A test character',
      },
    };

    const validator = new CharacterCardValidator(v3Card);
    expect(validator.validate()).toBe(3);
  });

  it('should reject invalid card', () => {
    const invalidCard = {
      foo: 'bar',
    };

    const validator = new CharacterCardValidator(invalidCard);
    expect(validator.validate()).toBe(false);
  });
});

describe('parseCharacterData', () => {
  it('should parse V1 card', () => {
    const v1Card = {
      name: 'Test Character',
      description: 'A test character',
      personality: 'Friendly',
      scenario: 'Test scenario',
      first_mes: 'Hello {{user}}!',
      mes_example: '<START>\n{{user}}: Hi\n{{char}}: Hello!',
    };

    const parsed = parseCharacterData(v1Card);
    expect(parsed).not.toBeNull();
    expect(parsed?.name).toBe('Test Character');
    expect(parsed?.specVersion).toBe(1);
  });

  it('should parse V2 card', () => {
    const v2Card = {
      spec: 'chara_card_v2',
      spec_version: '2.0',
      data: {
        name: 'Test Character V2',
        description: 'A V2 test character',
        personality: 'Friendly',
        scenario: 'Test scenario',
        first_mes: 'Hello {{user}}!',
        mes_example: '<START>',
        creator_notes: 'Notes',
        system_prompt: 'Be helpful',
        post_history_instructions: '',
        alternate_greetings: ['Hi there!', 'Greetings!'],
        tags: ['test', 'v2'],
        creator: 'Tester',
        character_version: '2.0',
        extensions: {
          talkativeness: 0.8,
        },
      },
    };

    const parsed = parseCharacterData(v2Card);
    expect(parsed).not.toBeNull();
    expect(parsed?.name).toBe('Test Character V2');
    expect(parsed?.specVersion).toBe(2);
    expect(parsed?.alternateGreetings).toHaveLength(2);
    expect(parsed?.talkativeness).toBe(0.8);
  });
});

describe('buildCharacterPrompt', () => {
  it('should build prompt from parsed character', () => {
    const v1Card = {
      name: 'Test Character',
      description: 'A friendly test character',
      personality: 'Friendly and helpful',
      scenario: 'In a test environment',
      first_mes: 'Hello!',
      mes_example: '<START>\n{{user}}: Hi\n{{char}}: Hello!',
    };
    
    const character = parseCharacterData(v1Card);
    expect(character).not.toBeNull();
    
    const prompt = buildCharacterPrompt(character!);
    expect(prompt).toContain('Test Character');
    expect(prompt).toContain('A friendly test character');
    expect(prompt).toContain('Friendly and helpful');
  });
});

describe('buildCharacterSummary', () => {
  it('should build summary', () => {
    const v2Card = {
      spec: 'chara_card_v2',
      spec_version: '2.0',
      data: {
        name: 'Test Character',
        description: 'A friendly test character with a long description',
        personality: 'Friendly',
        scenario: '',
        first_mes: '',
        mes_example: '',
        creator_notes: '',
        system_prompt: '',
        post_history_instructions: '',
        alternate_greetings: [],
        tags: ['test', 'friendly', 'helpful'],
        creator: 'Tester',
        character_version: '1.0',
        extensions: {},
      },
    };

    const character = parseCharacterData(v2Card);
    expect(character).not.toBeNull();
    
    const summary = buildCharacterSummary(character!);
    expect(summary).toContain('Test Character');
    expect(summary).toContain('test');
    expect(summary).toContain('Tester');
  });
});

describe('getFirstMessage', () => {
  it('should replace placeholders', () => {
    const v1Card = {
      name: 'Alice',
      description: '',
      personality: '',
      scenario: '',
      first_mes: 'Hello {{user}}! I am {{char}}.',
      mes_example: '',
    };

    const character = parseCharacterData(v1Card);
    expect(character).not.toBeNull();
    
    const message = getFirstMessage(character!, 'Bob');
    expect(message).toBe('Hello Bob! I am Alice.');
  });

  it('should use default for missing username', () => {
    const v1Card = {
      name: 'Alice',
      description: '',
      personality: '',
      scenario: '',
      first_mes: 'Hello {{user}}!',
      mes_example: '',
    };

    const character = parseCharacterData(v1Card);
    expect(character).not.toBeNull();
    
    const message = getFirstMessage(character!);
    expect(message).toBe('Hello bạn!');
  });
});
