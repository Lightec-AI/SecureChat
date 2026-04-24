import { buildTree } from 'librechat-data-provider';
import type { TMessage } from 'librechat-data-provider';
import { flattenLatestBranchMessages } from './flattenMessages';

jest.mock('librechat-data-provider', () => ({
  buildTree: jest.fn(),
}));

describe('flattenLatestBranchMessages', () => {
  it('returns empty array for empty input', () => {
    expect(flattenLatestBranchMessages([])).toEqual([]);
  });

  it('returns empty array when buildTree returns null', () => {
    (buildTree as jest.Mock).mockReturnValue(null);
    expect(flattenLatestBranchMessages([{ messageId: 'x' } as TMessage])).toEqual([]);
  });

  it('follows latest branch by choosing last child at forks', () => {
    (buildTree as jest.Mock).mockReturnValue([
      {
        messageId: 'root',
        children: [
          { messageId: 'older', children: [] },
          {
            messageId: 'newer',
            children: [{ messageId: 'leaf', children: [] }],
          },
        ],
      },
    ]);

    const result = flattenLatestBranchMessages([{ messageId: 'dummy' } as TMessage]);
    expect(result.map((m) => m.messageId)).toEqual(['root', 'newer', 'leaf']);
    expect((result[0] as unknown as { children?: unknown }).children).toBeUndefined();
  });
});
