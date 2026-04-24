import { buildConversationMarkdown } from './conversationMarkdown';
import { flattenLatestBranchMessages } from './flattenMessages';

jest.mock('./flattenMessages', () => ({
  flattenLatestBranchMessages: jest.fn(),
}));

describe('buildConversationMarkdown', () => {
  it('renders metadata header and history entries', () => {
    (flattenLatestBranchMessages as jest.Mock).mockReturnValue([
      { sender: 'You', text: 'Hello', messageId: 'u1' },
      {
        sender: 'Assistant',
        content: [{ type: 'text', text: { value: 'Hi there' } }],
        messageId: 'a1',
      },
    ]);

    const md = buildConversationMarkdown(
      {
        conversationId: 'c1',
        endpoint: 'openai',
        title: 'My chat',
      } as never,
      [] as never,
    );

    expect(md).toContain('# Conversation');
    expect(md).toContain('- conversationId: c1');
    expect(md).toContain('## History');
    expect(md).toContain('**You**\nHello');
    expect(md).toContain('**Assistant**\nHi there');
  });

  it('includes error and unfinished markers', () => {
    (flattenLatestBranchMessages as jest.Mock).mockReturnValue([
      { sender: 'Assistant', text: 'oops', error: true, unfinished: true, messageId: 'a1' },
    ]);
    const md = buildConversationMarkdown(null, []);
    expect(md).toContain('*(This is an error message)*');
    expect(md).toContain('*(This is an unfinished message)*');
  });
});
