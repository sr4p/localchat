import { useCallback, useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  Settings,
  Search,
  Keyboard,
  Undo2,
  Redo2,
  GitBranch,
  Plus,
} from "lucide-react";

interface RightPanelItem {
  icon?: React.ElementType;
  label?: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  divider?: boolean;
}

interface RightPanelProps {
  activePage: string;
  viewMode: "linear" | "tree";
  canUndo: boolean;
  canRedo: boolean;
  isGenerating: boolean;
  onSetActivePage: (page: string) => void;
  onNewChat: () => void;
  onSearch: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleTree: () => void;
  onShortcuts: () => void;
}

export function RightPanel({
  activePage,
  viewMode,
  canUndo,
  canRedo,
  isGenerating,
  onSetActivePage,
  onNewChat,
  onSearch,
  onUndo,
  onRedo,
  onToggleTree,
  onShortcuts,
}: RightPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const isHoveringRef = useRef(false);

  const handleMouseEnter = useCallback(() => {
    clearTimeout(timerRef.current);
    isHoveringRef.current = true;
    setExpanded(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    isHoveringRef.current = false;
    timerRef.current = setTimeout(() => {
      if (!isHoveringRef.current) setExpanded(false);
    }, 150);
  }, []);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const items: RightPanelItem[] = [
    {
      icon: MessageSquare,
      label: "Chat",
      active: activePage === "chat",
      onClick: () => onSetActivePage("chat"),
    },
    {
      icon: Settings,
      label: "Settings",
      active: activePage === "settings",
      onClick: () => onSetActivePage("settings"),
    },
    { divider: true },
    {
      icon: Plus,
      label: "New Chat",
      onClick: onNewChat,
    },
    {
      icon: Search,
      label: "Search",
      onClick: onSearch,
    },
    {
      icon: Undo2,
      label: "Undo",
      disabled: !canUndo || isGenerating,
      onClick: onUndo,
    },
    {
      icon: Redo2,
      label: "Redo",
      disabled: !canRedo || isGenerating,
      onClick: onRedo,
    },
    {
      icon: GitBranch,
      label: "Tree View",
      active: viewMode === "tree",
      onClick: onToggleTree,
    },
    { divider: true },
    {
      icon: Keyboard,
      label: "Shortcuts",
      onClick: onShortcuts,
    },
  ];

  return (
    <div
      className={`flex flex-col h-full overflow-hidden transition-all duration-200 ease-out bg-white/80 backdrop-blur-sm border-l border-[#0000001f] ${
        expanded ? "w-[200px]" : "w-12"
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex-1 flex flex-col py-2 gap-0.5 px-1.5 overflow-hidden">
        {items.map((item, i) =>
          item.divider ? (
            <hr
              key={`d-${i}`}
              className="border-t border-[#0000001f] my-1.5 mx-1 shrink-0"
            />
          ) : (
            <button
              key={item.label}
              type="button"
              onClick={item.disabled ? undefined : item.onClick}
              disabled={item.disabled}
              className="flex items-center h-9 min-w-0 rounded-md px-2 transition-colors shrink-0 cursor-pointer group/item disabled:opacity-30 disabled:pointer-events-none
                hover:bg-[#f5f5f5]
                data-[active=true]:bg-[#5505af] data-[active=true]:hover:bg-[#4a0499]
              "
              data-active={item.active ?? false}
              title={item.label}
            >
              <item.icon
                className={`h-4 w-4 shrink-0 transition-colors ${
                  item.active
                    ? "text-white"
                    : item.disabled
                    ? "text-[#c0c0c0]"
                    : "text-[#6d6d6d] group-hover/item:text-black"
                }`}
              />
              <span
                className={`text-xs font-medium ml-3 whitespace-nowrap transition-opacity duration-150 ${
                  item.active
                    ? "text-white"
                    : item.disabled
                    ? "text-[#c0c0c0]"
                    : "text-[#6d6d6d] group-hover/item:text-black"
                } ${expanded ? "opacity-100" : "opacity-0"}`}
              >
                {item.label}
              </span>
            </button>
          ),
        )}
      </div>
    </div>
  );
}
