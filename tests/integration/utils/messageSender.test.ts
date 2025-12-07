/**
 * Integration Test: Message Sender
 * Test shared module gửi tin nhắn với hỗ trợ mention/tag
 */

import { describe, test, expect } from 'bun:test';
import {
  parseMentions,
  getThreadType,
  setThreadType,
  type MentionInfo,
} from '../../../src/shared/utils/message/messageSender.js';

describe('Message Sender - parseMentions', () => {
  test('parse single mention với tên', () => {
    const input = 'Chào [mention:123456:Nguyễn Văn A] nhé!';
    const result = parseMentions(input);

    expect(result.text).toBe('Chào @Nguyễn Văn A nhé!');
    expect(result.mentions).toHaveLength(1);
    expect(result.mentions[0].uid).toBe('123456');
    expect(result.mentions[0].pos).toBe(5);
    expect(result.mentions[0].len).toBe('@Nguyễn Văn A'.length);
  });

  test('parse mention không có tên (dùng ID)', () => {
    const input = 'Ê [mention:789012] ơi!';
    const result = parseMentions(input);

    expect(result.text).toBe('Ê @789012 ơi!');
    expect(result.mentions).toHaveLength(1);
    expect(result.mentions[0].uid).toBe('789012');
    expect(result.mentions[0].len).toBe(7);
  });

  test('parse multiple mentions', () => {
    const input = 'Chào [mention:111:A] và [mention:222:B]!';
    const result = parseMentions(input);

    expect(result.text).toBe('Chào @A và @B!');
    expect(result.mentions).toHaveLength(2);
    expect(result.mentions[0].uid).toBe('111');
    expect(result.mentions[1].uid).toBe('222');
  });

  test('text không có mention', () => {
    const input = 'Đây là tin nhắn bình thường';
    const result = parseMentions(input);

    expect(result.text).toBe(input);
    expect(result.mentions).toHaveLength(0);
  });

  test('mention với ID dài (Zalo user ID)', () => {
    const input = 'Tag [mention:7307295734920277074:Vinh] nè';
    const result = parseMentions(input);

    expect(result.text).toBe('Tag @Vinh nè');
    expect(result.mentions[0].uid).toBe('7307295734920277074');
  });

  test('không parse tag sai format (ID không phải số)', () => {
    const input = 'Đây là [mention:abc:Test] không hợp lệ';
    const result = parseMentions(input);

    expect(result.text).toBe(input);
    expect(result.mentions).toHaveLength(0);
  });
});

describe('Message Sender - ThreadType Store', () => {
  test('setThreadType và getThreadType', () => {
    const threadId = 'test-thread-123';

    // Default là User (0)
    expect(getThreadType(threadId)).toBe(0);

    // Set thành Group (1)
    setThreadType(threadId, 1);
    expect(getThreadType(threadId)).toBe(1);

    // Set lại thành User (0)
    setThreadType(threadId, 0);
    expect(getThreadType(threadId)).toBe(0);
  });

  test('các thread khác nhau có type riêng', () => {
    const thread1 = 'thread-1';
    const thread2 = 'thread-2';

    setThreadType(thread1, 1); // Group
    setThreadType(thread2, 0); // User

    expect(getThreadType(thread1)).toBe(1);
    expect(getThreadType(thread2)).toBe(0);
  });
});
