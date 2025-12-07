/**
 * Agent Runner - Main loop cho background agent
 * Poll tasks từ DB, build context, gọi Groq để quyết định, execute actions
 * Sử dụng cơ chế tag [tool:xxx] giống Gemini để dễ mở rộng custom tools
 */
import { debugLog } from '../../core/logger/logger.js';
import { parseToolCalls } from '../../core/tool-registry/tool-registry.js';
import { type GroqMessage, generateGroqResponse } from '../../infrastructure/groq/groqClient.js';
import { executeTask } from './action.executor.js';
import { buildEnvironmentContext, formatContextForPrompt } from './context.builder.js';
import {
  getPendingTasks,
  markTaskCompleted,
  markTaskFailed,
  markTaskProcessing,
} from './task.repository.js';

// Agent state
let isRunning = false;
let pollInterval: ReturnType<typeof setInterval> | null = null;
let zaloApi: any = null;

// Config
const POLL_INTERVAL_MS = 90_000; // 1 phút 30 giây
const GROQ_ENABLED = true; // Set false để skip Groq và execute trực tiếp

/**
 * Khởi động background agent
 */
export function startBackgroundAgent(api: any): void {
  if (isRunning) {
    debugLog('AGENT', 'Agent already running');
    return;
  }

  zaloApi = api;
  isRunning = true;

  debugLog('AGENT', `Starting background agent (poll interval: ${POLL_INTERVAL_MS}ms)`);
  console.log('🤖 Background Agent started');

  // Run immediately, then poll
  runAgentCycle();
  pollInterval = setInterval(runAgentCycle, POLL_INTERVAL_MS);
}

/**
 * Dừng background agent
 */
export function stopBackgroundAgent(): void {
  if (!isRunning) return;

  isRunning = false;
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }

  debugLog('AGENT', 'Background agent stopped');
  console.log('🛑 Background Agent stopped');
}

/**
 * Main cycle - Poll và xử lý tasks
 */
async function runAgentCycle(): Promise<void> {
  if (!isRunning || !zaloApi) return;

  try {
    // 1. Auto-accept friend requests đang chờ
    await autoAcceptFriendRequests();

    // 2. Lấy pending tasks
    const tasks = await getPendingTasks(10);

    if (tasks.length === 0) {
      debugLog('AGENT', 'No pending tasks');
      return;
    }

    debugLog('AGENT', `Processing ${tasks.length} tasks in parallel`);

    // 3. Xử lý tất cả tasks song song với Groq
    await processTasksInParallel(tasks);
  } catch (error) {
    debugLog('AGENT', `Cycle error: ${error}`);
  }
}

/**
 * Tự động accept kết bạn (Phiên bản Fix Lỗi & Debug)
 * - Tách try-catch riêng cho getSentFriendRequest để xác định lỗi
 * - Check ID trước khi gọi acceptFriendRequest
 * - Delay ngẫu nhiên 3-7s để tránh rate limit
 * - Bắt lỗi 225 (đã là bạn bè)
 */
async function autoAcceptFriendRequests(): Promise<void> {
  try {
    // 1. Gọi API lấy danh sách (Bọc try-catch riêng để xác định lỗi do lấy list hay do accept)
    let pendingRequests;
    try {
      pendingRequests = await zaloApi.getSentFriendRequest();
    } catch (e: any) {
      // Nếu lỗi ngay bước này -> Thường do Cookie hoặc Network
      debugLog('AGENT', `⚠️ Lỗi khi lấy danh sách kết bạn: ${e.message}`);
      return;
    }

    if (!pendingRequests || typeof pendingRequests !== 'object') {
      return;
    }

    // Chuyển Object thành Array
    const requests = Object.values(pendingRequests) as any[];

    if (requests.length === 0) {
      return; // Không có ai thì thoát êm
    }

    debugLog('AGENT', `💌 Tìm thấy ${requests.length} lời mời kết bạn đang chờ...`);

    let acceptedCount = 0;

    // 2. Duyệt từng người
    for (const req of requests) {
      // --- FIX LỖI QUAN TRỌNG: CHECK ID ---
      // Đảm bảo ID tồn tại trước khi gọi hàm
      const uid = req.userId || req.uid || req.id;
      const name = req.displayName || req.zaloName || 'Người lạ';

      if (!uid) {
        debugLog('AGENT', `⚠️ Bỏ qua 1 lời mời do không tìm thấy ID (Data: ${JSON.stringify(req)})`);
        continue;
      }

      try {
        debugLog('AGENT', `👉 Đang đồng ý kết bạn với: ${name} (${uid})...`);

        // Gọi Accept
        await zaloApi.acceptFriendRequest(uid);
        debugLog('AGENT', `✅ Đã chấp nhận: ${name}`);
        acceptedCount++;

        // --- GỬI TIN NHẮN CHÀO MỪNG (Optional) ---
        // Giúp tăng tương tác ngay lập tức
        try {
          await zaloApi.sendMessage(
            `Chào ${name}! Mình là Zia (AI Bot), rất vui được kết bạn với bạn! ❤️`,
            uid,
          );
        } catch (msgErr) {
          /* Bỏ qua lỗi gửi tin */
        }

        // --- FIX LỖI SPAM: DELAY NGẪU NHIÊN ---
        // Nghỉ từ 3s đến 7s giữa mỗi người để Zalo không chặn
        const delay = Math.floor(Math.random() * 4000) + 3000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      } catch (error: any) {
        // Mã lỗi 225 = Đã là bạn bè rồi (API Zalo đôi khi vẫn trả về trong list pending dù đã accept)
        if (error.code === 225 || (error.message && error.message.includes('225'))) {
          debugLog('AGENT', `ℹ️ Đã là bạn bè với ${name}, bỏ qua.`);
        } else {
          debugLog('AGENT', `❌ Lỗi khi accept ${uid}: ${error.message}`);
        }
      }
    }

    if (acceptedCount > 0) {
      debugLog('AGENT', `🎉 Hoàn tất chu kỳ: Đã kết bạn với ${acceptedCount} người.`);
    }
  } catch (error: any) {
    // Lỗi tổng (Outer catch)
    debugLog('AGENT', `🔥 Critical Error trong auto-accept: ${error.message}`);
  }
}

/**
 * Xử lý tất cả tasks với 1 lần gọi Groq duy nhất
 */
async function processTasksInParallel(tasks: any[]): Promise<void> {
  // Build context chung (dùng context của task đầu tiên có targetUserId)
  const firstTaskWithUser = tasks.find((t) => t.targetUserId);
  const sharedContext = await buildEnvironmentContext(zaloApi, firstTaskWithUser?.targetUserId);

  // Gọi Groq 1 lần duy nhất cho tất cả tasks
  let decisions: Map<
    number,
    { action: 'execute' | 'skip' | 'delay'; reason: string; adjustedPayload?: any }
  >;

  if (GROQ_ENABLED && process.env.GROQ_API_KEY) {
    decisions = await getBatchGroqDecisions(tasks, sharedContext);
  } else {
    // Fallback: execute tất cả
    decisions = new Map(
      tasks.map((t) => [t.id, { action: 'execute' as const, reason: 'Groq disabled' }]),
    );
  }

  // Execute tất cả tasks song song
  await Promise.allSettled(
    tasks.map(async (task) => {
      const decision = decisions.get(task.id) || {
        action: 'execute' as const,
        reason: 'No decision',
      };
      await processTaskWithDecision(task, decision);
    }),
  );
}

/**
 * Xử lý một task với decision đã có từ Groq
 */
async function processTaskWithDecision(
  task: any,
  decision: { action: 'execute' | 'skip' | 'delay'; reason: string; adjustedPayload?: any },
): Promise<void> {
  debugLog('AGENT', `Processing task #${task.id}: ${task.type}`);

  try {
    // Mark as processing
    await markTaskProcessing(task.id);

    if (decision.action === 'skip') {
      debugLog('AGENT', `Task #${task.id} skipped: ${decision.reason}`);
      await markTaskCompleted(task.id, { skipped: true, reason: decision.reason });
      return;
    }

    if (decision.action === 'delay') {
      debugLog('AGENT', `Task #${task.id} delayed: ${decision.reason}`);
      // Reset về pending để retry sau
      await markTaskFailed(task.id, `Delayed: ${decision.reason}`, 0, task.maxRetries + 1);
      return;
    }

    // Merge adjusted payload nếu có
    let finalPayload = JSON.parse(task.payload);
    if (decision.adjustedPayload) {
      finalPayload = { ...finalPayload, ...decision.adjustedPayload };
    }

    // Execute task
    const result = await executeTask(zaloApi, { ...task, payload: JSON.stringify(finalPayload) });

    if (result.success) {
      await markTaskCompleted(task.id, result.data);
      debugLog('AGENT', `Task #${task.id} completed`);
    } else {
      await markTaskFailed(
        task.id,
        result.error || 'Unknown error',
        task.retryCount,
        task.maxRetries,
      );
      debugLog('AGENT', `Task #${task.id} failed: ${result.error}`);
    }
  } catch (error: any) {
    await markTaskFailed(task.id, error.message, task.retryCount, task.maxRetries);
    debugLog('AGENT', `Task #${task.id} error: ${error.message}`);
  }
}

/**
 * Gọi Groq 1 lần duy nhất để quyết định cho tất cả tasks
 */
async function getBatchGroqDecisions(
  tasks: any[],
  context: any,
): Promise<
  Map<number, { action: 'execute' | 'skip' | 'delay'; reason: string; adjustedPayload?: any }>
> {
  const contextStr = formatContextForPrompt(context);

  // Format tất cả tasks vào 1 prompt
  const tasksDescription = tasks
    .map((task, index) => {
      const payload = JSON.parse(task.payload);
      return `### Task ${index + 1} (ID: ${task.id})
- Loại: ${task.type}
- Target User: ${task.targetUserId || 'N/A'}
- Target Thread: ${task.targetThreadId || 'N/A'}
- Payload: ${JSON.stringify(payload)}
- Context: ${task.context || 'Không có'}`;
    })
    .join('\n\n');

  const batchSystemPrompt = `Bạn là một AI assistant chạy nền, nhiệm vụ của bạn là xử lý NHIỀU tasks cùng lúc.

## CÁCH TRẢ LỜI:
Với MỖI task, sử dụng tool tag với task_id:
[tool:decide task_id="<ID>" action="execute|skip|delay" reason="Lý do"]

Nếu cần điều chỉnh message:
[tool:decide task_id="<ID>" action="execute" reason="Lý do"]{"message": "Nội dung mới"}[/tool]

## QUY TẮC:
- LUÔN execute task ngay, không delay vì online/offline
- Hệ thống TỰ ĐỘNG accept friend requests
- Điều chỉnh tone dựa trên giới tính
- Trả lời cho TẤT CẢ tasks trong 1 response`;

  const userPrompt = `
## Danh sách ${tasks.length} tasks cần xử lý:

${tasksDescription}

${contextStr}

Hãy phân tích và sử dụng [tool:decide] cho TỪNG task (theo task_id).`;

  const messages: GroqMessage[] = [
    { role: 'system', content: batchSystemPrompt },
    { role: 'user', content: userPrompt },
  ];

  try {
    const response = await generateGroqResponse(messages, { temperature: 0.3 });
    debugLog('AGENT', `Groq batch response: ${response.substring(0, 300)}...`);

    return parseBatchDecisions(response, tasks);
  } catch (error) {
    debugLog('AGENT', `Groq batch error: ${error}`);
    // Fallback: execute tất cả
    return new Map(tasks.map((t) => [t.id, { action: 'execute' as const, reason: 'Groq error' }]));
  }
}

/**
 * Parse decisions cho nhiều tasks từ 1 response
 */
function parseBatchDecisions(
  response: string,
  tasks: any[],
): Map<number, { action: 'execute' | 'skip' | 'delay'; reason: string; adjustedPayload?: any }> {
  const decisions = new Map<
    number,
    { action: 'execute' | 'skip' | 'delay'; reason: string; adjustedPayload?: any }
  >();

  // Parse tất cả tool calls
  const toolCalls = parseToolCalls(response);
  const decideCalls = toolCalls.filter((call) => call.toolName === 'decide');

  for (const call of decideCalls) {
    const taskId = Number.parseInt(call.params.task_id, 10);
    if (Number.isNaN(taskId)) continue;

    decisions.set(taskId, {
      action: call.params.action || 'execute',
      reason: call.params.reason || 'No reason',
      adjustedPayload: call.params.message ? { message: call.params.message } : undefined,
    });
  }

  // Fallback cho tasks không có decision
  for (const task of tasks) {
    if (!decisions.has(task.id)) {
      decisions.set(task.id, { action: 'execute', reason: 'No decision from Groq' });
    }
  }

  debugLog('AGENT', `Parsed ${decisions.size} decisions from batch response`);
  return decisions;
}

/**
 * Check agent status
 */
export function isAgentRunning(): boolean {
  return isRunning;
}
