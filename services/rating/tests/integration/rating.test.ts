import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import {
  IDS,
  closeServer,
  getPrisma,
  getServer,
  makeBearerToken,
  resetDb,
  runIntegrationSuite,
  stubPlacementFetch,
} from "./helpers.js";

runIntegrationSuite("Ratings API", () => {
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

  it("1. customer submits rating → stored, ratedUserId = candidate", async () => {
    stubPlacementFetch({
      id: IDS.placement,
      candidateId: IDS.candidate,
      createdByUserId: IDS.customer,
      status: "ENDED_COMPLETED",
    });
    const app = await getServer();
    const token = await makeBearerToken(IDS.customer, ["CUSTOMER"]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/ratings",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        placementId: IDS.placement,
        ratedUserId: IDS.candidate,
        overallScore: 5,
        technicalScore: 4,
        feedback: "Excellent work",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.ratedUserId).toBe(IDS.candidate);
    expect(body.raterUserId).toBe(IDS.customer);
    expect(body.raterRole).toBe("CUSTOMER");
    expect(body.overallScore).toBe(5);
    expect(body.technicalScore).toBe(4);
    expect(body.feedback).toBe("Excellent work");

    const row = await getPrisma().rating.findUnique({ where: { id: body.id } });
    expect(row).not.toBeNull();
    expect(row!.raterRole).toBe("CUSTOMER");
  });

  it("2. candidate submits rating → stored, ratedUserId = customer", async () => {
    stubPlacementFetch({
      id: IDS.placement,
      candidateId: IDS.candidate,
      createdByUserId: IDS.customer,
      status: "ENDED_COMPLETED",
    });
    const app = await getServer();
    const token = await makeBearerToken(IDS.candidate, ["CANDIDATE"]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/ratings",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        placementId: IDS.placement,
        ratedUserId: IDS.customer,
        overallScore: 4,
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().raterRole).toBe("CANDIDATE");
    expect(res.json().ratedUserId).toBe(IDS.customer);
  });

  it("3. GET ratings by userId → aggregates calculated", async () => {
    const db = getPrisma();
    await db.rating.createMany({
      data: [
        {
          placementId: IDS.placement,
          ratedUserId: IDS.candidate,
          raterUserId: IDS.customer,
          raterRole: "CUSTOMER",
          overallScore: 5,
          technicalScore: 5,
        },
        {
          placementId: "dddddddd-2222-2222-2222-222222222222",
          ratedUserId: IDS.candidate,
          raterUserId: "aaaaaaaa-2222-2222-2222-222222222222",
          raterRole: "CUSTOMER",
          overallScore: 3,
          technicalScore: 3,
        },
      ],
    });

    const app = await getServer();
    const token = await makeBearerToken(IDS.customer, ["CUSTOMER"]);

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/ratings?userId=${IDS.candidate}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data).toHaveLength(2);
    expect(body.averageOverall).toBe(4);
    expect(body.averageTechnical).toBe(4);
    expect(body.totalCount).toBe(2);
  });

  it("4. duplicate rating (same placement + rater) → 409", async () => {
    stubPlacementFetch({
      id: IDS.placement,
      candidateId: IDS.candidate,
      createdByUserId: IDS.customer,
      status: "ENDED_COMPLETED",
    });
    const app = await getServer();
    const token = await makeBearerToken(IDS.customer, ["CUSTOMER"]);
    const body = {
      placementId: IDS.placement,
      ratedUserId: IDS.candidate,
      overallScore: 5,
    };

    const first = await app.inject({
      method: "POST",
      url: "/api/v1/ratings",
      headers: { authorization: `Bearer ${token}` },
      payload: body,
    });
    expect(first.statusCode).toBe(201);

    const dup = await app.inject({
      method: "POST",
      url: "/api/v1/ratings",
      headers: { authorization: `Bearer ${token}` },
      payload: body,
    });
    expect(dup.statusCode).toBe(409);
  });

  it("5. rating before placement ends → 400", async () => {
    stubPlacementFetch({
      id: IDS.placement,
      candidateId: IDS.candidate,
      createdByUserId: IDS.customer,
      status: "ACTIVE",
    });
    const app = await getServer();
    const token = await makeBearerToken(IDS.customer, ["CUSTOMER"]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/ratings",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        placementId: IDS.placement,
        ratedUserId: IDS.candidate,
        overallScore: 5,
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it("6. non-participant → 403", async () => {
    stubPlacementFetch({
      id: IDS.placement,
      candidateId: IDS.candidate,
      createdByUserId: IDS.customer,
      status: "ENDED_COMPLETED",
    });
    const app = await getServer();
    const token = await makeBearerToken(IDS.stranger, ["CUSTOMER"]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/ratings",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        placementId: IDS.placement,
        ratedUserId: IDS.candidate,
        overallScore: 5,
      },
    });

    expect(res.statusCode).toBe(403);
  });
});
