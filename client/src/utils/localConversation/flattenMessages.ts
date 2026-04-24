import type { ParentMessage, TMessage } from 'librechat-data-provider';
import { buildTree } from 'librechat-data-provider';

/**
 * Linearize the active branch: at each fork, follow the last child (latest continuation / regenerate).
 */
export function flattenLatestBranchMessages(messages: TMessage[] | null | undefined): TMessage[] {
  if (!messages?.length) {
    return [];
  }
  const roots = buildTree({ messages, fileMap: undefined }) as ParentMessage[] | null;
  if (!roots?.length) {
    return [];
  }

  const out: TMessage[] = [];
  let node: ParentMessage | undefined = roots[0];
  while (node) {
    const { children, ...rest } = node;
    out.push(rest as TMessage);
    if (!children?.length) {
      break;
    }
    node = children[children.length - 1] as ParentMessage;
  }
  return out;
}
