import { X } from 'lucide-react';
import { useEffect, useCallback, type FC } from 'react';

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ['⌘Z', 'Ctrl+Z'], description: 'Undo last action' },
  { keys: ['⌘⇧Z', 'Ctrl+Shift+Z'], description: 'Redo undone action' },
  { keys: ['Enter'], description: 'Send message' },
  { keys: ['Shift+Enter'], description: 'New line' },
  { keys: ['?'], description: 'Toggle shortcuts help' },
  { keys: ['Escape'], description: 'Stop generation / Close modals' },
  { keys: ['⌘K', 'Ctrl+K'], description: 'Search conversations' },
];

export const KeyboardShortcutsModal: FC<KeyboardShortcutsModalProps> = ({ open, onClose }) => {
  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    },
    [open, onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [handleEsc]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-lg rounded-2xl border border-[#0000001f] bg-white p-6 shadow-2xl animate-rise-in"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
          }
        }}
        tabIndex={-1}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="shortcuts-modal-title" className="text-lg font-semibold text-black">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#6d6d6d] hover:bg-[#f5f5f5] hover:text-black transition-colors cursor-pointer"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          {SHORTCUTS.map(({ keys, description }) => (
            <div
              key={description}
              className="flex items-center justify-between rounded-lg px-2 py-2 text-sm"
            >
              <span className="text-[#3d3d3d]">{description}</span>
              <div className="flex items-center gap-1.5">
                {keys.map((key) => (
                  <kbd
                    key={key}
                    className="inline-flex min-w-[2rem] items-center justify-center rounded-md border border-[#0000001f] bg-[#f8f8fa] px-1.5 py-0.5 text-[11px] font-medium font-support text-[#3d3d3d] shadow-sm"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
