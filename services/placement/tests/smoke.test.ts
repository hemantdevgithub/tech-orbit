import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildServer } from "../src/server.js";

describe("placement smoke tests", () => {
  let server: Awaited<ReturnType<typeof buildServer>>;

  beforeAll(async () => {
    server = await buildServer();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it("health check returns ok", async () => {
    const response = await server.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe("ok");
    expect(body.service).toBe("placement");
  });
});
