import type { TConversation, TMessage, TMessageContentParts } from 'librechat-data-provider';
import {
  ContentTypes,
  ToolCallTypes,
  imageGenTools,
  isImageVisionTool,
} from 'librechat-data-provider';
import { flattenLatestBranchMessages } from './flattenMessages';

function formatBlock(sender: string, text: string) {
  return `**${sender}**\n${text}`;
}

function getMessageContent(sender: string, content?: TMessageContentParts): [string, string][] {
  if (!content) {
    return [];
  }

  if (content.type === ContentTypes.ERROR) {
    const textPart = content[ContentTypes.TEXT];
    const text = typeof textPart === 'object' ? (textPart?.value ?? '') : (textPart ?? '');
    return [[sender, text]];
  }

  if (content.type === ContentTypes.TEXT) {
    const textPart = content[ContentTypes.TEXT];
    const text = typeof textPart === 'string' ? textPart : (textPart?.value ?? '');
    if (text.trim().length === 0) {
      return [];
    }
    return [[sender, text]];
  }

  if (content.type === ContentTypes.TOOL_CALL) {
    const type = content[ContentTypes.TOOL_CALL].type;

    if (type === ToolCallTypes.CODE_INTERPRETER) {
      const toolCall = content[ContentTypes.TOOL_CALL];
      const code_interpreter = toolCall[ToolCallTypes.CODE_INTERPRETER];
      return [['Code Interpreter', JSON.stringify(code_interpreter)]];
    }

    if (type === ToolCallTypes.RETRIEVAL) {
      const toolCall = content[ContentTypes.TOOL_CALL];
      return [['Retrieval', JSON.stringify(toolCall)]];
    }

    if (
      type === ToolCallTypes.FUNCTION &&
      imageGenTools.has(content[ContentTypes.TOOL_CALL].function?.name ?? '')
    ) {
      const toolCall = content[ContentTypes.TOOL_CALL];
      return [['Tool', JSON.stringify(toolCall)]];
    }

    if (type === ToolCallTypes.FUNCTION) {
      const toolCall = content[ContentTypes.TOOL_CALL];
      if (isImageVisionTool(toolCall)) {
        return [['Tool', JSON.stringify(toolCall)]];
      }
      return [['Tool', JSON.stringify(toolCall)]];
    }
  }

  if (content.type === ContentTypes.IMAGE_FILE) {
    const imageFile = content[ContentTypes.IMAGE_FILE];
    return [['Image', JSON.stringify(imageFile)]];
  }

  return [[sender, JSON.stringify(content)]];
}

function getMessageMarkdown(message: Partial<TMessage> | undefined): string {
  if (!message) {
    return '';
  }

  if (!message.content) {
    return formatBlock(message.sender || '', message.text || '');
  }

  return message.content
    .filter((c) => c != null)
    .map((c) => getMessageContent(message.sender || '', c))
    .filter((pairs) => pairs.length > 0)
    .map((pairs) => pairs.map(([sender, text]) => formatBlock(sender, text)).join('\n\n'))
    .join('\n\n\n');
}

export function buildConversationMarkdown(
  conversation: TConversation | null | undefined,
  messages: TMessage[] | null | undefined,
): string {
  const linear = flattenLatestBranchMessages(messages ?? []);
  let data =
    '# Conversation\n' +
    `- conversationId: ${conversation?.conversationId ?? ''}\n` +
    `- endpoint: ${conversation?.endpoint ?? ''}\n` +
    `- title: ${conversation?.title ?? ''}\n` +
    `- savedAt: ${new Date().toISOString()}\n`;

  data += '\n## History\n';
  for (const message of linear) {
    data += `${getMessageMarkdown(message)}\n`;
    if (message?.error) {
      data += '*(This is an error message)*\n';
    }
    if (message?.unfinished === true) {
      data += '*(This is an unfinished message)*\n';
    }
    data += '\n\n';
  }
  return data;
}
