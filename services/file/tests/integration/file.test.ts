import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { runIntegrationSuite, getServer, closeServer, resetDb, makeBearerToken } from "./helpers.js";

const USER_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const OTHER_USER_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

runIntegrationSuite("File upload integration", () => {
  beforeAll(getServer);
  afterAll(closeServer);
  beforeEach(resetDb);

  it("POST /api/v1/files/upload-url creates a file record", async () => {
    const server = await getServer();
    const token = await makeBearerToken(USER_ID, ["CANDIDATE"]);

    const res = await server.inject({
      method: "POST",
      url: "/api/v1/files/upload-url",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify({
        filename: "resume.pdf",
        contentType: "application/pdf",
        sizeBytes: 102400,
        purpose: "RESUME",
      }),
    });

    expect(res.statusCode).toBe(201);
    const body = res.json() as Record<string, unknown>;
    expect(typeof body.fileId).toBe("string");
    expect(body.method).toBe("PUT");
    expect(typeof body.uploadUrl).toBe("string");
  });

  it("POST /api/v1/files/upload-url returns 400 for wrong content type", async () => {
    const server = await getServer();
    const token = await makeBearerToken(USER_ID, ["CANDIDATE"]);

    const res = await server.inject({
      method: "POST",
      url: "/api/v1/files/upload-url",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify({
        filename: "resume.exe",
        contentType: "application/octet-stream",
        sizeBytes: 1024,
        purpose: "RESUME",
      }),
    });

    expect(res.statusCode).toBe(400);
  });

  it("full upload flow: request url → upload → confirm → get", async () => {
    const server = await getServer();
    const token = await makeBearerToken(USER_ID, ["CANDIDATE"]);

    // Step 1: request upload URL
    const urlRes = await server.inject({
      method: "POST",
      url: "/api/v1/files/upload-url",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify({
        filename: "resume.pdf",
        contentType: "application/pdf",
        sizeBytes: 5,
        purpose: "RESUME",
      }),
    });
    expect(urlRes.statusCode).toBe(201);
    const { fileId } = urlRes.json() as { fileId: string; uploadUrl: string };

    // Step 2: upload the file body
    const uploadRes = await server.inject({
      method: "PUT",
      url: `/api/v1/files/${fileId}/upload`,
      headers: { authorization: `Bearer ${token}`, "content-type": "application/octet-stream" },
      payload: Buffer.from("%PDF-"),
    });
    expect(uploadRes.statusCode).toBe(204);

    // Step 3: confirm the upload
    const confirmRes = await server.inject({
      method: "POST",
      url: `/api/v1/files/${fileId}/confirm`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(confirmRes.statusCode).toBe(200);
    const file = confirmRes.json() as Record<string, unknown>;
    expect(file.status).toBe("CONFIRMED");

    // Step 4: get file metadata
    const getRes = await server.inject({
      method: "GET",
      url: `/api/v1/files/${fileId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(getRes.statusCode).toBe(200);
    const meta = getRes.json() as Record<string, unknown>;
    expect(meta.filename).toBe("resume.pdf");
    expect(meta.status).toBe("CONFIRMED");
  });

  it("GET /api/v1/files/:id returns 403 for a different user", async () => {
    const server = await getServer();
    const ownerToken = await makeBearerToken(USER_ID, ["CANDIDATE"]);
    const otherToken = await makeBearerToken(OTHER_USER_ID, ["CANDIDATE"]);

    // Owner creates file
    const urlRes = await server.inject({
      method: "POST",
      url: "/api/v1/files/upload-url",
      headers: { authorization: `Bearer ${ownerToken}`, "content-type": "application/json" },
      payload: JSON.stringify({
        filename: "photo.jpg",
        contentType: "image/jpeg",
        sizeBytes: 1024,
        purpose: "PROFILE_PHOTO",
      }),
    });
    const { fileId } = urlRes.json() as { fileId: string };

    // Different user tries to read
    const res = await server.inject({
      method: "GET",
      url: `/api/v1/files/${fileId}`,
      headers: { authorization: `Bearer ${otherToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns 401 without token", async () => {
    const server = await getServer();
    const res = await server.inject({ method: "POST", url: "/api/v1/files/upload-url" });
    expect(res.statusCode).toBe(401);
  });
});
