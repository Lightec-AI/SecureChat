import {
  relativeConversationPath,
  sanitizeConversationFilename,
  writeDesktopConversationMarkdown,
} from './desktopStorage';

describe('desktopStorage', () => {
  it('sanitizes conversation ids for safe filenames', () => {
    expect(sanitizeConversationFilename('abc/def:ghi?*')).toBe('abc_def_ghi__');
  });

  it('builds relative markdown path', () => {
    expect(relativeConversationPath('c/1')).toBe('conversations/c_1.md');
  });

  it('returns false when desktop bridge is unavailable', async () => {
    Object.defineProperty(window, 'secureChatDesktop', { value: undefined, configurable: true });
    await expect(writeDesktopConversationMarkdown('c1', 'md')).resolves.toBe(false);
  });

  it('writes markdown through desktop workspace API', async () => {
    const get = jest.fn().mockResolvedValue('/tmp/workspace');
    const writeText = jest.fn().mockResolvedValue(true);
    Object.defineProperty(window, 'secureChatDesktop', {
      configurable: true,
      value: {
        workspace: {
          get,
          writeText,
        },
      },
    });

    await expect(writeDesktopConversationMarkdown('c/1', 'hello')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('conversations/c_1.md', 'hello');
  });
});
