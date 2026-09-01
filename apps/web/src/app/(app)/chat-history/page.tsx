import { getRepository } from "@db/index";
import type { Metadata } from "next";
import { ChatHistoryList } from "@/components/chat-history-list";

export const metadata: Metadata = { title: "Chat History" };

export default async function ChatHistoryPage() {
  const repo = getRepository();
  const ws = await repo.ensureSeedWorkspace();
  const conversations = await repo.listChatConversations(ws.id);

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="text-arena-cyan">Chat</span> History
        </h1>
        <p className="text-arena-muted text-sm mt-1">Past planning conversations — continue or hand off to Arena</p>
      </div>
      <ChatHistoryList initialConversations={conversations} />
    </div>
  );
}
