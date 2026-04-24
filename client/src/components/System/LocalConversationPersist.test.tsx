import React from 'react';
import { render } from '@testing-library/react';
import { useQueryClient } from '@tanstack/react-query';
import { QueryKeys } from 'librechat-data-provider';
import LocalConversationPersist from './LocalConversationPersist';
import { scheduleLocalConversationPersist } from '~/utils/localConversation/persistConversation';

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: jest.fn(),
}));

jest.mock('~/utils/localConversation/persistConversation', () => ({
  scheduleLocalConversationPersist: jest.fn(),
}));

describe('LocalConversationPersist', () => {
  it('subscribes to query cache and schedules persistence for message queries', () => {
    const unsubscribe = jest.fn();
    const subscribe = jest.fn((cb) => {
      cb({ query: { queryKey: [QueryKeys.messages, 'c1'] } });
      cb({ query: { queryKey: ['other', 'c2'] } });
      cb({ query: { queryKey: [QueryKeys.messages, 2] } });
      return unsubscribe;
    });
    const queryClient = {
      getQueryCache: () => ({ subscribe }),
    };
    (useQueryClient as jest.Mock).mockReturnValue(queryClient);

    const { unmount } = render(<LocalConversationPersist />);
    expect(scheduleLocalConversationPersist).toHaveBeenCalledWith(queryClient, 'c1');
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
