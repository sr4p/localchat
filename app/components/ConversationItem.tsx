import { useCallback } from 'react'
import { Trash2 } from 'lucide-react'

interface ConversationItemProps {
  conversation: { id: string; title: string; messageCount: number; updatedAt: string }
  isActive: boolean
  onClick: () => void
  onDelete: () => void
}

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export function ConversationItem({ conversation, isActive, onClick, onDelete }: ConversationItemProps) {
  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onDelete()
    },
    [onDelete],
  )

  return (
    <div
      onClick={onClick}
      className={`group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
        isActive
          ? 'bg-[#5505af]/10 text-black'
          : 'text-[#6d6d6d] hover:bg-[#f5f5f5] hover:text-black'
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{conversation.title}</p>
        <p className="text-xs text-[#6d6d6d]">
          {conversation.messageCount} messages · {formatRelative(conversation.updatedAt)}
        </p>
      </div>
      <button
        onClick={handleDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-1 text-[#6d6d6d] hover:text-red-500 hover:bg-red-50"
        title="Delete conversation"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
