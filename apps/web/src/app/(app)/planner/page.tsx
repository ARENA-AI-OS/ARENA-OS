"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
  createdAt: string;
}

export default function PlannerPage() {
  const router = useRouter();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [model, setModel] = useState("mock");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function startConversation() {
    const res = await fetch("/api/v1/chat/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New Planning Chat", modelProvider: model }),
    });
    const conv = await res.json();
    setConversationId(conv.id);
    setMessages([]);
  }

  async function sendMessage() {
    if (!input.trim() || sending) return;
    if (!conversationId) {
      await startConversation();
      return;
    }
    const content = input.trim();
    setInput("");
    setSending(true);

    // Add user message immediately
    const userMsg: Message = { id: `temp_${Date.now()}`, role: "user", content, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch(`/api/v1/chat/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => !m.id.startsWith("temp_"));
        return [...withoutTemp, data.user, data.assistant];
      });
    } catch {
      setMessages((prev) => prev.filter((m) => !m.id.startsWith("temp_")));
    }
    setSending(false);
  }

  async function handOff() {
    if (!conversationId) return;
    setSending(true);
    try {
      const res = await fetch(`/api/v1/chat/conversations/${conversationId}/handoff`, { method: "POST" });
      const data = await res.json();
      if (data.mission) {
        router.push(`/missions/${data.mission.id}`);
      }
    } catch {}
    setSending(false);
  }

  return (
    <div className="min-h-screen flex flex-col max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">
            <span className="text-arena-cyan">Planning</span> Assistant
          </h1>
          <p className="text-[11px] text-arena-muted">Conversational planner — reasons about approach, never executes</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="text-[11px] bg-arena-panel border border-arena-border rounded px-2 py-1 text-arena-text"
          >
            <option value="mock">Mock (default)</option>
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini</option>
            <option value="claude">Claude</option>
          </select>
          {conversationId && (
            <button onClick={handOff} disabled={sending} className="text-[11px] px-3 py-1 rounded bg-arena-blue/20 text-arena-blue border border-arena-blue/30 hover:bg-arena-blue/30 transition-colors disabled:opacity-50">
              Hand off to Arena →
            </button>
          )}
        </div>
      </div>

      {/* Capability badge */}
      <div className="mb-4 flex gap-2">
        <span className="text-[10px] px-2 py-0.5 rounded bg-arena-panel border border-arena-border text-arena-muted">Zero tools — conversation only</span>
        <span className="text-[10px] px-2 py-0.5 rounded bg-arena-panel border border-arena-border text-arena-muted">Read-only context</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="text-center py-20">
            <div className="text-4xl mb-4 text-arena-cyan/30">◈</div>
            <p className="text-arena-muted text-sm">What do you want to build?</p>
            <p className="text-arena-muted/60 text-xs mt-1">I&apos;ll help you plan the approach, then hand it off to Arena&apos;s execution pipeline.</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${
              msg.role === "user"
                ? "bg-arena-blue/15 text-arena-text border border-arena-blue/20"
                : "bg-arena-panel border border-arena-border text-arena-text"
            }`}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.model && msg.role === "assistant" && (
                <div className="text-[10px] text-arena-muted mt-2">via {msg.model}</div>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-arena-panel border border-arena-border rounded-lg px-4 py-3 text-sm text-arena-muted">
              <span className="animate-pulse">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-arena-border pt-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Describe what you want to build or accomplish…"
            className="flex-1 bg-arena-panel border border-arena-border rounded-lg px-4 py-2.5 text-sm text-arena-text placeholder:text-arena-muted/50 focus:outline-none focus:border-arena-blue/50"
            disabled={sending}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="px-4 py-2.5 rounded-lg bg-arena-blue/20 text-arena-blue border border-arena-blue/30 hover:bg-arena-blue/30 transition-colors text-sm disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
