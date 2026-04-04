import { useCallback, useMemo } from 'react';
import { ChevronRight, MessageSquare, User, Bot } from 'lucide-react';
import type { ChatMessage } from '../hooks/LLMContext';

interface TreeNode {
  id: string | number;
  role: string;
  content: string;
  children: TreeNode[];
}

interface MessageTreeProps {
  messages: ChatMessage[];
  onSelect: (id: string | number) => void;
  selectedId?: string | number | null;
}

/**
 * Build a tree structure from messages using `parentId` links.
 * Root nodes (no parentId) are direct children of the trunk.
 * When a message reQuestions/reAnswers, it becomes a sibling branch off the parent.
 */
function buildTree(messages: ChatMessage[]): TreeNode[] {
  const nodeMap = new Map<string | number, TreeNode>();
  const rootIds: (string | number)[] = [];

  for (const msg of messages) {
    nodeMap.set(msg.id, {
      id: msg.id,
      role: msg.role,
      content: msg.content,
      children: [],
    });
  }

  // Link children under parents
  const childIndices = new Set<string | number>();
  const msgList = Array.from(messages);

  for (let i = 0; i < msgList.length; i++) {
    const msg = msgList[i];
    if (msg.parentId != null) {
      const parent = nodeMap.get(msg.parentId);
      if (parent) {
        parent.children.push(nodeMap.get(msg.id)!);
        childIndices.add(msg.id);
      } else {
        // Orphan — attach to previous sibling as fallback
        rootIds.push(msg.id);
      }
    } else {
      rootIds.push(msg.id);
    }
  }

  // Return root nodes (messages without parentId that are also referenced by children)
  const childRootIds = rootIds.filter((id) => childIndices.has(id));
  const orphanIds = rootIds.filter((id) => !childIndices.has(id));

  // If there are orphan root nodes that have child branches, return all roots
  // to show the full tree
  return Array.from(new Set([...orphanIds, ...childRootIds])).map(
    (id) => nodeMap.get(id)!,
  );
}

export function MessageTree({ messages, onSelect, selectedId }: MessageTreeProps) {
  const tree = useMemo(() => buildTree(messages), [messages]);

  const indentMap = useMemo(() => {
    const map = new Map<string | number, number>();
    const walk = (nodes: TreeNode[], depth: number) => {
      for (const node of nodes) {
        map.set(node.id, depth);
        walk(node.children, depth + 1);
      }
    };
    walk(tree, 0);
    return map;
  }, [tree]);

  const renderNode = useCallback(
    (node: TreeNode, depth: number) => {
      const hasChildren = node.children.length > 0;
      const isSelected = selectedId === node.id;
      const indent = indentMap.get(node.id) ?? 0;

      const roleBadge =
        node.role === 'user' ? (
          <User className="h-3 w-3 shrink-0 text-white" />
        ) : (
          <Bot className="h-3 w-3 shrink-0 text-[#5505af]" />
        );

      const preview = node.content
        ? node.content.slice(0, 80) + (node.content.length > 80 ? '...' : '')
        : '(no content)';

      const branchLabel = hasChildren
        ? `+${node.children.length}`
        : null;

      const handleClick = () => onSelect(node.id);

      return (
        <div key={node.id}>
          <button
            onClick={handleClick}
            className={`group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition-all hover:bg-[#f5f3ff] ${
              isSelected ? 'ring-1 ring-[#5505af]/30 bg-[#f5f3ff]' : ''
            }`}
            style={{ paddingLeft: `${indent * 24 + 8}px` }}
          >
            {/* Connector line for depth */}
            {indent > 0 && (
              <div
                className="absolute left-0 h-full w-px bg-[#5505af]/15"
                style={{ left: `${indent * 24 + 4}px` }}
              />
            )}

            <span
              className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 tabular-nums ${
                node.role === 'user'
                  ? 'bg-black text-white'
                  : 'bg-[#f0e8ff] text-[#5505af]'
              }`}
            >
              {roleBadge}
              {node.role === 'user' ? 'U' : 'A'}
            </span>

            <span className="min-w-0 flex-1 truncate text-left text-[#3d3d3d]">
              {preview}
            </span>

            {branchLabel && (
              <span className="flex items-center gap-0.5 rounded-full bg-[#f0e8ff] px-1.5 py-0.5 text-[10px] font-medium text-[#5505af] ring-1 ring-[#5505af]/15">
                {hasChildren ? (
                  <>
                    <ChevronRight className="h-2.5 w-2.5" />
                    {branchLabel}
                  </>
                ) : null}
              </span>
            )}
          </button>

          {/* Recursively render children */}
          {node.children.map((child) => renderNode(child, depth + 1))}
        </div>
      );
    },
    [selectedId, indentMap, onSelect],
  );

  if (tree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[#6d6d6d]">
        <MessageSquare className="mb-2 h-8 w-8 opacity-40" />
        <p className="text-sm">No messages to display</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <p className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-[#6d6d6d]">
        Message Tree
      </p>
      {tree.map((node) => renderNode(node, 0))}
    </div>
  );
}
