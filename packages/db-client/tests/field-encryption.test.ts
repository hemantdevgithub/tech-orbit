import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createEncryptionService } from "../src/field-encryption";
import { InternalError } from "@techorbit/errors";

describe("field-encryption", () => {
  const testKek = Buffer.alloc(32, "test-kek-32-bytes-exactly");
  const testKekB64 = testKek.toString("base64");

  beforeEach(() => {
    process.env.FIELD_ENCRYPTION_KEK_V1 = testKekB64;
  });

  afterEach(() => {
    delete process.env.FIELD_ENCRYPTION_KEK_V1;
  });

  describe("createEncryptionService", () => {
    it("should fail if KEK env var is missing", () => {
      delete process.env.FIELD_ENCRYPTION_KEK_V1;
      expect(() => createEncryptionService()).toThrow(InternalError);
      expect(() => createEncryptionService()).toThrow(/FIELD_ENCRYPTION_KEK_V1/);
    });

    it("should fail if KEK is not valid base64", () => {
      process.env.FIELD_ENCRYPTION_KEK_V1 = "not-valid-base64!!!";
      expect(() => createEncryptionService()).toThrow(InternalError);
    });

    it("should fail if KEK is not exactly 32 bytes", () => {
      process.env.FIELD_ENCRYPTION_KEK_V1 = Buffer.alloc(16, "short-key").toString("base64");
      expect(() => createEncryptionService()).toThrow(InternalError);
      expect(() => createEncryptionService()).toThrow(/32 bytes/);
    });
  });

  describe("encrypt/decrypt round-trip", () => {
    it("should encrypt and decrypt plaintext correctly", async () => {
      const service = createEncryptionService();
      const plaintext = "this is a secret";
      const context = { purpose: "2fa_secret", userId: "user-123" };

      const encrypted = await service.encrypt(plaintext, context);

      expect(encrypted).toHaveProperty("ciphertext");
      expect(encrypted).toHaveProperty("iv");
      expect(encrypted).toHaveProperty("authTag");
      expect(encrypted.keyId).toBe("v1");
      expect(encrypted.version).toBe(1);

      const decrypted = await service.decrypt(encrypted, context);
      expect(decrypted).toBe(plaintext);
    });

    it("should generate a unique IV for each encryption", async () => {
      const service = createEncryptionService();
      const plaintext = "same plaintext";
      const context = { purpose: "test", userId: "user-1" };

      const encrypted1 = await service.encrypt(plaintext, context);
      const encrypted2 = await service.encrypt(plaintext, context);

      // IVs should be different even for the same plaintext
      expect(encrypted1.iv).not.toBe(encrypted2.iv);

      // But both should decrypt to the same plaintext
      const decrypted1 = await service.decrypt(encrypted1, context);
      const decrypted2 = await service.decrypt(encrypted2, context);

      expect(decrypted1).toBe(plaintext);
      expect(decrypted2).toBe(plaintext);
    });

    it("should handle empty purpose with userId", async () => {
      const service = createEncryptionService();
      const plaintext = "secret with only user id";
      const context = { purpose: "", userId: "user-456" };

      const encrypted = await service.encrypt(plaintext, context);
      const decrypted = await service.decrypt(encrypted, context);

      expect(decrypted).toBe(plaintext);
    });

    it("should handle purpose without userId", async () => {
      const service = createEncryptionService();
      const plaintext = "secret with only purpose";
      const context = { purpose: "general_secret", userId: undefined };

      const encrypted = await service.encrypt(plaintext, context);
      const decrypted = await service.decrypt(encrypted, context);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe("AAD binding", () => {
    it("should fail decryption with wrong userId in AAD", async () => {
      const service = createEncryptionService();
      const plaintext = "secret tied to user A";
      const encryptContext = { purpose: "2fa_secret", userId: "user-A" };
      const decryptContext = { purpose: "2fa_secret", userId: "user-B" };

      const encrypted = await service.encrypt(plaintext, encryptContext);

      // Attempting to decrypt with a different userId should fail
      await expect(service.decrypt(encrypted, decryptContext)).rejects.toThrow(InternalError);
      await expect(service.decrypt(encrypted, decryptContext)).rejects.toThrow(/authentication tag/i);
    });

    it("should fail decryption with wrong purpose in AAD", async () => {
      const service = createEncryptionService();
      const plaintext = "secret for 2fa";
      const encryptContext = { purpose: "2fa_secret", userId: "user-1" };
      const decryptContext = { purpose: "password_reset", userId: "user-1" };

      const encrypted = await service.encrypt(plaintext, encryptContext);

      // Attempting to decrypt with a different purpose should fail
      await expect(service.decrypt(encrypted, decryptContext)).rejects.toThrow(InternalError);
      await expect(service.decrypt(encrypted, decryptContext)).rejects.toThrow(/authentication tag/i);
    });
  });

  describe("tampering detection", () => {
    it("should fail if ciphertext is tampered with", async () => {
      const service = createEncryptionService();
      const plaintext = "sensitive data";
      const context = { purpose: "test", userId: "user-1" };

      let encrypted = await service.encrypt(plaintext, context);

      // Flip a bit in the ciphertext
      const ciphertextBuffer = Buffer.from(encrypted.ciphertext, "base64");
      ciphertextBuffer[0] ^= 0xff; // flip all bits in first byte
      encrypted.ciphertext = ciphertextBuffer.toString("base64");

      // Decryption should fail
      await expect(service.decrypt(encrypted, context)).rejects.toThrow(InternalError);
    });

    it("should fail if authTag is tampered with", async () => {
      const service = createEncryptionService();
      const plaintext = "sensitive data";
      const context = { purpose: "test", userId: "user-1" };

      let encrypted = await service.encrypt(plaintext, context);

      // Flip a bit in the auth tag
      const authTagBuffer = Buffer.from(encrypted.authTag, "base64");
      authTagBuffer[0] ^= 0xff;
      encrypted.authTag = authTagBuffer.toString("base64");

      // Decryption should fail
      await expect(service.decrypt(encrypted, context)).rejects.toThrow(InternalError);
    });

    it("should fail if IV is tampered with", async () => {
      const service = createEncryptionService();
      const plaintext = "sensitive data";
      const context = { purpose: "test", userId: "user-1" };

      let encrypted = await service.encrypt(plaintext, context);

      // Flip a bit in the IV
      const ivBuffer = Buffer.from(encrypted.iv, "base64");
      ivBuffer[0] ^= 0xff;
      encrypted.iv = ivBuffer.toString("base64");

      // Decryption should fail
      await expect(service.decrypt(encrypted, context)).rejects.toThrow(InternalError);
    });
  });

  describe("field format validation", () => {
    it("should fail if encrypted field has invalid base64", async () => {
      const service = createEncryptionService();
      const context = { purpose: "test", userId: "user-1" };

      const invalidField = {
        ciphertext: "!!!not-base64!!!",
        keyId: "v1",
        iv: Buffer.alloc(12).toString("base64"),
        authTag: Buffer.alloc(16).toString("base64"),
        version: 1 as const,
      };

      await expect(service.decrypt(invalidField, context)).rejects.toThrow(InternalError);
      await expect(service.decrypt(invalidField, context)).rejects.toThrow(/base64/);
    });

    it("should fail if encrypted field has unsupported version", async () => {
      const service = createEncryptionService();
      const context = { purpose: "test", userId: "user-1" };

      const futureVersionField = {
        ciphertext: Buffer.alloc(32).toString("base64"),
        keyId: "v2",
        iv: Buffer.alloc(12).toString("base64"),
        authTag: Buffer.alloc(16).toString("base64"),
        version: 99 as any,
      };

      await expect(service.decrypt(futureVersionField, context)).rejects.toThrow(InternalError);
      await expect(service.decrypt(futureVersionField, context)).rejects.toThrow(/version/);
    });
  });
});
