import { Capacitor } from '@capacitor/core';
import { Constants, QueryKeys } from 'librechat-data-provider';
import { logger } from '~/utils';
import {
  detectLocalConversationPlatform,
  scheduleLocalConversationPersist,
} from './persistConversation';
import { buildConversationMarkdown } from './conversationMarkdown';
import { writeDesktopConversationMarkdown } from './desktopStorage';
import { writeMobileConversationMarkdown } from './mobileStorage';
import { writeWebConversationMarkdown } from './webStorage';

jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: jest.fn() },
}));

jest.mock('./conversationMarkdown', () => ({
  buildConversationMarkdown: jest.fn(() => 'md'),
}));
jest.mock('./desktopStorage', () => ({
  sanitizeConversationFilename: jest.fn((id: string) => id),
  writeDesktopConversationMarkdown: jest.fn(),
}));
jest.mock('./mobileStorage', () => ({
  writeMobileConversationMarkdown: jest.fn(),
}));
jest.mock('./webStorage', () => ({
  writeWebConversationMarkdown: jest.fn(),
}));
jest.mock('~/utils', () => ({
  logger: { error: jest.fn() },
}));

describe('persistConversation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (writeDesktopConversationMarkdown as jest.Mock).mockResolvedValue(true);
    (writeMobileConversationMarkdown as jest.Mock).mockResolvedValue(true);
    (writeWebConversationMarkdown as jest.Mock).mockResolvedValue(true);
    (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);
    Object.defineProperty(window, 'secureChatDesktop', { configurable: true, value: undefined });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('detects desktop/mobile/web platform', () => {
    expect(detectLocalConversationPlatform()).toBe('web');
    Object.defineProperty(window, 'secureChatDesktop', {
      configurable: true,
      value: { workspace: {} },
    });
    expect(detectLocalConversationPlatform()).toBe('desktop');
    Object.defineProperty(window, 'secureChatDesktop', { configurable: true, value: undefined });
    (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
    expect(detectLocalConversationPlatform()).toBe('mobile');
  });

  it('debounces and persists to web by default', async () => {
    const getQueryData = jest.fn((key: unknown[]) => {
      if (key[0] === QueryKeys.messages) {
        return [{ messageId: 'm1' }];
      }
      return { conversationId: 'c1' };
    });
    const queryClient = { getQueryData } as never;

    scheduleLocalConversationPersist(queryClient, 'c1');
    scheduleLocalConversationPersist(queryClient, 'c1');
    jest.advanceTimersByTime(901);
    await Promise.resolve();

    expect(buildConversationMarkdown).toHaveBeenCalled();
    expect(writeWebConversationMarkdown).toHaveBeenCalledWith('c1', 'md', 'c1');
  });

  it('skips new conversation id and logs write errors', async () => {
    const queryClient = { getQueryData: jest.fn(() => [{ messageId: 'm1' }]) } as never;
    scheduleLocalConversationPersist(queryClient, Constants.NEW_CONVO);
    jest.advanceTimersByTime(901);
    await Promise.resolve();
    expect(writeWebConversationMarkdown).not.toHaveBeenCalled();

    (buildConversationMarkdown as jest.Mock).mockReturnValueOnce('md1').mockReturnValueOnce('md2');
    (writeWebConversationMarkdown as jest.Mock).mockRejectedValue(new Error('fail'));
    const failingClient = {
      getQueryData: jest.fn((key: unknown[]) =>
        key[0] === QueryKeys.messages ? [{ messageId: 'm1' }] : { conversationId: 'c1' },
      ),
    } as never;
    scheduleLocalConversationPersist(failingClient, 'c1');
    jest.advanceTimersByTime(901);
    await Promise.resolve();
    expect(logger.error).toHaveBeenCalled();
  });
});
