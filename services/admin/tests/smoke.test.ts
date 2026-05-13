import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { dockerAvailable, getServer, closeServer } from "./integration/helpers.js";

(dockerAvailable() ? describe : describe.skip)("admin smoke tests", () => {
  beforeAll(async () => {
    await getServer();
  });
  afterAll(async () => {
    await closeServer();
  });

  it("returns health status", async () => {
    const server = await getServer();
    const response = await server.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe("ok");
    expect(body.service).toBe("admin");
  });
});
