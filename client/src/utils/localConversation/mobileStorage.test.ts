import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Filesystem } from '@capacitor/filesystem';
import {
  DEFAULT_MOBILE_RELATIVE_DIR,
  getMobileRelativeDir,
  setMobileRelativeDir,
  writeMobileConversationMarkdown,
} from './mobileStorage';

jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: jest.fn(),
  },
}));

jest.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    writeFile: jest.fn(),
  },
  Directory: {
    Documents: 'Documents',
  },
  Encoding: {
    UTF8: 'utf8',
  },
}));

describe('mobileStorage', () => {
  beforeEach(() => {
    (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
    (Preferences.get as jest.Mock).mockResolvedValue({ value: undefined });
  });

  it('returns default path on web', async () => {
    (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);
    await expect(getMobileRelativeDir()).resolves.toBe(DEFAULT_MOBILE_RELATIVE_DIR);
  });

  it('stores sanitized path in preferences', async () => {
    await setMobileRelativeDir('/my/path///');
    expect(Preferences.set).toHaveBeenCalledWith({
      key: 'securechat_mobile_conv_relative_dir',
      value: 'my/path',
    });
  });

  it('writes markdown into documents directory on native', async () => {
    (Preferences.get as jest.Mock).mockResolvedValue({ value: 'sync/chats' });
    await expect(writeMobileConversationMarkdown('c1', 'hello', 'c1')).resolves.toBe(true);
    expect(Filesystem.writeFile).toHaveBeenCalledWith(
      expect.objectContaining({
        path: 'sync/chats/c1.md',
        data: 'hello',
        recursive: true,
      }),
    );
  });
});
