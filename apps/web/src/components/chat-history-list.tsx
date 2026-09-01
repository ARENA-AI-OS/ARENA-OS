"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ChatConversation, ChatMessage } from "@domain/index";

export function ChatHistoryList({ initialConversations }: { initialConversations: ChatConversation[] }) {
  const router = useRouter();
  const [conversations, setConversations] = useState(initialConversations);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  async function viewConversation(id: string) {
    setSelectedId(id);
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/v1/chat/conversations/${id}/messages`);
      const msgs = await res.json();
      setMessages(msgs);
    } catch {}
    setLoadingMessages(false);
  }

  async function deleteConversation(id: string) {
    await fetch(`/api/v1/chat/conversations/${id}`, { method: "DELETE" });
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (selectedId === id) { setSelectedId(null); setMessages([]); }
  }

  async function handOff(id: string) {
    const res = await fetch(`/api/v1/chat/conversations/${id}/handoff`, { method: "POST" });
    const data = await res.json();
    if (data.mission) router.push(`/missions/${data.mission.id}`);
  }

  function continueConversation(id: string) {
    router.push(`/planner?continue=${id}`);
  }

  const selected = conversations.find((c) => c.id === selectedId);

  return (
    <div className="flex gap-6">
      {/* List */}
      <div className="w-80 shrink-0">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search conversations…"
          className="w-full bg-arena-panel border border-arena-border rounded-lg px-3 py-2 text-sm text-arena-text placeholder:text-arena-muted/50 focus:outline-none focus:border-arena-blue/50 mb-4"
        />
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-10 text-arena-muted text-sm">No conversations found</div>
          )}
          {filtered.map((conv) => (
            <div
              key={conv.id}
              onClick={() => viewConversation(conv.id)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedId === conv.id
                  ? "bg-arena-blue/10 border-arena-blue/30"
                  : "bg-arena-panel border-arena-border hover:border-arena-blue/20"
              }`}
            >
              <div className="text-sm text-arena-text font-medium truncate">{conv.title}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-arena-muted">{new Date(conv.updatedAt).toLocaleDateString()}</span>
                {conv.missionId && <span className="text-[10px] px-1 py-0.5 rounded bg-green-500/20 text-green-400">handed off</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex-1 min-w-0">
        {!selected ? (
          <div className="flex items-center justify-center h-64 text-arena-muted text-sm">Select a conversation to view</div>
        ) : (
          <div className="bg-arena-panel border border-arena-border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-arena-border flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-arena-text">{selected.title}</div>
                <div className="text-[10px] text-arena-muted mt-0.5">
                  {new Date(selected.createdAt).toLocaleString()} · {selected.modelProvider}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => continueConversation(selected.id)} className="text-[11px] px-2.5 py-1 rounded border border-arena-border text-arena-muted hover:text-arena-text hover:bg-white/5 transition-colors">
                  Continue
                </button>
                <button onClick={() => handOff(selected.id)} className="text-[11px] px-2.5 py-1 rounded bg-arena-blue/20 text-arena-blue border border-arena-blue/30 hover:bg-arena-blue/30 transition-colors">
                  Hand off to Arena
                </button>
                <button onClick={() => deleteConversation(selected.id)} className="text-[11px] px-2.5 py-1 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors">
                  Delete
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {loadingMessages ? (
                <div className="text-arena-muted text-sm text-center py-8">Loading…</div>
              ) : messages.length === 0 ? (
                <div className="text-arena-muted text-sm text-center py-8">No messages</div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-arena-blue/15 text-arena-text border border-arena-blue/20"
                        : "bg-white/5 text-arena-text border border-arena-border"
                    }`}>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
