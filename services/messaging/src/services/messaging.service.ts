import { ForbiddenError, NotFoundError, ValidationError } from "@techorbit/errors";
import type { AuthContext } from "@techorbit/auth-middleware";
import type {
  CreateThreadRequest,
  MessageResponse,
  SendMessageRequest,
  ThreadFilter,
  ThreadListResponse,
  ThreadResponse,
  ThreadWithMessagesResponse,
} from "@techorbit/types";
import type { Message, Thread } from "../generated/client/index.js";
import { prisma } from "../lib/prisma.js";
import { buildEvent, enqueueEvent } from "../lib/outbox.js";
import type { ParticipantResolver } from "../lib/participant-resolver.js";
import {
  countUnreadForUser,
  createMessage,
  createThread,
  findThreadById,
  findThreadWithMessages,
  listThreadsForUser,
  markThreadRead,
} from "../repositories/thread.repository.js";

function toMessage(m: Message): MessageResponse {
  return {
    id: m.id,
    threadId: m.threadId,
    senderUserId: m.senderUserId,
    content: m.content,
    readBy: m.readBy,
    createdAt: m.createdAt.toISOString(),
  };
}

function toThreadBase(
  t: Thread,
  unreadCount: number,
  lastMessagePreview: string | null,
): ThreadResponse {
  return {
    id: t.id,
    contextType: t.contextType,
    contextId: t.contextId,
    participantIds: t.participantIds,
    subject: t.subject,
    lastMessageAt: t.lastMessageAt.toISOString(),
    createdAt: t.createdAt.toISOString(),
    unreadCount,
    lastMessagePreview,
  };
}

function ensureParticipant(thread: Thread, userId: string): void {
  if (!thread.participantIds.includes(userId)) {
    throw new ForbiddenError("Not a participant of this thread");
  }
}

export type MessagingServiceDeps = {
  participantResolver: ParticipantResolver;
};

export type MessagingService = ReturnType<typeof createMessagingService>;

export function createMessagingService(deps: MessagingServiceDeps) {
  return {
    async createThread(
      auth: AuthContext,
      body: CreateThreadRequest,
    ): Promise<ThreadWithMessagesResponse> {
      const resolved = await deps.participantResolver.resolve({
        contextType: body.contextType,
        contextId: body.contextId,
        callerUserId: auth.userId,
        suppliedParticipantIds: body.participantIds,
      });

      if (!resolved.participantIds.includes(auth.userId)) {
        throw new ForbiddenError("Caller is not a participant for this context");
      }
      if (resolved.participantIds.length < 2) {
        throw new ValidationError("A thread needs at least two participants");
      }

      const result = await prisma.$transaction(async (tx) => {
        const thread = await createThread(tx, {
          contextType: body.contextType,
          contextId: body.contextId,
          participantIds: resolved.participantIds,
          subject: body.subject ?? null,
        });
        const message = await createMessage(tx, {
          threadId: thread.id,
          senderUserId: auth.userId,
          content: body.initialMessage,
        });
        const event = buildEvent("message.sent.v1", {
          threadId: thread.id,
          messageId: message.id,
          senderUserId: auth.userId,
          recipientUserIds: thread.participantIds.filter((id) => id !== auth.userId),
          contextType: thread.contextType,
          contextId: thread.contextId,
          preview: message.content.slice(0, 200),
        });
        await enqueueEvent(tx, event, thread.id);
        return { thread, message };
      });

      return {
        ...toThreadBase(result.thread, 0, result.message.content.slice(0, 200)),
        messages: [toMessage(result.message)],
      };
    },

    async listThreads(auth: AuthContext, filter: ThreadFilter): Promise<ThreadListResponse> {
      const rows = await listThreadsForUser({
        userId: auth.userId,
        contextType: filter.contextType,
        contextId: filter.contextId,
        cursor: filter.cursor,
        limit: filter.limit,
      });
      const hasMore = rows.length > filter.limit;
      const sliced = hasMore ? rows.slice(0, filter.limit) : rows;

      const data: ThreadResponse[] = await Promise.all(
        sliced.map(async (t) => {
          const unreadCount = await countUnreadForUser(auth.userId, t.id);
          const preview = t.messages[0]?.content.slice(0, 200) ?? null;
          return toThreadBase(t, unreadCount, preview);
        }),
      );

      return {
        data,
        nextCursor: hasMore ? (sliced[sliced.length - 1]?.id ?? null) : null,
        hasMore,
      };
    },

    async getThread(auth: AuthContext, id: string): Promise<ThreadWithMessagesResponse> {
      const thread = await findThreadWithMessages(id);
      if (!thread) throw new NotFoundError("Thread not found");
      ensureParticipant(thread, auth.userId);
      const unreadCount = await countUnreadForUser(auth.userId, thread.id);
      const lastMessage = thread.messages[thread.messages.length - 1];
      return {
        ...toThreadBase(thread, unreadCount, lastMessage?.content.slice(0, 200) ?? null),
        messages: thread.messages.map(toMessage),
      };
    },

    async sendMessage(
      auth: AuthContext,
      threadId: string,
      body: SendMessageRequest,
    ): Promise<MessageResponse> {
      const thread = await findThreadById(threadId);
      if (!thread) throw new NotFoundError("Thread not found");
      ensureParticipant(thread, auth.userId);

      const message = await prisma.$transaction(async (tx) => {
        const m = await createMessage(tx, {
          threadId,
          senderUserId: auth.userId,
          content: body.content,
        });
        const event = buildEvent("message.sent.v1", {
          threadId,
          messageId: m.id,
          senderUserId: auth.userId,
          recipientUserIds: thread.participantIds.filter((id) => id !== auth.userId),
          contextType: thread.contextType,
          contextId: thread.contextId,
          preview: m.content.slice(0, 200),
        });
        await enqueueEvent(tx, event, threadId);
        return m;
      });
      return toMessage(message);
    },

    async markRead(auth: AuthContext, threadId: string): Promise<{ updatedCount: number }> {
      const thread = await findThreadById(threadId);
      if (!thread) throw new NotFoundError("Thread not found");
      ensureParticipant(thread, auth.userId);
      const updatedCount = await markThreadRead(auth.userId, threadId);
      return { updatedCount };
    },
  };
}
