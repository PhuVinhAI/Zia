/**
 * Integration Test: Mention Parser
 * Test chức năng parse cú pháp [mention:ID:Name] trong shared message sender
 */

import { describe, test, expect } from 'bun:test';
import { parseMentions } from '../../../src/shared/utils/message/messageSender.js';

describe('Mention Parser Integration', () => {
  test('parseMentions - parse single mention với tên', () => {
    const input = 'Chào [mention:123456:Nguyễn Văn A] nhé!';
    const result = parseMentions(input);

    expect(result.text).toBe('Chào @Nguyễn Văn A nhé!');
    expect(result.mentions).toHaveLength(1);
    expect(result.mentions[0].uid).toBe('123456');
    expect(result.mentions[0].pos).toBe(5); // Vị trí của @
    // Độ dài "@Nguyễn Văn A" = 1 (@) + 12 (Nguyễn Văn A) = 13
    expect(result.mentions[0].len).toBe('@Nguyễn Văn A'.length);
  });

  test('parseMentions - parse mention không có tên (dùng ID)', () => {
    const input = 'Ê [mention:789012] ơi!';
    const result = parseMentions(input);

    expect(result.text).toBe('Ê @789012 ơi!');
    expect(result.mentions).toHaveLength(1);
    expect(result.mentions[0].uid).toBe('789012');
    expect(result.mentions[0].len).toBe(7); // Độ dài "@789012"
  });

  test('parseMentions - parse multiple mentions', () => {
    const input = 'Chào [mention:111:A] và [mention:222:B]!';
    const result = parseMentions(input);

    expect(result.text).toBe('Chào @A và @B!');
    expect(result.mentions).toHaveLength(2);

    expect(result.mentions[0].uid).toBe('111');
    expect(result.mentions[0].pos).toBe(5); // Vị trí @A
    expect(result.mentions[0].len).toBe(2); // "@A"

    expect(result.mentions[1].uid).toBe('222');
    // "Chào @A và @B!" - @B ở vị trí 11 (sau "Chào @A và ")
    expect(result.mentions[1].pos).toBe(11);
    expect(result.mentions[1].len).toBe(2); // "@B"
  });

  test('parseMentions - text không có mention', () => {
    const input = 'Đây là tin nhắn bình thường';
    const result = parseMentions(input);

    expect(result.text).toBe(input);
    expect(result.mentions).toHaveLength(0);
  });

  test('parseMentions - mention ở đầu text', () => {
    const input = '[mention:123:Admin] đã vào nhóm';
    const result = parseMentions(input);

    expect(result.text).toBe('@Admin đã vào nhóm');
    expect(result.mentions[0].pos).toBe(0);
  });

  test('parseMentions - mention ở cuối text', () => {
    const input = 'Hỏi [mention:456:Expert]';
    const result = parseMentions(input);

    expect(result.text).toBe('Hỏi @Expert');
    expect(result.mentions[0].pos).toBe(4);
  });

  test('parseMentions - mention với tên có dấu tiếng Việt', () => {
    const input = 'Chào [mention:999:Trần Thị Bích Ngọc]!';
    const result = parseMentions(input);

    expect(result.text).toBe('Chào @Trần Thị Bích Ngọc!');
    expect(result.mentions[0].uid).toBe('999');
  });

  test('parseMentions - nhiều mention liên tiếp', () => {
    const input = '[mention:1:A][mention:2:B][mention:3:C]';
    const result = parseMentions(input);

    expect(result.text).toBe('@A@B@C');
    expect(result.mentions).toHaveLength(3);
  });

  test('parseMentions - mention với ID dài', () => {
    const input = 'Tag [mention:7307295734920277074:Vinh] nè';
    const result = parseMentions(input);

    expect(result.text).toBe('Tag @Vinh nè');
    expect(result.mentions[0].uid).toBe('7307295734920277074');
  });

  test('parseMentions - không parse tag sai format', () => {
    const input = 'Đây là [mention:abc:Test] không hợp lệ'; // ID phải là số
    const result = parseMentions(input);

    // Không parse vì ID không phải số
    expect(result.text).toBe(input);
    expect(result.mentions).toHaveLength(0);
  });

  test('parseMentions - giữ nguyên text khác', () => {
    const input = 'Hello [mention:123:World]! How are you?';
    const result = parseMentions(input);

    expect(result.text).toBe('Hello @World! How are you?');
    // Kiểm tra phần text trước và sau mention vẫn nguyên vẹn
    expect(result.text.startsWith('Hello ')).toBe(true);
    expect(result.text.endsWith('! How are you?')).toBe(true);
  });
});
