"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Database, MessageSquare, Users, Clock, ChevronDown, ChevronRight } from "lucide-react";

interface DbStats {
  conversationCount: number;
  messageCount: number;
  usageByModel: Record<string, number>;
  recentMessages: {
    id: string;
    role: string;
    content: string;
    modelName: string;
    createdAt: string;
  }[];
}

interface DbConversation {
  id: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface DbMessage {
  id: string;
  role: string;
  content: string;
  reasoning: string | null;
  durationSec: number | null;
  tokenCount: number | null;
  modelName: string | null;
  modelType: string | null;
  createdAt: string;
}

type Tab = "stats" | "conversations";

export function DbPreviewPage({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>("stats");
  const [stats, setStats] = useState<DbStats | null>(null);
  const [conversations, setConversations] = useState<DbConversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [convMessages, setConvMessages] = useState<DbMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/db-preview/stats").then((r) => r.json()).then(setStats),
      fetch("/api/db-preview/conversations").then((r) => r.json()).then(setConversations),
    ]).finally(() => setLoading(false));
  }, []);

  const handleSelectConversation = async (id: string) => {
    if (selectedConvId === id) {
      setSelectedConvId(null);
      setConvMessages([]);
      return;
    }
    setSelectedConvId(id);
    setLoadingMessages(true);
    const messages = await fetch(`/api/db-preview/messages/${id}`).then((r) => r.json());
    setConvMessages(messages);
    setLoadingMessages(false);
  };

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100">
      <header className="flex-none flex items-center gap-3 border-b border-slate-700/50 px-6 py-4">
        <button
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors cursor-pointer"
          title="Back to home"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Database className="h-5 w-5 text-violet-400" />
        <h1 className="text-lg font-semibold">Database Preview</h1>
      </header>

      <nav className="flex-none flex gap-2 border-b border-slate-700/50 px-6 pt-3">
        {(["stats", "conversations"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSelectedConvId(null); }}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors cursor-pointer capitalize ${
              tab === t
                ? "bg-violet-600/20 text-violet-300"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      <main className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            Loading…
          </div>
        ) : tab === "stats" ? (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 max-w-3xl">
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <MessageSquare className="h-4 w-4" /> Conversations
                </div>
                <p className="mt-2 text-3xl font-bold">{stats?.conversationCount ?? 0}</p>
              </div>
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Users className="h-4 w-4" /> Messages
                </div>
                <p className="mt-2 text-3xl font-bold">{stats?.messageCount ?? 0}</p>
              </div>
              <div className="col-span-2 rounded-xl border border-slate-700/50 bg-slate-800/60 p-5 sm:col-span-1">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Clock className="h-4 w-4" /> Models
                </div>
                <p className="mt-2 text-3xl font-bold">
                  {stats ? Object.keys(stats.usageByModel).length : 0}
                </p>
              </div>
            </div>

            {/* Usage by model */}
            {stats && Object.keys(stats.usageByModel).length > 0 && (
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5 max-w-3xl">
                <h3 className="text-sm font-medium text-slate-300 mb-3">Usage by Model</h3>
                <div className="space-y-2">
                  {Object.entries(stats.usageByModel).map(([model, count]) => (
                    <div key={model} className="flex items-center justify-between rounded-lg bg-slate-700/30 px-3 py-2">
                      <span className="text-sm">{model}</span>
                      <span className="text-sm font-medium text-violet-300">{count} messages</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent messages */}
            {stats && stats.recentMessages.length > 0 && (
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5 max-w-3xl">
                <h3 className="text-sm font-medium text-slate-300 mb-3">Recent Messages</h3>
                <div className="space-y-2">
                  {stats.recentMessages.map((m) => (
                    <div key={m.id} className="rounded-lg bg-slate-700/30 px-3 py-2">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span className={`px-1.5 py-0.5 rounded ${m.role === "user" ? "bg-blue-500/10 text-blue-300" : "bg-emerald-500/10 text-emerald-300"}`}>
                          {m.role}
                        </span>
                        <span>{m.modelName}</span>
                      </div>
                      <p className="truncate text-sm">{m.content || "(empty)"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2 max-w-3xl">
            {conversations.length === 0 ? (
              <p className="py-20 text-center text-slate-500">No conversations yet.</p>
            ) : (
              conversations.map((c) => (
                <div key={c.id}>
                  <button
                    onClick={() => handleSelectConversation(c.id)}
                    className="w-full flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/60 px-4 py-3 hover:bg-slate-700/60 transition-colors cursor-pointer text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.title}</p>
                      <p className="text-xs text-slate-400">
                        {c.messageCount} messages · updated {new Date(c.updatedAt).toLocaleString()}
                      </p>
                    </div>
                    {selectedConvId === c.id ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                    )}
                  </button>
                  {selectedConvId === c.id && (
                    <div className="ml-6 mt-2 space-y-1 border-l-2 border-slate-700/50 pl-4">
                      {loadingMessages ? (
                        <p className="py-4 text-sm text-slate-500">Loading messages…</p>
                      ) : convMessages.length === 0 ? (
                        <p className="py-4 text-sm text-slate-500">No messages.</p>
                      ) : (
                        convMessages.map((m) => (
                          <div key={m.id} className="rounded-md bg-slate-800/80 p-3">
                            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                              <span className={`px-1.5 py-0.5 rounded ${m.role === "user" ? "bg-blue-500/10 text-blue-300" : "bg-emerald-500/10 text-emerald-300"}`}>
                                {m.role}
                              </span>
                              {m.modelName && <span>{m.modelName}</span>}
                              {m.durationSec != null && <span>{m.durationSec}s</span>}
                              {m.tokenCount != null && <span>{m.tokenCount} tokens</span>}
                            </div>
                            <p className="whitespace-pre-wrap text-sm text-slate-200 line-clamp-3">
                              {m.content || "(empty)"}
                            </p>
                            {m.tokenCount != null && (
                              <p className="mt-1 text-xs text-slate-500">
                                {new Date(m.createdAt).toLocaleTimeString()}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
