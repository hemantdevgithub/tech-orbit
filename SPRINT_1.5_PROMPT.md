# Sprint 1.5 — Cleanup & Hardening

You completed Sprint 1 (identity, auth, onboarding) on branch `sprint/1-identity`, merged to `main`. Before starting Sprint 2, we're doing a focused cleanup sprint to address three items that would compound into larger problems later.

Start from `main` on a new branch `sprint/1.5-cleanup`.

**This sprint is scoped tightly. Do not add features. Do not "while I'm in here" any other changes. Three tasks, small PR, merge, move on.**

---

## Context you must re-read

1. `CLAUDE.md` — conventions
2. `SPRINT_1_SUMMARY.md` — the "Security decisions worth flagging for review" section specifically
3. `ENGINEERING_SPEC.md`:
   - Section 5.2 (identity schema)
   - Section 9.3 (Data Protection — field-level encryption requirement)
   - Section 10.7 (Database Ops — migration discipline)

---

## Task 1 — Establish Prisma migration baseline

**Problem:** Sprint 1 integration tests use `prisma db push --accept-data-loss` instead of proper migrations. This cannot go to staging.

**What to do:**

1. In `services/identity/`, generate the initial migration from the current schema:
   ```bash
   cd services/identity
   # If prisma/migrations/ exists and is empty or broken, wipe it:
   rm -rf prisma/migrations
   pnpm prisma migrate dev --name init_identity_schema --create-only
   ```

2. **Review the generated SQL manually** before applying. Check:
   - All tables have the expected columns and types
   - Indexes are created (especially on `email`, `refreshToken`, foreign keys)
   - Enum types are created correctly
   - `@@schema("identity")` is respected (tables live in the `identity` schema, not `public`)
   - No unexpected `DROP` statements

3. Apply the migration: `pnpm prisma migrate dev`

4. Verify with `psql` that the `identity` schema exists with all tables:
   ```sql
   \dn
   \dt identity.*
   \d+ identity."User"
   ```

5. **Update integration test setup** (`services/identity/tests/integration/globalSetup.ts` or equivalent):
   - Replace `prisma db push` with `prisma migrate deploy`
   - Ensure the test DB gets fresh migrations applied on each test run (or cached if the migration list hasn't changed)
   - Keep the `DOCKER_AVAILABLE` guard intact so dev-box tests still skip cleanly

6. Add a script to root `package.json`: `"db:migrate:identity": "pnpm --filter @techorbit/identity prisma migrate dev"` for convenience.

7. Update `services/identity/README.md` with the migration workflow (create, review, apply, deploy).

**Acceptance criteria for Task 1:**
- [ ] `services/identity/prisma/migrations/` contains exactly one migration directory
- [ ] Running `prisma migrate deploy` against a fresh DB produces the expected schema
- [ ] All integration tests still pass using the new migration-based setup
- [ ] Migration SQL is clean (no accidental drops, all indexes present)
- [ ] Docker-less dev boxes still pass `pnpm test` (tests skip gracefully)

---

## Task 2 — Field-level encryption for 2FA secrets (and wire the KMS helper)

**Problem:** `User.twoFASecret` is stored as plaintext. TOTP secrets are bearer credentials — anyone with the secret generates valid codes forever. DB-at-rest encryption is not sufficient protection.

**What to do:**

### 2a. Build the encryption helper in `@techorbit/db-client`

Create `packages/db-client/src/field-encryption.ts`:

```ts
// Interface (not full implementation — design it properly):
export type EncryptedField = {
  ciphertext: string;  // base64
  keyId: string;       // which KEK was used (for rotation)
  iv: string;          // base64
  authTag: string;     // base64
  version: 1;          // scheme version
};

export type EncryptionService = {
  encrypt(plaintext: string, context: EncryptionContext): Promise<EncryptedField>;
  decrypt(field: EncryptedField, context: EncryptionContext): Promise<string>;
};

export type EncryptionContext = {
  purpose: string;  // e.g., "2fa_secret"
  userId?: string;  // for audit + AAD binding
};
```

Implementation requirements:
- **Envelope encryption.** Local key derivation using a KEK (key encryption key) from env/Secrets Manager. DEK (data encryption key) generated per-record, encrypted with KEK, stored alongside ciphertext.
- **AES-256-GCM** via Node's `crypto` module. Use `crypto.randomBytes(12)` for IV.
- **AAD binding:** include `purpose` and `userId` (if present) in the additional authenticated data so ciphertext can't be swapped between purposes or users.
- **Key versioning:** `keyId` column lets us rotate KEKs later.
- **Local dev key:** generate a 32-byte random key, store in `.env` as `FIELD_ENCRYPTION_KEK_V1` (base64-encoded). Add to `.env.example` with a comment telling devs to generate their own via `openssl rand -base64 32`.
- **Fail loudly in prod** if the KEK env is missing — don't silently fall back to an insecure default.

Add unit tests:
- Round-trip encrypt/decrypt
- Tampered ciphertext fails auth tag check
- Wrong AAD (wrong userId) fails decryption
- Missing KEK throws clearly

### 2b. Migrate the `twoFASecret` column

In `services/identity/prisma/schema.prisma`:
- Rename `twoFASecret String?` to `twoFASecretEncrypted Json?` (stores the `EncryptedField` shape)
- Generate a migration: `pnpm prisma migrate dev --name encrypt_2fa_secret --create-only`
- **Edit the migration SQL manually** to do a proper in-place migration:
  - Add new column `two_fa_secret_encrypted` as JSONB
  - For any existing rows with plaintext `two_fa_secret`, write a one-shot Node script that reads plaintext, encrypts it, writes the JSONB — then drop the old column in the SAME migration. (In dev there are likely no real users yet, but do this properly for the pattern.)
  - Drop old `two_fa_secret` column

**For dev simplicity:** since there are no real users, it's acceptable to simply drop the old column and add the new one, as long as the migration name indicates this is a destructive dev migration. Add a comment in the migration file: `-- ONE-SHOT: no real users yet; in prod this would require a backfill script.`

### 2c. Update identity-svc code

- In `twofa.service.ts`, call `encryptionService.encrypt(secret, { purpose: "2fa_secret", userId })` when storing
- When verifying, call `encryptionService.decrypt(field, { purpose: "2fa_secret", userId })`
- The encryption service is injected via the Fastify DI container (however Sprint 0/1 wired up dependency injection — follow the existing pattern)

### 2d. Tests

- Update existing 2FA integration tests — they should continue to pass unchanged (the encryption is an internal detail)
- Add one new test: store a 2FA secret, read it directly from the DB, verify it's NOT the plaintext
- Add one test: corrupt the ciphertext in DB, attempt to verify a TOTP code, expect a clear error (not a crash)

**Acceptance criteria for Task 2:**
- [ ] `@techorbit/db-client` exports a working `EncryptionService` with round-trip, AAD, and tampering tests
- [ ] `User.twoFASecretEncrypted` is the only 2FA secret storage; old plaintext column is dropped
- [ ] 2FA flow end-to-end still works
- [ ] Direct DB inspection of `User.two_fa_secret_encrypted` shows encrypted JSON, not plaintext
- [ ] A missing KEK env var causes the service to fail fast at boot, not silently continue

---

## Task 3 — Type safety: `roleType` uses the enum

**Problem:** `AuthSuccessResponseSchema.user.roles[*].roleType` is `z.string()`. Defeats the whole point of sharing types. A typo in identity-svc sets an invalid value and profile-svc silently drops it.

**What to do:**

1. In `packages/types/src/`, find the `UserRole` / `AuthSuccessResponseSchema` definitions.

2. Replace `roleType: z.string()` with `roleType: UserRoleTypeSchema` (the Zod enum already defined in that package).

3. Run `pnpm typecheck` — this will surface every call site that was relying on the loose typing.

4. Fix each call site. Most will be automatic (the enum is stricter but compatible). A few places may have string-typed DB column reads that need explicit casting — **do not cast to `any`**; narrow via `UserRoleTypeSchema.parse(dbValue)` with proper error handling.

5. Do the same audit for any other `z.string()` that should be an enum. Grep for:
   ```
   rg "z\.string\(\)" packages/types/src/
   ```
   Candidates to check: any field that appears in an enum in ENGINEERING_SPEC Section 5.1 (WorkAuthStatus, RequirementStatus, SubmissionStatus, etc.). If any were authored loosely, tighten them. If they're legitimately open strings (like `email`, `displayName`, `bio`), leave them.

6. Update `services/identity/openapi.yaml` — regenerate via `pnpm --filter @techorbit/identity openapi:generate` so the spec reflects the enum constraint.

**Acceptance criteria for Task 3:**
- [ ] No `z.string()` in `@techorbit/types` that corresponds to a defined enum
- [ ] `pnpm typecheck` clean across all packages
- [ ] `pnpm test` green
- [ ] OpenAPI spec reflects enum constraints

---

## Cross-cutting definition of done

- [ ] Branch `sprint/1.5-cleanup` — merged to main before starting Sprint 2
- [ ] `pnpm lint` / `pnpm typecheck` / `pnpm test` all green
- [ ] All three tasks completed; no scope creep
- [ ] `SPRINT_1.5_SUMMARY.md` at repo root summarizing: what was fixed, how, and what's confirmed ready for Sprint 2
- [ ] Updated `SPRINT_1_SUMMARY.md` with a "Follow-ups addressed in 1.5" section referencing commits
- [ ] Small PR (< 40 commits expected)

---

## Before you start

Produce a **written plan** covering:
1. Order of the three tasks and why (I recommend: 1 → 3 → 2, because migrations unblock everything, enum fix is low-risk cleanup, encryption is the most involved)
2. Any ambiguity in the encryption design — especially KEK sourcing, key rotation, AAD bindings
3. Commit count estimate (expect 15–30)

**Do not write code until I say "proceed."**
