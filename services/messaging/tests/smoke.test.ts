import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildServer } from "../src/server.js";

const TEST_PORT = 0; // OS-picked port avoids collision with the running dev stack

describe("messaging smoke tests", () => {
  let server: Awaited<ReturnType<typeof buildServer>>;

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
    expect(body.service).toBe("messaging");
  });
});
