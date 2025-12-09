/**
 * Character Card Handler
 * Handle character card detection and roleplay activation
 */

import { CONFIG } from '../../../core/config/config.js';
import { debugLog } from '../../../core/logger/logger.js';
import {
  activateCharacter,
  buildCharacterPrompt,
  buildCharacterSummary,
  deactivateCharacter,
  fetchAndParseCharacterCard,
  getActiveCharacter,
  getFirstMessage,
  getSessionStats,
  parseCharacterCommand,
  type ParsedCharacter,
} from '../../../shared/utils/characterCard/index.js';
import { getThreadType, sendTextMessage } from '../../../shared/utils/message/messageSender.js';
import type { ClassifiedMessage } from '../classifier.js';

/**
 * Check if any message in the batch is a character card
 */
export function hasCharacterCard(classified: ClassifiedMessage[]): boolean {
  return classified.some(c => c.type === 'character_card' || c.isCharacterCard);
}

/**
 * Get character card URL from classified messages
 */
export function getCharacterCardUrl(classified: ClassifiedMessage[]): string | null {
  const cardMsg = classified.find(c => c.type === 'character_card' || c.isCharacterCard);
  return cardMsg?.url || null;
}

/**
 * Process character card and activate roleplay
 * @param silent - If true, don't send error messages (used for auto-detection)
 */
export async function processCharacterCard(
  api: any,
  threadId: string,
  imageUrl: string,
  senderId: string,
  senderName?: string,
  silent: boolean = false,
): Promise<{ success: boolean; character?: ParsedCharacter; error?: string }> {
  debugLog('CHAR_CARD', `Processing character card from ${imageUrl}`);

  try {
    // Fetch and parse the character card
    const character = await fetchAndParseCharacterCard(imageUrl);

    if (!character) {
      // Not a character card - this is normal for regular images
      return { 
        success: false, 
        error: 'Not a character card' 
      };
    }

    debugLog('CHAR_CARD', `Parsed character: ${character.name}`);

    // Activate the character for this thread
    activateCharacter(threadId, character, senderId, imageUrl);

    // Send confirmation message
    const summary = buildCharacterSummary(character);
    const confirmMsg = `✨ **Đã kích hoạt roleplay!**\n\n${summary}\n\n💡 Gõ \`/stopchar\` để thoát roleplay\n💡 Gõ \`/charinfo\` để xem thông tin nhân vật`;
    
    await sendTextMessage(api, confirmMsg, threadId, { source: 'characterCard' });

    // Send first message (greeting) from character
    const greeting = getFirstMessage(character, senderName);
    if (greeting) {
      // Small delay before greeting
      await new Promise(r => setTimeout(r, 500));
      await sendTextMessage(api, greeting, threadId, { source: 'characterCard' });
    }

    return { success: true, character };
  } catch (error: any) {
    debugLog('CHAR_CARD', `Error processing character card: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Handle character-related commands
 */
export async function handleCharacterCommand(
  api: any,
  threadId: string,
  text: string,
  senderId: string,
): Promise<boolean> {
  const { command } = parseCharacterCommand(text);
  
  if (!command) return false;

  const threadType = getThreadType(threadId);

  switch (command) {
    case 'stop': {
      const session = getActiveCharacter(threadId);
      if (session) {
        const charName = session.character.name;
        deactivateCharacter(threadId);
        await sendTextMessage(
          api, 
          `👋 Đã thoát roleplay với **${charName}**!\n\nBot đã trở về chế độ bình thường.`,
          threadId,
          { source: 'characterCard' }
        );
      } else {
        await sendTextMessage(
          api,
          '❓ Hiện không có nhân vật nào đang được roleplay.',
          threadId,
          { source: 'characterCard' }
        );
      }
      return true;
    }

    case 'info': {
      const session = getActiveCharacter(threadId);
      if (session) {
        const summary = buildCharacterSummary(session.character);
        const info = `🎭 **Đang roleplay:**\n\n${summary}\n\n📊 Số tin nhắn: ${session.messageCount}\n⏱️ Bắt đầu: ${new Date(session.activatedAt).toLocaleString('vi-VN')}`;
        await sendTextMessage(api, info, threadId, { source: 'characterCard' });
      } else {
        await sendTextMessage(
          api,
          '❓ Hiện không có nhân vật nào đang được roleplay.\n\n💡 Gửi ảnh character card (PNG) để bắt đầu roleplay!',
          threadId,
          { source: 'characterCard' }
        );
      }
      return true;
    }

    case 'list': {
      // Admin only
      if (senderId !== CONFIG.adminUserId) {
        await sendTextMessage(
          api,
          '⛔ Lệnh này chỉ dành cho admin.',
          threadId,
          { source: 'characterCard' }
        );
        return true;
      }

      const stats = getSessionStats();
      if (stats.totalSessions === 0) {
        await sendTextMessage(
          api,
          '📋 Không có session roleplay nào đang hoạt động.',
          threadId,
          { source: 'characterCard' }
        );
      } else {
        const list = stats.characters
          .map((c, i) => `${i + 1}. **${c.name}** (thread: ${c.threadId}, msgs: ${c.messageCount})`)
          .join('\n');
        await sendTextMessage(
          api,
          `📋 **${stats.totalSessions} session đang hoạt động:**\n\n${list}`,
          threadId,
          { source: 'characterCard' }
        );
      }
      return true;
    }
  }

  return false;
}

/**
 * Get roleplay system prompt if character is active
 */
export function getCharacterSystemPrompt(threadId: string): string | null {
  const session = getActiveCharacter(threadId);
  if (!session) return null;

  return buildCharacterPrompt(session.character);
}

/**
 * Check if thread has active character and increment message count
 */
export function checkAndIncrementCharacter(threadId: string): ParsedCharacter | null {
  const session = getActiveCharacter(threadId);
  if (!session) return null;

  session.messageCount++;
  return session.character;
}
