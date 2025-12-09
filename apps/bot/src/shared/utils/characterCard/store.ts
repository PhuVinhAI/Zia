/**
 * Character Card Store
 * Manage active character sessions per thread
 */

import { debugLog } from '../../../core/logger/logger.js';
import type { CharacterSession, ParsedCharacter } from './types.js';

// Store active character sessions by threadId
const activeSessions = new Map<string, CharacterSession>();

// Default session timeout (4 hours)
const DEFAULT_SESSION_TIMEOUT = 4 * 60 * 60 * 1000;

/**
 * Activate a character for a thread
 */
export function activateCharacter(
  threadId: string,
  character: ParsedCharacter,
  userId: string,
  imageUrl?: string
): CharacterSession {
  const session: CharacterSession = {
    character,
    activatedAt: Date.now(),
    activatedBy: userId,
    messageCount: 0,
    imageUrl,
  };

  activeSessions.set(threadId, session);
  debugLog('CHAR_STORE', `Activated "${character.name}" for thread ${threadId}`);

  return session;
}

/**
 * Get active character session for a thread
 */
export function getActiveCharacter(threadId: string): CharacterSession | null {
  const session = activeSessions.get(threadId);
  
  if (!session) return null;

  // Check if session has expired
  const elapsed = Date.now() - session.activatedAt;
  if (elapsed > DEFAULT_SESSION_TIMEOUT) {
    deactivateCharacter(threadId);
    debugLog('CHAR_STORE', `Session expired for thread ${threadId}`);
    return null;
  }

  return session;
}

/**
 * Deactivate character for a thread
 */
export function deactivateCharacter(threadId: string): boolean {
  const had = activeSessions.has(threadId);
  activeSessions.delete(threadId);
  
  if (had) {
    debugLog('CHAR_STORE', `Deactivated character for thread ${threadId}`);
  }
  
  return had;
}

/**
 * Increment message count for a session
 */
export function incrementMessageCount(threadId: string): void {
  const session = activeSessions.get(threadId);
  if (session) {
    session.messageCount++;
  }
}

/**
 * Check if a thread has an active character
 */
export function hasActiveCharacter(threadId: string): boolean {
  return getActiveCharacter(threadId) !== null;
}

/**
 * Get all active sessions (for debugging/admin)
 */
export function getAllActiveSessions(): Map<string, CharacterSession> {
  // Clean up expired sessions first
  const now = Date.now();
  for (const [threadId, session] of activeSessions) {
    if (now - session.activatedAt > DEFAULT_SESSION_TIMEOUT) {
      activeSessions.delete(threadId);
    }
  }
  
  return new Map(activeSessions);
}

/**
 * Clear all sessions (for testing/reset)
 */
export function clearAllSessions(): void {
  activeSessions.clear();
  debugLog('CHAR_STORE', 'Cleared all character sessions');
}

/**
 * Get session stats
 */
export function getSessionStats(): {
  totalSessions: number;
  characters: { name: string; threadId: string; messageCount: number }[];
} {
  const sessions = getAllActiveSessions();
  
  return {
    totalSessions: sessions.size,
    characters: Array.from(sessions.entries()).map(([threadId, session]) => ({
      name: session.character.name,
      threadId,
      messageCount: session.messageCount,
    })),
  };
}

/**
 * Commands for users to control character sessions
 */
export const CHARACTER_COMMANDS = {
  // Deactivate current character
  STOP: ['/stopchar', '/endchar', '/exitchar', '/thoatnv', '/tatnv'],
  // Show current character info
  INFO: ['/charinfo', '/whoami', '/nhanvat'],
  // List all active sessions (admin only)
  LIST: ['/listchar', '/dsnv'],
};

/**
 * Check if a message is a character command
 */
export function parseCharacterCommand(text: string): { command: 'stop' | 'info' | 'list' | null } {
  const normalized = text.toLowerCase().trim();
  
  if (CHARACTER_COMMANDS.STOP.some(cmd => normalized.startsWith(cmd))) {
    return { command: 'stop' };
  }
  
  if (CHARACTER_COMMANDS.INFO.some(cmd => normalized.startsWith(cmd))) {
    return { command: 'info' };
  }
  
  if (CHARACTER_COMMANDS.LIST.some(cmd => normalized.startsWith(cmd))) {
    return { command: 'list' };
  }
  
  return { command: null };
}
