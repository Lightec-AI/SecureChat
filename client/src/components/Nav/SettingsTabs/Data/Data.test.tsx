import React from 'react';
import { render, screen } from '@testing-library/react';
import Data from './Data';

jest.mock('@librechat/client', () => ({
  useOnClickOutside: jest.fn(),
}));

jest.mock('./ImportConversations', () => () => <div data-testid="import-conversations" />);
jest.mock('./SharedLinks', () => () => <div data-testid="shared-links" />);
jest.mock('./LocalConversationFiles', () => () => <div data-testid="local-conversation-files" />);
jest.mock('./RevokeKeys', () => ({
  RevokeKeys: () => <div data-testid="revoke-keys" />,
}));
jest.mock('./DeleteCache', () => ({
  DeleteCache: () => <div data-testid="delete-cache" />,
}));
jest.mock('./ClearChats', () => ({
  ClearChats: () => <div data-testid="clear-chats" />,
}));
jest.mock('./AgentApiKeys', () => ({
  AgentApiKeys: () => <div data-testid="agent-api-keys" />,
}));

const mockUseHasAccess = jest.fn();
jest.mock('~/hooks', () => ({
  useHasAccess: () => mockUseHasAccess(),
}));

describe('Data settings tab', () => {
  it('always renders local conversation files section', () => {
    mockUseHasAccess.mockReturnValue(false);
    render(<Data />);

    expect(screen.getByTestId('local-conversation-files')).toBeInTheDocument();
    expect(screen.queryByTestId('agent-api-keys')).not.toBeInTheDocument();
  });

  it('renders agent api keys section when access is allowed', () => {
    mockUseHasAccess.mockReturnValue(true);
    render(<Data />);

    expect(screen.getByTestId('agent-api-keys')).toBeInTheDocument();
    expect(screen.getByTestId('import-conversations')).toBeInTheDocument();
    expect(screen.getByTestId('shared-links')).toBeInTheDocument();
    expect(screen.getByTestId('revoke-keys')).toBeInTheDocument();
    expect(screen.getByTestId('delete-cache')).toBeInTheDocument();
    expect(screen.getByTestId('clear-chats')).toBeInTheDocument();
  });
});
