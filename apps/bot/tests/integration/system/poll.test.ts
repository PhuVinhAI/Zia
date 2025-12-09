/**
 * Integration Test: Poll Tools
 * Test chức năng tạo, xem, vote và khóa bình chọn
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import {
  createPollTool,
  getPollDetailTool,
  lockPollTool,
  votePollTool,
} from '../../../src/modules/system/tools/poll.js';
import { mockToolContext } from '../setup.js';

// Mock data
const mockPollId = 123456;
const mockPollDetail = {
  poll_id: mockPollId,
  question: 'Trưa ăn gì?',
  options: [
    { option_id: 1001, content: 'Cơm', votes: 3, voters: ['user1', 'user2', 'user3'] },
    { option_id: 1002, content: 'Phở', votes: 2, voters: ['user4', 'user5'] },
    { option_id: 1003, content: 'Bún', votes: 0, voters: [] },
  ],
};

// Mock API
const createMockApi = () => ({
  createPoll: async (options: any, groupId: string) => ({
    poll_id: mockPollId,
    question: options.question,
  }),
  getPollDetail: async (pollId: number) => {
    if (pollId === mockPollId) return mockPollDetail;
    throw new Error('Poll not found');
  },
  votePoll: async (pollId: number, optionIds: number[]) => ({
    success: true,
    poll_id: pollId,
    voted: optionIds,
  }),
  lockPoll: async (pollId: number) => ({
    success: true,
    poll_id: pollId,
  }),
});

describe('Poll Tools Integration', () => {
  let mockApi: ReturnType<typeof createMockApi>;

  beforeEach(() => {
    mockApi = createMockApi();
  });

  // ═══════════════════════════════════════════════════
  // CREATE POLL
  // ═══════════════════════════════════════════════════

  describe('createPoll', () => {
    test('tạo poll thành công với options cơ bản', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: 'group-123' };

      const result = await createPollTool.execute(
        {
          question: 'Trưa ăn gì?',
          options: ['Cơm', 'Phở', 'Bún'],
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data.poll_id).toBe(mockPollId);
      expect(result.data.question).toBe('Trưa ăn gì?');
      expect(result.data.options).toEqual(['Cơm', 'Phở', 'Bún']);
      expect(result.data.hint).toContain('poll_id');
    });

    test('tạo poll với đầy đủ options', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: 'group-123' };

      const result = await createPollTool.execute(
        {
          question: 'Team building đi đâu?',
          options: ['Đà Lạt', 'Vũng Tàu'],
          allowMultiChoices: true,
          allowAddNewOption: true,
          hideVotePreview: true,
          isAnonymous: true,
          expiredTime: Date.now() + 86400000,
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data.poll_id).toBeDefined();
    });

    test('lỗi khi thiếu question', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: 'group-123' };

      const result = await createPollTool.execute(
        {
          options: ['A', 'B'],
        },
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('question');
    });

    test('lỗi khi options ít hơn 2', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: 'group-123' };

      const result = await createPollTool.execute(
        {
          question: 'Test?',
          options: ['Chỉ có 1'],
        },
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('2 lựa chọn');
    });

    test('lỗi khi options không phải array', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: 'group-123' };

      const result = await createPollTool.execute(
        {
          question: 'Test?',
          options: 'not an array',
        },
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('2 lựa chọn');
    });

    test('xử lý API error', async () => {
      const errorApi = {
        createPoll: async () => {
          throw new Error('Network error');
        },
      };
      const context = { ...mockToolContext, api: errorApi, threadId: 'group-123' };

      const result = await createPollTool.execute(
        {
          question: 'Test?',
          options: ['A', 'B'],
        },
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Lỗi tạo bình chọn');
    });
  });

  // ═══════════════════════════════════════════════════
  // GET POLL DETAIL
  // ═══════════════════════════════════════════════════

  describe('getPollDetail', () => {
    test('lấy chi tiết poll thành công', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: 'group-123' };

      const result = await getPollDetailTool.execute({ pollId: mockPollId }, context);

      expect(result.success).toBe(true);
      expect(result.data.poll_id).toBe(mockPollId);
      expect(result.data.question).toBe('Trưa ăn gì?');
      expect(result.data.options).toHaveLength(3);
      expect(result.data.summary).toContain('Cơm');
      expect(result.data.summary).toContain('option_id');
      expect(result.data.hint).toContain('votePoll');
    });

    test('lỗi khi thiếu pollId', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: 'group-123' };

      const result = await getPollDetailTool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('pollId');
    });

    test('lỗi khi poll không tồn tại', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: 'group-123' };

      const result = await getPollDetailTool.execute({ pollId: 999999 }, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Lỗi lấy chi tiết');
    });
  });

  // ═══════════════════════════════════════════════════
  // VOTE POLL
  // ═══════════════════════════════════════════════════

  describe('votePoll', () => {
    test('vote thành công với 1 option', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: 'group-123' };

      const result = await votePollTool.execute(
        {
          pollId: mockPollId,
          optionIds: [1001],
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data.poll_id).toBe(mockPollId);
      expect(result.data.voted_options).toEqual([1001]);
      expect(result.data.message).toContain('1 lựa chọn');
    });

    test('vote thành công với nhiều options', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: 'group-123' };

      const result = await votePollTool.execute(
        {
          pollId: mockPollId,
          optionIds: [1001, 1002],
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data.voted_options).toEqual([1001, 1002]);
      expect(result.data.message).toContain('2 lựa chọn');
    });

    test('lỗi khi thiếu pollId', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: 'group-123' };

      const result = await votePollTool.execute({ optionIds: [1001] }, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('pollId');
    });

    test('lỗi khi optionIds rỗng', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: 'group-123' };

      const result = await votePollTool.execute(
        {
          pollId: mockPollId,
          optionIds: [],
        },
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('option_id');
    });

    test('lỗi khi optionIds không phải array', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: 'group-123' };

      const result = await votePollTool.execute(
        {
          pollId: mockPollId,
          optionIds: 1001,
        },
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('option_id');
    });
  });

  // ═══════════════════════════════════════════════════
  // LOCK POLL
  // ═══════════════════════════════════════════════════

  describe('lockPoll', () => {
    test('khóa poll thành công', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: 'group-123' };

      const result = await lockPollTool.execute({ pollId: mockPollId }, context);

      expect(result.success).toBe(true);
      expect(result.data.poll_id).toBe(mockPollId);
      expect(result.data.message).toContain('khóa');
    });

    test('lỗi khi thiếu pollId', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: 'group-123' };

      const result = await lockPollTool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('pollId');
    });

    test('xử lý API error', async () => {
      const errorApi = {
        lockPoll: async () => {
          throw new Error('Permission denied');
        },
      };
      const context = { ...mockToolContext, api: errorApi, threadId: 'group-123' };

      const result = await lockPollTool.execute({ pollId: mockPollId }, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Lỗi khóa');
    });
  });
});
