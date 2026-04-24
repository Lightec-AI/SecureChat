import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LocalConversationFiles from './LocalConversationFiles';
import { detectLocalConversationPlatform } from '~/utils/localConversation/persistConversation';
import {
  clearWebSyncFolder,
  getWebLocalEncryptPreference,
  hasWebSyncFolder,
  pickWebSyncFolder,
  setWebLocalEncryptPreference,
  supportsWebDirectoryPicker,
} from '~/utils/localConversation/webStorage';
import {
  getMobileRelativeDir,
  setMobileRelativeDir,
} from '~/utils/localConversation/mobileStorage';

const mockShowToast = jest.fn();

jest.mock('@librechat/client', () => ({
  Button: ({ children, ...props }) => <button {...props}>{children}</button>,
  Label: ({ children, ...props }) => <label {...props}>{children}</label>,
  Switch: ({ checked, onCheckedChange, ...props }) => (
    <input
      type="checkbox"
      checked={Boolean(checked)}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      {...props}
    />
  ),
  useToastContext: () => ({ showToast: mockShowToast }),
}));

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

jest.mock('~/utils/localConversation/persistConversation', () => ({
  detectLocalConversationPlatform: jest.fn(),
}));
jest.mock('~/utils/localConversation/webStorage', () => ({
  clearWebSyncFolder: jest.fn(),
  getWebLocalEncryptPreference: jest.fn(),
  hasWebSyncFolder: jest.fn(),
  pickWebSyncFolder: jest.fn(),
  setWebLocalEncryptPreference: jest.fn(),
  supportsWebDirectoryPicker: jest.fn(),
}));
jest.mock('~/utils/localConversation/mobileStorage', () => ({
  DEFAULT_MOBILE_RELATIVE_DIR: 'LightecSecureChat/conversations',
  getMobileRelativeDir: jest.fn(),
  setMobileRelativeDir: jest.fn(),
}));

describe('LocalConversationFiles', () => {
  beforeEach(() => {
    (getWebLocalEncryptPreference as jest.Mock).mockReturnValue(false);
  });

  it('renders desktop controls and chooses workspace', async () => {
    (detectLocalConversationPlatform as jest.Mock).mockReturnValue('desktop');
    Object.defineProperty(window, 'secureChatDesktop', {
      configurable: true,
      value: {
        workspace: {
          get: jest.fn().mockResolvedValue('/chosen'),
          choose: jest.fn().mockResolvedValue('/new'),
        },
      },
    });
    render(<LocalConversationFiles />);
    await waitFor(() =>
      expect(screen.getByText('/chosen/conversations/<conversationId>.md')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('com_local_conv_desktop_choose'));
    await waitFor(() => expect(mockShowToast).toHaveBeenCalled());
  });

  it('renders web controls and handles encryption toggle', async () => {
    (detectLocalConversationPlatform as jest.Mock).mockReturnValue('web');
    (supportsWebDirectoryPicker as jest.Mock).mockReturnValue(true);
    (hasWebSyncFolder as jest.Mock).mockResolvedValue(false);
    (pickWebSyncFolder as jest.Mock).mockResolvedValue(true);
    render(<LocalConversationFiles />);

    fireEvent.click(screen.getByText('com_local_conv_web_pick_folder'));
    await waitFor(() => expect(pickWebSyncFolder).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('checkbox'));
    expect(setWebLocalEncryptPreference).toHaveBeenCalledWith(true);
  });

  it('renders mobile controls and saves relative path', async () => {
    (detectLocalConversationPlatform as jest.Mock).mockReturnValue('mobile');
    (getMobileRelativeDir as jest.Mock).mockResolvedValue('Docs/chats');
    render(<LocalConversationFiles />);
    const input = await screen.findByDisplayValue('Docs/chats');
    fireEvent.change(input, { target: { value: 'Sync/chat-md' } });
    fireEvent.click(screen.getByText('com_local_conv_mobile_save'));
    await waitFor(() => expect(setMobileRelativeDir).toHaveBeenCalledWith('Sync/chat-md'));
  });

  it('clears linked web folder when requested', async () => {
    (detectLocalConversationPlatform as jest.Mock).mockReturnValue('web');
    (supportsWebDirectoryPicker as jest.Mock).mockReturnValue(true);
    (hasWebSyncFolder as jest.Mock).mockResolvedValue(true);
    render(<LocalConversationFiles />);
    fireEvent.click(await screen.findByText('com_local_conv_web_clear_folder'));
    await waitFor(() => expect(clearWebSyncFolder).toHaveBeenCalled());
  });
});
