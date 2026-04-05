import { useEffect, useRef, useState } from 'react';
import { Search, X, MessageSquare } from 'lucide-react';
import { api } from '../utils/api-client';

interface SearchResult {
  id: string;
  content: string;
  role: string;
  modelName: string | null;
  conversationId: string;
  conversationTitle: string;
  createdAt: string;
}

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  onNavigateToConversation: (convId: string, msgId: string) => void;
}

export function SearchModal({ open, onClose, onNavigateToConversation }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !query.trim()) {
      setResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await api.post<{ results: SearchResult[]; total: number }>(
          '/api/embeddings/search',
          { query: query.trim(), limit: 20 },
        );
        setResults(data.results);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl animate-rise-in overflow-hidden rounded-2xl border border-[#0000001f] bg-white shadow-2xl">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-[#0000001f] px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-[#6d6d6d]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages across all conversations..."
            className="min-w-0 flex-1 bg-transparent text-sm text-black placeholder-[#6d6d6d] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="rounded-md p-1 text-[#6d6d6d] hover:text-black hover:bg-[#f5f5f5] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {searching && (
            <div className="px-4 py-8 text-center text-sm text-[#6d6d6d]">Searching...</div>
          )}

          {!searching && query.trim().length > 0 && results.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-[#6d6d6d]">No results found</div>
          )}

          {!searching &&
            results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  onNavigateToConversation(r.conversationId, r.id);
                  onClose();
                }}
                className="w-full border-b border-[#0000001f] px-4 py-3 text-left hover:bg-[#f9f5ff] transition-colors last:border-b-0"
              >
                <div className="flex items-start gap-2">
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#5505af]/60" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-black">
                      {r.conversationTitle}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-[#6d6d6d]">{r.content}</p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-[#6d6d6d]">
                      <span className="rounded bg-[#f5f5f5] px-1.5 py-0.5">{r.role}</span>
                      {r.modelName && <span>{r.modelName}</span>}
                      <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}

          {!query.trim() && (
            <div className="px-4 py-8 text-center text-xs text-[#6d6d6d]">
              Type to search across all conversations
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
