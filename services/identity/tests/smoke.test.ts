import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildServer } from "../src/server.js";

const TEST_PORT = 0; // port 0 = OS picks an available port, avoids conflict with running dev server

describe("identity smoke tests", () => {
  let server: ReturnType<typeof buildServer> extends Promise<infer T> ? T : never;

  beforeAll(async () => {
    server = await buildServer();
    await server.listen({ host: "0.0.0.0", port: TEST_PORT });
  });

  afterAll(async () => {
    await server.close();
  });

  it("should return health status", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe("ok");
    expect(body.service).toBe("identity");
  });
});
