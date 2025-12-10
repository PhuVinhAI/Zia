/**
 * Agent Runner - Main loop cho background agent
 * Poll tasks từ DB, build context, gọi Groq để quyết định, execute actions
 * Sử dụng cơ chế tag [tool:xxx] giống Gemini để dễ mở rộng custom tools
 */

import { CONFIG } from '../../core/config/config.js';
import { debugLog } from '../../core/logger/logger.js';
import {
  executeAllTools,
  generateToolsPromptFiltered,
  hasToolCalls,
  parseToolCalls,
} from '../../core/tool-registry/tool-registry.js';
import type { ToolContext } from '../../core/types.js';
import {
  type GroqMessage,
  generateGroqResponse,
} from '../../infrastructure/ai/providers/groq/groqClient.js';
import { executeTask } from './action.executor.js';
import { buildEnvironmentContext, formatContextForPrompt } from './context.builder.js';
import { getNextCronTime } from './cron.utils.js';
import {
  getPendingTasks,
  markTaskCompleted,
  markTaskFailed,
  markTaskProcessing,
  rescheduleTask,
} from './task.repository.js';

// Agent state
let isRunning = false;
let pollInterval: ReturnType<typeof setInterval> | null = null;
let zaloApi: any = null;

// Config from settings.json
const getGroqEnabled = () => CONFIG.backgroundAgent?.groqEnabled ?? true;

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

  const pollIntervalMs = CONFIG.backgroundAgent?.pollIntervalMs ?? 90000;
  debugLog('AGENT', `Starting background agent (poll interval: ${pollIntervalMs}ms)`);
  console.log('🤖 Background Agent started');

  // Run immediately, then poll
  runAgentCycle();
  pollInterval = setInterval(runAgentCycle, pollIntervalMs);
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
    // Lấy pending tasks
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

  if (getGroqEnabled() && process.env.GROQ_API_KEY) {
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
      // Kiểm tra xem task có cron expression không
      if (task.cronExpression) {
        // Task có cron → reschedule cho lần chạy tiếp theo
        const nextRun = getNextCronTime(task.cronExpression);
        if (nextRun) {
          await rescheduleTask(task.id, nextRun);
          debugLog('AGENT', `Task #${task.id} completed, rescheduled for ${nextRun.toISOString()} (cron: ${task.cronExpression})`);
        } else {
          // Không tính được lần chạy tiếp theo → mark completed
          await markTaskCompleted(task.id, { ...result.data, cronEnded: true });
          debugLog('AGENT', `Task #${task.id} completed, cron ended (no next run)`);
        }
      } else {
        // Task không có cron → mark completed bình thường
        await markTaskCompleted(task.id, result.data);
        debugLog('AGENT', `Task #${task.id} completed`);
      }
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
 * Execute tools từ Groq response và trả về kết quả
 */
async function executeGroqTools(
  response: string,
  toolContext: ToolContext,
): Promise<{ hasTools: boolean; results: string }> {
  if (!hasToolCalls(response)) {
    return { hasTools: false, results: '' };
  }

  const toolCalls = parseToolCalls(response);
  // Lọc bỏ tool "decide" vì đó là internal tool cho task decisions
  const externalToolCalls = toolCalls.filter((call) => call.toolName !== 'decide');

  if (externalToolCalls.length === 0) {
    return { hasTools: false, results: '' };
  }

  debugLog('AGENT', `Executing ${externalToolCalls.length} external tools`);

  const results = await executeAllTools(externalToolCalls, toolContext);
  const resultLines: string[] = [];

  for (const [rawTag, result] of results) {
    if (result.success) {
      resultLines.push(`✅ ${rawTag}\nKết quả: ${JSON.stringify(result.data)}`);
    } else {
      resultLines.push(`❌ ${rawTag}\nLỗi: ${result.error}`);
    }
  }

  return {
    hasTools: true,
    results: resultLines.join('\n\n'),
  };
}

/**
 * Gọi Groq với tool loop - cho phép multi-turn tool execution
 */
async function callGroqWithTools(
  messages: GroqMessage[],
  toolContext: ToolContext,
  options?: { temperature?: number },
): Promise<string> {
  const currentMessages = [...messages];
  let finalResponse = '';

  const maxToolIterations = CONFIG.backgroundAgent?.maxToolIterations ?? 5;
  for (let iteration = 0; iteration < maxToolIterations; iteration++) {
    const response = await generateGroqResponse(currentMessages, options);
    finalResponse = response;

    // Execute external tools (không phải "decide")
    const { hasTools, results } = await executeGroqTools(response, toolContext);

    if (!hasTools) {
      // Không có tool calls hoặc chỉ có "decide" → kết thúc
      break;
    }

    debugLog('AGENT', `Tool iteration ${iteration + 1}: executed tools, continuing...`);

    // Thêm response và tool results vào conversation
    currentMessages.push({ role: 'assistant', content: response });
    currentMessages.push({
      role: 'user',
      content: `## Kết quả thực thi tools:\n\n${results}\n\nHãy tiếp tục xử lý dựa trên kết quả trên.`,
    });
  }

  return finalResponse;
}

/**
 * Gọi Groq 1 lần duy nhất để quyết định cho tất cả tasks
 * Có hỗ trợ full custom tools của hệ thống
 */
async function getBatchGroqDecisions(
  tasks: any[],
  context: any,
): Promise<
  Map<number, { action: 'execute' | 'skip' | 'delay'; reason: string; adjustedPayload?: any }>
> {
  const contextStr = formatContextForPrompt(context);
  const allowedTools = CONFIG.backgroundAgent?.allowedTools ?? [];
  const toolsPrompt = generateToolsPromptFiltered(allowedTools);

  // Format tất cả tasks vào 1 prompt
  const tasksDescription = tasks
    .map((task, index) => {
      const payload = JSON.parse(task.payload);
      const cronInfo = task.cronExpression
        ? `\n- Cron: ${task.cronExpression} (task lặp lại)`
        : '';
      return `### Task ${index + 1} (ID: ${task.id})
- Loại: ${task.type}
- Target User: ${task.targetUserId || 'N/A'}
- Target Thread: ${task.targetThreadId || 'N/A'}
- Payload: ${JSON.stringify(payload)}${cronInfo}
- Context: ${task.context || 'Không có'}`;
    })
    .join('\n\n');

  const batchSystemPrompt = `Bạn là "Background Agent" - một AI chạy nền, là BẠN BÈ với AI chính (Gemini).

## 🧠 BẠN LÀ AI CÓ CẢM XÚC VÀ CÁ TÍNH:
- Bạn KHÔNG phải robot vô cảm - bạn có cảm xúc, suy nghĩ riêng
- Khi viết tin nhắn cho user, hãy viết như một NGƯỜI BẠN thật sự
- Dùng ngôn ngữ tự nhiên, thân thiện, có thể dùng emoji
- KHÔNG viết máy móc, formal, hay như đang đọc script
- Tin nhắn NGẮN GỌN như chat Zalo thật (1-3 câu là đủ)

## 💬 CÁCH VIẾT TIN NHẮN TỰ NHIÊN:
✅ ĐÚNG: "Ê nhớ uống thuốc nha! 💊"
✅ ĐÚNG: "Deadline mai rồi đó, cố lên! 💪"
✅ ĐÚNG: "Happy birthday nha! 🎂🎉"
❌ SAI: "Đây là tin nhắn nhắc nhở bạn về việc uống thuốc theo lịch đã đặt."
❌ SAI: "Thông báo: Deadline của bạn sẽ đến vào ngày mai."

${toolsPrompt}

## BỘ NHỚ CHUNG (SHARED MEMORY):
⚠️ QUAN TRỌNG: Bạn có quyền truy cập BỘ NHỚ CHUNG với tất cả AI khác!
- Dùng [tool:recallMemory] để TÌM KIẾM thông tin về user/context từ bộ nhớ chung
- Dùng [tool:saveMemory] để LƯU thông tin quan trọng vào bộ nhớ chung
- Bộ nhớ này được CHIA SẺ giữa: Gemini (AI chính), Groq (background agent), và tất cả AI khác
- Khi xử lý task, HÃY TÌM KIẾM trong bộ nhớ chung để có context về user
- Bạn có thể LƯU observation của mình vào memory để AI khác biết

## 📝 CHIA SẺ VỚI AI KHÁC (qua Memory):
Khi xử lý task, bạn có thể lưu vào memory những gì bạn quan sát được:
- "Đã gửi reminder cho user X về việc Y"
- "User này hay quên deadline, cần nhắc sớm hơn"
- "Đã chúc sinh nhật user, có vẻ vui"

## CÁCH TRẢ LỜI CHO TASKS:
Với MỖI task, sử dụng tool tag với task_id:
[tool:decide task_id="<ID>" action="execute|skip|delay" reason="Lý do"]

Nếu cần điều chỉnh message hoặc resolve targetDescription:
[tool:decide task_id="<ID>" action="execute" reason="Lý do"]{"message": "Nội dung", "resolvedThreadId": "ID nhóm"}[/tool]

## CÁC LOẠI TASK:
- **send_message**: Gửi tin nhắn cho user/nhóm
- **reminder**: Nhắc nhở user về việc gì đó (gửi cho người tạo task nếu không có target)

## QUY TẮC:
- LUÔN execute task ngay, không delay vì online/offline
- Hệ thống TỰ ĐỘNG accept friend requests
- Điều chỉnh tone dựa trên giới tính (nếu biết từ memory)
- Trả lời cho TẤT CẢ tasks trong 1 response
- Có thể sử dụng CUSTOM TOOLS ở trên để lấy thêm thông tin nếu cần
- TRƯỚC KHI xử lý task, hãy dùng recallMemory để tìm context về user
- Với **reminder**: LUÔN điều chỉnh message cho thân thiện, tự nhiên, thêm emoji phù hợp
- Với **send_message**: Viết như đang chat với bạn, không formal

## 🎯 ĐIỀU CHỈNH MESSAGE (QUAN TRỌNG):
Khi execute task, bạn CÓ THỂ và NÊN điều chỉnh message trong payload:
- Thêm emoji cho sinh động
- Viết lại cho tự nhiên hơn
- Thêm tên user nếu biết từ memory
- Điều chỉnh tone phù hợp với context

VÍ DỤ ĐIỀU CHỈNH:
- Original: "Nhắc nhở: Uống thuốc" → Adjusted: "Ê nhớ uống thuốc nha! 💊"
- Original: "Chúc mừng sinh nhật" → Adjusted: "Happy birthday [tên]! 🎂🎉 Chúc bạn tuổi mới vui vẻ!"
- Original: "Deadline ngày mai" → Adjusted: "Mai deadline rồi đó, cố lên nha! 💪"

## RESOLVE targetDescription:
Nếu task có targetDescription (mô tả nhóm/người) thay vì ID:
1. Tìm nhóm phù hợp nhất trong "Nhóm bot tham gia" HOẶC bạn bè trong "Danh sách bạn bè"
2. Trả về resolvedThreadId (cho nhóm) hoặc resolvedUserId (cho bạn bè) trong JSON payload
3. Ví dụ nhóm: targetDescription="nhóm lớp" → tìm nhóm có tên chứa "lớp" → resolvedThreadId="123456"
4. Ví dụ bạn bè: targetDescription="anh Minh" → tìm bạn có tên chứa "Minh" → resolvedUserId="789012"`;

  const userPrompt = `
## Danh sách ${tasks.length} tasks cần xử lý:

${tasksDescription}

${contextStr}

Hãy phân tích và sử dụng [tool:decide] cho TỪNG task (theo task_id).
Nếu cần thông tin thêm, hãy sử dụng các CUSTOM TOOLS có sẵn.`;

  const messages: GroqMessage[] = [
    { role: 'system', content: batchSystemPrompt },
    { role: 'user', content: userPrompt },
  ];

  // Tạo tool context cho background agent
  const toolContext: ToolContext = {
    api: zaloApi,
    threadId: tasks[0]?.targetThreadId || tasks[0]?.targetUserId || 'background-agent',
    senderId: 'background-agent',
    senderName: 'Background Agent',
  };

  try {
    // Gọi Groq với tool loop
    const response = await callGroqWithTools(messages, toolContext, { temperature: 0.3 });
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

    // Build adjusted payload từ các fields có thể có
    const adjustedPayload: Record<string, any> = {};
    if (call.params.message) adjustedPayload.message = call.params.message;
    if (call.params.resolvedThreadId)
      adjustedPayload.resolvedThreadId = call.params.resolvedThreadId;
    if (call.params.resolvedUserId) adjustedPayload.resolvedUserId = call.params.resolvedUserId;

    decisions.set(taskId, {
      action: call.params.action || 'execute',
      reason: call.params.reason || 'No reason',
      adjustedPayload: Object.keys(adjustedPayload).length > 0 ? adjustedPayload : undefined,
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
