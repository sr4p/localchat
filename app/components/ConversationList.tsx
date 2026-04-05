import { useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import { ConversationItem } from './ConversationItem';
import { useLLM } from '../hooks/useLLM';
import { toast } from '../utils/toast';

interface ConversationListProps {
  onToggle: () => void;
}

export function ConversationList({ onToggle }: ConversationListProps) {
  const { conversations, activeConversationId, setConversation, createConversation, deleteConversation, sidebarOpen } = useLLM();

  const handleNewChat = useCallback(async () => {
    await createConversation();
  }, [createConversation]);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteConversation(id);
      toast.success('Conversation deleted');
    },
    [deleteConversation],
  );

  return (
    <aside
      className={`flex-none ${sidebarOpen ? 'w-72' : 'w-0'} overflow-hidden border-r border-[#0000001f] bg-[#fafafa] transition-all duration-300 flex flex-col`}
    >
      <div className="flex min-w-[18rem] w-72 flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#0000001f]">
          <span className="text-sm font-semibold text-black">Conversations</span>
          <button
            onClick={onToggle}
            className="rounded-md p-1 text-[#6d6d6d] hover:text-black hover:bg-[#f5f5f5] transition-colors cursor-pointer"
            title="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* New chat button */}
        <div className="px-3 py-2">
          <button
            onClick={handleNewChat}
            className="flex w-full items-center gap-2 rounded-lg border border-[#0000001f] bg-white px-3 py-2 text-sm text-[#6d6d6d] hover:text-black hover:border-[#5505af] transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New chat
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {conversations.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-[#6d6d6d]">
              No conversations yet
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {conversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={conv.id === activeConversationId}
                  onClick={() => setConversation(conv.id)}
                  onDelete={() => handleDelete(conv.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-[#0000001f]">
          <p className="text-[10px] text-[#6d6d6d] text-center">
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </aside>
  );
}
