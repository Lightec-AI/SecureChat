import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QueryKeys } from 'librechat-data-provider';
import { scheduleLocalConversationPersist } from '~/utils/localConversation/persistConversation';

/**
 * Mirrors message cache updates into local Markdown files (desktop workspace, mobile Documents subtree, web OPFS / optional sync folder).
 */
export default function LocalConversationPersist() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const cache = queryClient.getQueryCache();
    return cache.subscribe((event) => {
      if (!event?.query) {
        return;
      }
      const key = event.query.queryKey;
      if (!Array.isArray(key) || key[0] !== QueryKeys.messages) {
        return;
      }
      const convoId = key[1];
      if (typeof convoId !== 'string') {
        return;
      }
      scheduleLocalConversationPersist(queryClient, convoId);
    });
  }, [queryClient]);

  return null;
}
