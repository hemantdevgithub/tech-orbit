import type { Prisma, Thread, Message } from "../generated/client/index.js";
import type { ThreadContextType } from "@techorbit/types";
import { prisma } from "../lib/prisma.js";

export async function createThread(
  tx: Prisma.TransactionClient,
  input: {
    contextType: ThreadContextType;
    contextId: string;
    participantIds: string[];
    subject: string | null;
  },
): Promise<Thread> {
  return tx.thread.create({ data: input });
}

export async function createMessage(
  tx: Prisma.TransactionClient,
  input: {
    threadId: string;
    senderUserId: string;
    content: string;
  },
): Promise<Message> {
  const message = await tx.message.create({
    data: {
      threadId: input.threadId,
      senderUserId: input.senderUserId,
      content: input.content,
      readBy: [input.senderUserId],
    },
  });
  await tx.thread.update({
    where: { id: input.threadId },
    data: { lastMessageAt: message.createdAt },
  });
  return message;
}

export async function findThreadById(id: string): Promise<Thread | null> {
  return prisma.thread.findUnique({ where: { id } });
}

export async function findThreadWithMessages(
  id: string,
): Promise<(Thread & { messages: Message[] }) | null> {
  return prisma.thread.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

export async function listThreadsForUser(params: {
  userId: string;
  contextType?: ThreadContextType;
  contextId?: string;
  cursor?: string;
  limit: number;
}): Promise<Array<Thread & { messages: Message[] }>> {
  const where: Prisma.ThreadWhereInput = {
    participantIds: { has: params.userId },
  };
  if (params.contextType) where.contextType = params.contextType;
  if (params.contextId) where.contextId = params.contextId;

  return prisma.thread.findMany({
    where,
    orderBy: { lastMessageAt: "desc" },
    take: params.limit + 1,
    ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
}

export async function markThreadRead(
  userId: string,
  threadId: string,
): Promise<number> {
  // Add the userId to any messages' readBy arrays where it isn't already present.
  const unread = await prisma.message.findMany({
    where: {
      threadId,
      NOT: { readBy: { has: userId } },
    },
    select: { id: true },
  });
  if (unread.length === 0) return 0;
  await prisma.$transaction(
    unread.map((m) =>
      prisma.message.update({
        where: { id: m.id },
        data: { readBy: { push: userId } },
      }),
    ),
  );
  return unread.length;
}

export async function countUnreadForUser(
  userId: string,
  threadId: string,
): Promise<number> {
  return prisma.message.count({
    where: {
      threadId,
      NOT: { readBy: { has: userId } },
    },
  });
}
