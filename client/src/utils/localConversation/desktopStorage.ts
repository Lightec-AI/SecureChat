const CONVERSATIONS_DIR = 'conversations';

export function sanitizeConversationFilename(conversationId: string): string {
  return conversationId.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function relativeConversationPath(conversationId: string): string {
  return `${CONVERSATIONS_DIR}/${sanitizeConversationFilename(conversationId)}.md`;
}

export async function writeDesktopConversationMarkdown(
  conversationId: string,
  markdown: string,
): Promise<boolean> {
  const api = window.secureChatDesktop?.workspace;
  if (!api) {
    return false;
  }
  const root = await api.get();
  if (!root) {
    return false;
  }
  await api.writeText(relativeConversationPath(conversationId), markdown);
  return true;
}
