import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { InternalError } from "@techorbit/errors";

export type EncryptedField = {
  ciphertext: string;  // base64
  keyId: string;
  iv: string;          // base64
  authTag: string;     // base64
  version: 1;
};

export type EncryptionContext = {
  purpose: string;
  userId?: string;
};

export type EncryptionService = {
  encrypt(plaintext: string, context: EncryptionContext): Promise<EncryptedField>;
  decrypt(field: EncryptedField, context: EncryptionContext): Promise<string>;
};

export function createEncryptionService(): EncryptionService {
  const kekB64 = process.env.FIELD_ENCRYPTION_KEK_V1;
  if (!kekB64) {
    throw new InternalError(
      "FIELD_ENCRYPTION_KEK_V1 environment variable is required but not set. " +
      "Generate one with: openssl rand -base64 32"
    );
  }

  let kek: Buffer;
  try {
    kek = Buffer.from(kekB64, "base64");
    if (kek.length !== 32) {
      throw new InternalError(
        `FIELD_ENCRYPTION_KEK_V1 must be exactly 32 bytes when decoded (got ${kek.length})`
      );
    }
  } catch (error) {
    if (error instanceof InternalError) throw error;
    throw new InternalError(
      "FIELD_ENCRYPTION_KEK_V1 is not valid base64"
    );
  }

  return {
    async encrypt(plaintext: string, context: EncryptionContext): Promise<EncryptedField> {
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", kek, iv);

      // AAD binding: include purpose and userId (if present) so ciphertext
      // can't be moved between purposes or users.
      const aad = Buffer.from(
        `${context.purpose}${context.userId ? `:${context.userId}` : ""}`,
        "utf-8"
      );
      cipher.setAAD(aad);

      const encrypted = Buffer.concat([
        cipher.update(plaintext, "utf-8"),
        cipher.final(),
      ]);

      const authTag = cipher.getAuthTag();

      return {
        ciphertext: encrypted.toString("base64"),
        keyId: "v1",
        iv: iv.toString("base64"),
        authTag: authTag.toString("base64"),
        version: 1,
      };
    },

    async decrypt(field: EncryptedField, context: EncryptionContext): Promise<string> {
      if (field.version !== 1) {
        throw new InternalError(
          `Unsupported encrypted field version: ${field.version}`
        );
      }

      let iv: Buffer;
      let ciphertext: Buffer;
      let authTag: Buffer;

      try {
        iv = Buffer.from(field.iv, "base64");
        ciphertext = Buffer.from(field.ciphertext, "base64");
        authTag = Buffer.from(field.authTag, "base64");
      } catch (error) {
        throw new InternalError("Encrypted field has invalid base64 encoding");
      }

      const decipher = createDecipheriv("aes-256-gcm", kek, iv);

      // AAD must match what was used during encryption.
      const aad = Buffer.from(
        `${context.purpose}${context.userId ? `:${context.userId}` : ""}`,
        "utf-8"
      );
      decipher.setAAD(aad);

      try {
        decipher.setAuthTag(authTag);
        const plaintext = Buffer.concat([
          decipher.update(ciphertext),
          decipher.final(),
        ]);
        return plaintext.toString("utf-8");
      } catch (error) {
        throw new InternalError(
          "Decryption failed: authentication tag mismatch (ciphertext may be corrupted or AAD mismatch)"
        );
      }
    },
  };
}
