/**
 * Agent Runner - Main loop cho background agent
 * Poll tasks từ DB, build context, gọi Groq để quyết định, execute actions
 * Sử dụng cơ chế tag [tool:xxx] giống Gemini để dễ mở rộng custom tools
 */
import { debugLog } from '../../core/logger/logger.js';
import { parseToolCalls } from '../../core/tool-registry/tool-registry.js';
import { generateGroqResponse, type GroqMessage } from '../../infrastructure/groq/groqClient.js';
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
 * System prompt cho background agent
 * Sử dụng cơ chế tag giống Gemini
 */
const AGENT_SYSTEM_PROMPT = `Bạn là một AI assistant chạy nền, nhiệm vụ của bạn là thực hiện các tasks được giao một cách thông minh.

Với mỗi task, bạn sẽ nhận được:
1. Thông tin task (loại, target, payload)
2. Ngữ cảnh môi trường (ai online, friend requests, memories)

## CÁCH TRẢ LỜI:
Sử dụng tool tags để ra quyết định:

1. Execute task ngay:
[tool:decide action="execute" reason="Lý do"]

2. Skip task (không thực hiện):
[tool:decide action="skip" reason="Lý do"]

3. Delay task (thực hiện sau):
[tool:decide action="delay" reason="Lý do"]

4. Execute với payload đã điều chỉnh:
[tool:decide action="execute" reason="Lý do"]{"message": "Nội dung đã chỉnh sửa"}[/tool]

## QUY TẮC:
- LUÔN execute task ngay lập tức, không delay vì lý do online/offline
- Hệ thống TỰ ĐỘNG accept friend requests, không cần task accept_friend
- Điều chỉnh tone dựa trên giới tính và context
- Luôn giải thích lý do quyết định trong reason`;

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
 * Tự động accept tất cả friend requests đang chờ (tuần tự, từng cái một)
 */
async function autoAcceptFriendRequests(): Promise<void> {
  try {
    // Lấy danh sách friend requests đang chờ (người khác gửi cho mình)
    const pendingRequests = await zaloApi.getReceivedFriendRequests?.();

    if (!pendingRequests || Object.keys(pendingRequests).length === 0) {
      debugLog('AGENT', 'No pending friend requests');
      return;
    }

    const requests = Object.values(pendingRequests) as any[];
    debugLog('AGENT', `Found ${requests.length} pending friend requests, auto-accepting...`);

    // Accept tuần tự từng cái một (tránh rate limit)
    let accepted = 0;
    for (const req of requests) {
      try {
        await zaloApi.acceptFriendRequest(req.userId);
        debugLog('AGENT', `Accepted friend request from ${req.displayName || req.userId}`);
        accepted++;
        // Delay 1s giữa mỗi request để tránh spam
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error: any) {
        debugLog('AGENT', `Failed to accept friend from ${req.userId}: ${error.message}`);
      }
    }

    debugLog('AGENT', `Auto-accepted ${accepted}/${requests.length} friend requests`);
  } catch (error) {
    debugLog('AGENT', `Error auto-accepting friends: ${error}`);
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
  let decisions: Map<number, { action: 'execute' | 'skip' | 'delay'; reason: string; adjustedPayload?: any }>;

  if (GROQ_ENABLED && process.env.GROQ_API_KEY) {
    decisions = await getBatchGroqDecisions(tasks, sharedContext);
  } else {
    // Fallback: execute tất cả
    decisions = new Map(tasks.map((t) => [t.id, { action: 'execute' as const, reason: 'Groq disabled' }]));
  }

  // Execute tất cả tasks song song
  await Promise.allSettled(
    tasks.map(async (task) => {
      const decision = decisions.get(task.id) || { action: 'execute' as const, reason: 'No decision' };
      await processTaskWithDecision(task, decision);
    })
  );
}

/**
 * Xử lý một task với decision đã có từ Groq
 */
async function processTaskWithDecision(
  task: any,
  decision: { action: 'execute' | 'skip' | 'delay'; reason: string; adjustedPayload?: any }
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
 * Parse decision từ Groq response sử dụng tag parser
 */
function parseDecisionFromResponse(
  response: string,
): { action: 'execute' | 'skip' | 'delay'; reason: string; adjustedPayload?: any } {
  // Sử dụng tool parser có sẵn
  const toolCalls = parseToolCalls(response);

  // Tìm tool "decide"
  const decideCall = toolCalls.find((call) => call.toolName === 'decide');

  if (decideCall) {
    const { action, reason } = decideCall.params;
    return {
      action: action || 'execute',
      reason: reason || 'No reason provided',
      adjustedPayload: decideCall.params.message ? { message: decideCall.params.message } : undefined,
    };
  }

  // Fallback: tìm pattern cũ nếu không có tool tag
  const actionMatch = response.match(/action[=:]\s*["']?(execute|skip|delay)["']?/i);
  const reasonMatch = response.match(/reason[=:]\s*["']([^"']+)["']/i);

  return {
    action: (actionMatch?.[1] as 'execute' | 'skip' | 'delay') || 'execute',
    reason: reasonMatch?.[1] || 'Default execution',
  };
}

/**
 * Gọi Groq 1 lần duy nhất để quyết định cho tất cả tasks
 */
async function getBatchGroqDecisions(
  tasks: any[],
  context: any,
): Promise<Map<number, { action: 'execute' | 'skip' | 'delay'; reason: string; adjustedPayload?: any }>> {
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
  const decisions = new Map<number, { action: 'execute' | 'skip' | 'delay'; reason: string; adjustedPayload?: any }>();

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
