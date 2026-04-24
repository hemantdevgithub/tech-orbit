import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import {
  IDS,
  closeServer,
  getPrisma,
  getServer,
  makeBearerToken,
  resetDb,
  runIntegrationSuite,
  stubCrossServiceFetch,
} from "./helpers.js";

runIntegrationSuite("Messaging API", () => {
  beforeAll(async () => {
    await getServer();
  });
  afterAll(async () => {
    await closeServer();
  });
  beforeEach(async () => {
    await resetDb();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("1. create GENERAL thread → stored with correct participants", async () => {
    const app = await getServer();
    const token = await makeBearerToken(IDS.customer, ["CUSTOMER"]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/threads",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        contextType: "GENERAL",
        contextId: "00000000-0000-0000-0000-000000000001",
        participantIds: [IDS.candidate],
        subject: "Test thread",
        initialMessage: "Hello from customer",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.participantIds).toContain(IDS.customer);
    expect(body.participantIds).toContain(IDS.candidate);
    expect(body.subject).toBe("Test thread");
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].content).toBe("Hello from customer");

    const row = await getPrisma().thread.findUnique({ where: { id: body.id } });
    expect(row).not.toBeNull();
    expect(row!.participantIds.sort()).toEqual([IDS.customer, IDS.candidate].sort());
  });

  it("2. send message in thread → stored with sender, createdAt set", async () => {
    const app = await getServer();
    const customerToken = await makeBearerToken(IDS.customer, ["CUSTOMER"]);
    const candidateToken = await makeBearerToken(IDS.candidate, ["CANDIDATE"]);

    const threadRes = await app.inject({
      method: "POST",
      url: "/api/v1/threads",
      headers: { authorization: `Bearer ${customerToken}` },
      payload: {
        contextType: "GENERAL",
        contextId: "00000000-0000-0000-0000-000000000001",
        participantIds: [IDS.candidate],
        initialMessage: "First",
      },
    });
    const threadId = threadRes.json().id;

    const msgRes = await app.inject({
      method: "POST",
      url: `/api/v1/threads/${threadId}/messages`,
      headers: { authorization: `Bearer ${candidateToken}` },
      payload: { content: "Reply from candidate" },
    });

    expect(msgRes.statusCode).toBe(201);
    const msg = msgRes.json();
    expect(msg.senderUserId).toBe(IDS.candidate);
    expect(msg.content).toBe("Reply from candidate");
    expect(msg.createdAt).toBeTruthy();

    const row = await getPrisma().message.findUnique({ where: { id: msg.id } });
    expect(row).not.toBeNull();
    expect(row!.readBy).toContain(IDS.candidate);
  });

  it("3. mark thread read → readBy array updated", async () => {
    const app = await getServer();
    const customerToken = await makeBearerToken(IDS.customer, ["CUSTOMER"]);
    const candidateToken = await makeBearerToken(IDS.candidate, ["CANDIDATE"]);

    const threadRes = await app.inject({
      method: "POST",
      url: "/api/v1/threads",
      headers: { authorization: `Bearer ${customerToken}` },
      payload: {
        contextType: "GENERAL",
        contextId: "00000000-0000-0000-0000-000000000001",
        participantIds: [IDS.candidate],
        initialMessage: "Hello",
      },
    });
    const threadId = threadRes.json().id;

    const markRes = await app.inject({
      method: "POST",
      url: `/api/v1/threads/${threadId}/mark-read`,
      headers: { authorization: `Bearer ${candidateToken}` },
    });
    expect(markRes.statusCode).toBe(200);
    expect(markRes.json().updatedCount).toBe(1);

    const msg = await getPrisma().message.findFirst({ where: { threadId } });
    expect(msg!.readBy).toContain(IDS.candidate);
  });

  it("4. list threads → only threads where user is participant", async () => {
    const app = await getServer();
    const customerToken = await makeBearerToken(IDS.customer, ["CUSTOMER"]);
    const candidateToken = await makeBearerToken(IDS.candidate, ["CANDIDATE"]);
    const strangerToken = await makeBearerToken(IDS.stranger, ["CUSTOMER"]);

    await app.inject({
      method: "POST",
      url: "/api/v1/threads",
      headers: { authorization: `Bearer ${customerToken}` },
      payload: {
        contextType: "GENERAL",
        contextId: "00000000-0000-0000-0000-000000000001",
        participantIds: [IDS.candidate],
        initialMessage: "A",
      },
    });
    await app.inject({
      method: "POST",
      url: "/api/v1/threads",
      headers: { authorization: `Bearer ${candidateToken}` },
      payload: {
        contextType: "GENERAL",
        contextId: "00000000-0000-0000-0000-000000000002",
        participantIds: [IDS.srm],
        initialMessage: "B",
      },
    });

    const listForCustomer = await app.inject({
      method: "GET",
      url: "/api/v1/threads",
      headers: { authorization: `Bearer ${customerToken}` },
    });
    expect(listForCustomer.json().data).toHaveLength(1);

    const listForStranger = await app.inject({
      method: "GET",
      url: "/api/v1/threads",
      headers: { authorization: `Bearer ${strangerToken}` },
    });
    expect(listForStranger.json().data).toHaveLength(0);
  });

  it("5. GET thread → messages sorted by createdAt asc", async () => {
    const app = await getServer();
    const customerToken = await makeBearerToken(IDS.customer, ["CUSTOMER"]);
    const candidateToken = await makeBearerToken(IDS.candidate, ["CANDIDATE"]);

    const threadRes = await app.inject({
      method: "POST",
      url: "/api/v1/threads",
      headers: { authorization: `Bearer ${customerToken}` },
      payload: {
        contextType: "GENERAL",
        contextId: "00000000-0000-0000-0000-000000000001",
        participantIds: [IDS.candidate],
        initialMessage: "Msg 1",
      },
    });
    const threadId = threadRes.json().id;

    await app.inject({
      method: "POST",
      url: `/api/v1/threads/${threadId}/messages`,
      headers: { authorization: `Bearer ${candidateToken}` },
      payload: { content: "Msg 2" },
    });
    await app.inject({
      method: "POST",
      url: `/api/v1/threads/${threadId}/messages`,
      headers: { authorization: `Bearer ${customerToken}` },
      payload: { content: "Msg 3" },
    });

    const getRes = await app.inject({
      method: "GET",
      url: `/api/v1/threads/${threadId}`,
      headers: { authorization: `Bearer ${customerToken}` },
    });

    const msgs = getRes.json().messages;
    expect(msgs.map((m: { content: string }) => m.content)).toEqual(["Msg 1", "Msg 2", "Msg 3"]);
  });

  it("6. non-participant GET thread → 403", async () => {
    const app = await getServer();
    const customerToken = await makeBearerToken(IDS.customer, ["CUSTOMER"]);
    const strangerToken = await makeBearerToken(IDS.stranger, ["CUSTOMER"]);

    const threadRes = await app.inject({
      method: "POST",
      url: "/api/v1/threads",
      headers: { authorization: `Bearer ${customerToken}` },
      payload: {
        contextType: "GENERAL",
        contextId: "00000000-0000-0000-0000-000000000001",
        participantIds: [IDS.candidate],
        initialMessage: "Private",
      },
    });
    const threadId = threadRes.json().id;

    const getRes = await app.inject({
      method: "GET",
      url: `/api/v1/threads/${threadId}`,
      headers: { authorization: `Bearer ${strangerToken}` },
    });

    expect(getRes.statusCode).toBe(403);
  });

  it("7. non-participant POST message → 403", async () => {
    const app = await getServer();
    const customerToken = await makeBearerToken(IDS.customer, ["CUSTOMER"]);
    const strangerToken = await makeBearerToken(IDS.stranger, ["CUSTOMER"]);

    const threadRes = await app.inject({
      method: "POST",
      url: "/api/v1/threads",
      headers: { authorization: `Bearer ${customerToken}` },
      payload: {
        contextType: "GENERAL",
        contextId: "00000000-0000-0000-0000-000000000001",
        participantIds: [IDS.candidate],
        initialMessage: "Hi",
      },
    });
    const threadId = threadRes.json().id;

    const msgRes = await app.inject({
      method: "POST",
      url: `/api/v1/threads/${threadId}/messages`,
      headers: { authorization: `Bearer ${strangerToken}` },
      payload: { content: "Injecting into private thread" },
    });

    expect(msgRes.statusCode).toBe(403);
  });

  it("8. PLACEMENT context → participants auto-resolved (customer + candidate)", async () => {
    stubCrossServiceFetch({
      placement: {
        id: IDS.placement,
        candidateId: IDS.candidate,
        createdByUserId: IDS.customer,
        status: "ACTIVE",
      },
    });
    const app = await getServer();
    const token = await makeBearerToken(IDS.customer, ["CUSTOMER"]);

    // Supplied participantIds should be IGNORED for non-GENERAL contexts.
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/threads",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        contextType: "PLACEMENT",
        contextId: IDS.placement,
        participantIds: [IDS.stranger],
        initialMessage: "Kickoff",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.participantIds.sort()).toEqual([IDS.customer, IDS.candidate].sort());
    expect(body.participantIds).not.toContain(IDS.stranger);
    expect(body.contextType).toBe("PLACEMENT");
  });
});
