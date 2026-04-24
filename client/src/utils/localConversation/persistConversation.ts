import type { QueryClient } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import type { TConversation, TMessage } from 'librechat-data-provider';
import { Constants, QueryKeys } from 'librechat-data-provider';
import { logger } from '~/utils';
import { buildConversationMarkdown } from './conversationMarkdown';
import { sanitizeConversationFilename, writeDesktopConversationMarkdown } from './desktopStorage';
import { writeMobileConversationMarkdown } from './mobileStorage';
import { writeWebConversationMarkdown } from './webStorage';

const debounceMs = 900;
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const lastHash = new Map<string, string>();

function quickHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return `${h}:${s.length}`;
}

export function detectLocalConversationPlatform(): 'desktop' | 'mobile' | 'web' {
  if (typeof window === 'undefined') {
    return 'web';
  }
  if (window.secureChatDesktop?.workspace) {
    return 'desktop';
  }
  if (Capacitor.isNativePlatform()) {
    return 'mobile';
  }
  return 'web';
}

async function flushPersist(queryClient: QueryClient, conversationId: string): Promise<void> {
  if (!conversationId || conversationId === 'new' || conversationId === Constants.NEW_CONVO) {
    return;
  }

  const messages = queryClient.getQueryData<TMessage[]>([QueryKeys.messages, conversationId]) ?? [];
  if (messages.length === 0) {
    return;
  }

  const conversation =
    queryClient.getQueryData<TConversation>([QueryKeys.conversation, conversationId]) ?? null;

  const markdown = buildConversationMarkdown(conversation, messages);
  const hash = quickHash(markdown);
  if (lastHash.get(conversationId) === hash) {
    return;
  }

  const safeName = sanitizeConversationFilename(conversationId);
  const platform = detectLocalConversationPlatform();

  try {
    if (platform === 'desktop') {
      const ok = await writeDesktopConversationMarkdown(conversationId, markdown);
      if (ok) {
        lastHash.set(conversationId, hash);
      }
      return;
    }
    if (platform === 'mobile') {
      const ok = await writeMobileConversationMarkdown(conversationId, markdown, safeName);
      if (ok) {
        lastHash.set(conversationId, hash);
      }
      return;
    }
    const ok = await writeWebConversationMarkdown(conversationId, markdown, safeName);
    if (ok) {
      lastHash.set(conversationId, hash);
    }
  } catch (err) {
    logger.error('localConversation', 'Failed to persist conversation locally', err);
  }
}

export function scheduleLocalConversationPersist(
  queryClient: QueryClient,
  conversationId: string,
): void {
  const prev = timers.get(conversationId);
  if (prev) {
    clearTimeout(prev);
  }
  timers.set(
    conversationId,
    setTimeout(() => {
      timers.delete(conversationId);
      void flushPersist(queryClient, conversationId);
    }, debounceMs),
  );
}
