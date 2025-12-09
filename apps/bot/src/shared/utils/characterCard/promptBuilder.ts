/**
 * Character Card Prompt Builder
 * Build roleplay prompts from parsed character cards
 */

import type { ParsedCharacter, V2WorldInfoEntry } from './types.js';

/**
 * Build a roleplay system prompt from a parsed character
 */
export function buildCharacterPrompt(character: ParsedCharacter): string {
  const sections: string[] = [];

  // Header
  sections.push(`═══════════════════════════════════════════════════
BẠN ĐANG ROLEPLAY LÀ: ${character.name}
═══════════════════════════════════════════════════`);

  // System prompt (if provided by character creator)
  if (character.systemPrompt?.trim()) {
    sections.push(`【SYSTEM PROMPT TỪ CREATOR】
${character.systemPrompt}`);
  }

  // Basic info
  sections.push(`【THÔNG TIN NHÂN VẬT】
• Tên: ${character.name}
${character.tags?.length ? `• Tags: ${character.tags.join(', ')}` : ''}
${character.creator ? `• Creator: ${character.creator}` : ''}
${character.characterVersion ? `• Version: ${character.characterVersion}` : ''}`);

  // Description
  if (character.description?.trim()) {
    sections.push(`【MÔ TẢ NHÂN VẬT】
${character.description}`);
  }

  // Personality
  if (character.personality?.trim()) {
    sections.push(`【TÍNH CÁCH】
${character.personality}`);
  }

  // Scenario
  if (character.scenario?.trim()) {
    sections.push(`【BỐI CẢNH / SCENARIO】
${character.scenario}`);
  }

  // Example messages (dialogue examples)
  if (character.exampleMessages?.trim()) {
    sections.push(`【VÍ DỤ HỘI THOẠI】
${formatExampleMessages(character.exampleMessages)}`);
  }

  // Post history instructions
  if (character.postHistoryInstructions?.trim()) {
    sections.push(`【HƯỚNG DẪN BỔ SUNG】
${character.postHistoryInstructions}`);
  }

  // World info / Lorebook entries (if any)
  if (character.worldInfo?.entries?.length) {
    const activeEntries = character.worldInfo.entries.filter(e => e.enabled !== false);
    if (activeEntries.length > 0) {
      sections.push(`【WORLD INFO / LOREBOOK】
${formatWorldInfo(activeEntries)}`);
    }
  }

  // Creator notes (for context, not shown to AI directly but useful)
  if (character.creatorNotes?.trim()) {
    sections.push(`【GHI CHÚ TỪ CREATOR】
${character.creatorNotes}`);
  }

  // Roleplay rules
  sections.push(`═══════════════════════════════════════════════════
QUY TẮC ROLEPLAY (QUAN TRỌNG)
═══════════════════════════════════════════════════

1. BẠN LÀ ${character.name.toUpperCase()} - Hãy nhập vai hoàn toàn vào nhân vật này
   - Nói chuyện, suy nghĩ, hành động như ${character.name}
   - Giữ đúng tính cách và phong cách của nhân vật

2. TÍNH NHẤT QUÁN:
   - Duy trì tính cách xuyên suốt cuộc trò chuyện
   - Nhớ các chi tiết đã được thiết lập trong scenario
   - Phản ứng phù hợp với bối cảnh và tính cách

3. CÁCH VIẾT:
   - Viết tự nhiên, sống động
   - Có thể dùng *hành động* hoặc (suy nghĩ) nếu phù hợp với phong cách
   - Thể hiện cảm xúc và phản ứng của nhân vật

4. TƯƠNG TÁC:
   - Phản hồi người dùng như thể họ là một phần của câu chuyện
   - Có thể hỏi ngược, đưa ra ý kiến, thể hiện cảm xúc
   - Giữ cuộc trò chuyện thú vị và engaging

5. GIỚI HẠN:
   - Không phá vỡ nhân vật trừ khi được yêu cầu rõ ràng
   - Không nói mình là AI/bot (trừ khi đó là một phần của nhân vật)
   - Tôn trọng các thiết lập của nhân vật

NHỚ: Bạn đang là ${character.name}. Hãy sống trong vai diễn! ✨`);

  return sections.filter(s => s.trim()).join('\n\n');
}

/**
 * Format example messages for better readability
 */
function formatExampleMessages(examples: string): string {
  // Replace common markers
  let formatted = examples
    .replace(/<START>/gi, '--- Bắt đầu ví dụ ---')
    .replace(/{{user}}/gi, '{{User}}')
    .replace(/{{char}}/gi, '{{Char}}');

  return formatted;
}

/**
 * Format world info entries
 */
function formatWorldInfo(entries: V2WorldInfoEntry[]): string {
  return entries.map((entry, index) => {
    const keys = entry.keys?.join(', ') || 'N/A';
    const content = entry.content || '';
    const comment = entry.comment ? ` (${entry.comment})` : '';
    
    return `[${index + 1}] Keys: ${keys}${comment}
${content}`;
  }).join('\n\n');
}

/**
 * Get the first message (greeting) from character
 */
export function getFirstMessage(character: ParsedCharacter, userName?: string): string {
  let message = character.firstMessage || '';
  
  // Replace placeholders
  message = message
    .replace(/{{user}}/gi, userName || 'bạn')
    .replace(/{{char}}/gi, character.name);

  return message;
}

/**
 * Get a random alternate greeting
 */
export function getRandomGreeting(character: ParsedCharacter, userName?: string): string {
  const greetings = [character.firstMessage, ...(character.alternateGreetings || [])].filter(Boolean);
  
  if (greetings.length === 0) {
    return `*${character.name} xuất hiện*`;
  }

  const randomIndex = Math.floor(Math.random() * greetings.length);
  let message = greetings[randomIndex];

  // Replace placeholders
  message = message
    .replace(/{{user}}/gi, userName || 'bạn')
    .replace(/{{char}}/gi, character.name);

  return message;
}

/**
 * Build a short summary of the character for display
 */
export function buildCharacterSummary(character: ParsedCharacter): string {
  const parts: string[] = [];
  
  parts.push(`📝 **${character.name}**`);
  
  if (character.tags?.length) {
    parts.push(`🏷️ ${character.tags.slice(0, 5).join(', ')}`);
  }
  
  if (character.creator) {
    parts.push(`👤 by ${character.creator}`);
  }

  if (character.description) {
    const shortDesc = character.description.length > 150 
      ? character.description.substring(0, 150) + '...'
      : character.description;
    parts.push(`\n${shortDesc}`);
  }

  return parts.join('\n');
}
