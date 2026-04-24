"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@techorbit/ui";
import type {
  MessageResponse,
  ThreadResponse,
  ThreadWithMessagesResponse,
} from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { useAuthStore } from "@/store/auth.store";
import { getMessagingClient } from "@/lib/api-client";

const POLL_MS = 10_000;

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

export default function MessagesPage() {
  const { user } = useAuthStore();
  const params = useSearchParams();
  const initialThreadId = params?.get("thread") ?? null;

  const [threads, setThreads] = useState<ThreadResponse[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialThreadId);
  const [thread, setThread] = useState<ThreadWithMessagesResponse | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const loadThreads = useCallback(async () => {
    try {
      const res = await getMessagingClient().listThreads({ limit: 50 });
      setThreads(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load threads");
    }
  }, []);

  const loadThread = useCallback(async (id: string) => {
    try {
      const res = await getMessagingClient().getThread(id);
      setThread(res);
      if (res.unreadCount > 0) {
        await getMessagingClient().markRead(id);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load thread");
    }
  }, []);

  useEffect(() => {
    void loadThreads();
    const poll = setInterval(() => void loadThreads(), POLL_MS);
    return () => clearInterval(poll);
  }, [loadThreads]);

  useEffect(() => {
    if (!selectedId) {
      setThread(null);
      return;
    }
    void loadThread(selectedId);
    const poll = setInterval(() => void loadThread(selectedId), POLL_MS);
    return () => clearInterval(poll);
  }, [selectedId, loadThread]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thread?.messages.length]);

  async function send() {
    if (!selectedId || !draft.trim()) return;
    setSending(true);
    setError(null);
    const content = draft.trim();
    setDraft("");
    try {
      const msg = await getMessagingClient().sendMessage(selectedId, { content });
      setThread((t) => (t ? { ...t, messages: [...t.messages, msg], lastMessageAt: msg.createdAt } : t));
      void loadThreads();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send");
      setDraft(content);
    } finally {
      setSending(false);
    }
  }

  const selectedHeader = useMemo(() => {
    if (!thread) return null;
    const others = thread.participantIds.filter((id) => id !== user?.id);
    return {
      title: thread.subject ?? `Conversation (${others.length + 1} participants)`,
      subtitle: `${thread.contextType.toLowerCase()} · ${others.length} other${others.length === 1 ? "" : "s"}`,
    };
  }, [thread, user?.id]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-forest-900">Messages</h1>
        <p className="text-sage-500 text-sm mt-0.5">
          Threads refresh every {POLL_MS / 1000}s.
        </p>
      </div>

      {error && <div className="mb-4 p-3 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
        {/* Left: thread list */}
        <div className="rounded-2xl border border-surface-border bg-surface overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-surface-border">
            <p className="text-xs font-semibold text-sage-500 uppercase tracking-wider">All threads</p>
          </div>
          {threads.length === 0 ? (
            <p className="p-4 text-sage-500 text-sm">No messages yet. Threads will appear here when someone reaches out to you.</p>
          ) : (
            <ul className="overflow-y-auto flex-1">
              {threads.map((t) => {
                const isActive = t.id === selectedId;
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => setSelectedId(t.id)}
                      className={`w-full text-left px-4 py-3 border-b border-surface-border/50 hover:bg-cream-50 transition-colors ${
                        isActive ? "bg-forest-50" : ""
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={`text-sm ${t.unreadCount > 0 ? "font-semibold text-forest-900" : "text-forest-900"}`}>
                          {t.subject ?? t.contextType.toLowerCase()}
                        </p>
                        <span className="text-xs text-sage-500 shrink-0">{timeAgo(t.lastMessageAt)}</span>
                      </div>
                      <p className="text-xs text-sage-600 mt-0.5 truncate">
                        {t.lastMessagePreview ?? "No messages yet"}
                      </p>
                      {t.unreadCount > 0 && (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-forest-700 text-cream-100">
                          {t.unreadCount} new
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Right: chat window */}
        <div className="md:col-span-2 rounded-2xl border border-surface-border bg-surface overflow-hidden flex flex-col">
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center text-center p-6">
              <div>
                <p className="text-2xl mb-2">💬</p>
                <p className="text-sage-600 text-sm">Select a conversation to get started</p>
              </div>
            </div>
          ) : !thread ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sage-500 text-sm">Loading…</p>
            </div>
          ) : (
            <>
              <div className="px-5 py-4 border-b border-surface-border">
                <p className="text-sm font-semibold text-forest-900">{selectedHeader?.title}</p>
                <p className="text-xs text-sage-500 mt-0.5">{selectedHeader?.subtitle}</p>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {thread.messages.map((m) => <MessageBubble key={m.id} message={m} isMe={m.senderUserId === user?.id} />)}
              </div>
              <div className="px-5 py-3 border-t border-surface-border flex gap-2">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  placeholder="Type a message…"
                  disabled={sending}
                  className="flex-1 px-3 py-2 rounded-lg border border-surface-border bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm"
                />
                <Button onClick={send} disabled={sending || !draft.trim()}>
                  {sending ? "…" : "Send"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, isMe }: { message: MessageResponse; isMe: boolean }) {
  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 ${
          isMe ? "bg-forest-700 text-cream-100 rounded-br-sm" : "bg-surface-soft text-forest-900 rounded-bl-sm"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        <p className={`text-[10px] mt-1 ${isMe ? "text-mint-200" : "text-sage-500"}`}>
          {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}
