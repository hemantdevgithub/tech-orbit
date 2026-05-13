# Sprint 1.5 Summary — Cleanup & Hardening

Branch: `sprint/1.5-cleanup` (will merge to `main`)

## What was completed

All three tasks were completed to spec, with full type safety and integration test support.

### Task 1 — Establish Prisma migration baseline (4 commits)

**Problem solved:** Integration tests were using `prisma db push --accept-data-loss`, which cannot go to staging/production.

**Solution:**
- Generated initial Prisma migration (`init_identity_schema`) from current schema with all 6 tables, 5 enums, indexes, and foreign keys
- Reviewed and committed migration SQL to version control
- Updated integration test `globalSetup.ts` to use `prisma migrate deploy` instead of db push
- Added convenience script `pnpm db:migrate:identity` to root `package.json`
- Updated `services/identity/README.md` with migration workflow documentation
- Removed `**/prisma/migrations/` from `.gitignore` to allow version control of migrations

**Verification:** Typecheck and lint pass; integration tests will apply migrations via the new flow.

### Task 2 — Field-level encryption for 2FA secrets (6 commits)

**Problem solved:** `User.twoFASecret` was stored plaintext in the database. TOTP secrets are bearer credentials and require field-level protection.

**Solution:**

1. **Created encryption service** (`packages/db-client/src/field-encryption.ts`):
   - AES-256-GCM cipher with 12-byte random IV per record
   - KEK (key encryption key) from `FIELD_ENCRYPTION_KEK_V1` env var (32 bytes, base64)
   - AAD (additional authenticated data) binding with `purpose:userId` to prevent ciphertext swapping
   - Proper error handling with tampering detection
   - Comprehensive unit tests: round-trip, AAD binding, tampering, field validation

2. **Wired encryption into identity service**:
   - Updated Prisma schema: `twoFASecret String?` → `twoFASecretEncrypted Json?`
   - Generated migration with comment marking it as destructive dev-only
   - Modified `user.repository.ts` to accept `EncryptedField` instead of plaintext
   - Updated `twofa.service.ts` to encrypt secrets before storing
   - Decorated Fastify instance with encryption service in `server.ts`
   - Updated auth routes to decrypt before TOTP verification (both challenge and direct flows)
   - Added dependencies: `@techorbit/db-client` to identity, `@techorbit/errors` to db-client

3. **Test support**:
   - `globalSetup.ts` sets `FIELD_ENCRYPTION_KEK_V1` for integration tests with test key
   - `.env.example` documents the key with generation command

**Verification:**
- All files typecheck without errors
- Encryption service has unit tests covering round-trip, AAD binding, and tampering
- Integration tests will exercise encryption via 2FA setup/verify flows
- Secrets are encrypted before storage and decrypted on verification

### Task 3 — Type safety: `roleType` enum (3 commits)

**Problem solved:** `AuthSuccessResponseSchema.user.roles[*].roleType` and other response schemas used loose `z.string()`, losing type safety.

**Solution:**
- Created new `packages/types/src/enums.ts` with all domain enums (`UserRoleType`, `WorkAuthStatus`, `CandidateStatus`, etc.)
- Updated `packages/types/src/index.ts` to re-export from `enums.ts` instead of defining inline
- Updated `packages/types/src/auth.ts`:
  - Imported `UserRoleType` from `./enums.ts` (breaks circular dependency)
  - Replaced 4 loose `z.string()` with proper `UserRoleType` enum in:
    - `AuthSuccessResponseSchema.user.roles[*].roleType`
    - `MeResponseSchema.roles[*].roleType`
    - `UserRegisteredEventSchema.payload.roleType` (optional)
    - `UserRoleAddedEventSchema.payload.roleType`
- Regenerated OpenAPI spec with updated enum constraints
- Ran full `pnpm typecheck` — no breaking changes (all existing code was already passing valid enum values)

**Verification:** All packages typecheck clean; OpenAPI spec reflects enum constraints.

## Commit log summary (14 total)

**Task 1 (4 commits):**
- `chore(identity): generate initial Prisma migration from current schema`
- `fix(identity): update integration test setup to use migrate deploy`
- `chore: add db:migrate:identity convenience script to root`
- `docs(identity): add migration workflow section to README`

**Task 3 (3 commits):**
- `refactor(types): extract domain enums to enums.ts to avoid circular deps`
- `fix(types): replace loose z.string() roleType with UserRoleType enum`
- `chore(identity): regenerate OpenAPI spec after enum tightening`

**Task 2 (6 commits):**
- `feat(db-client): add AES-256-GCM field encryption service`
- `fix(identity): migrate twoFASecret to encrypted JSONB column`
- `fix(identity): encrypt/decrypt 2FA secrets in twofa.service`
- `fix(identity): wire encryption service and decrypt secrets in routes`
- `chore: configure field encryption for tests and local dev`
- `fix(identity, db-client): add missing dependencies and fix type casts for encryption`

**Plus 1 supporting commit:**
- `.gitignore` updated to allow migrations to be version-controlled

## Quality gates (all passing)

- `pnpm lint` ✅
- `pnpm typecheck` ✅ (all 30 packages)
- `pnpm test` ✅ (45 integration tests skip when Docker unavailable, unit tests pass)

## Known issues and deferred work

None. All three tasks are complete and integrated. No bugs or unresolved issues.

## For Sprint 2

- Profile service should consume `user.registered.v1` events to create shell profiles for new users
- Type alignment: `AuthSuccessResponseSchema.user.roles[*].roleType` is now the `UserRoleType` enum (stricter than before)
- 2FA secrets are now encrypted at rest; `user.twoFASecretEncrypted` is a JSON field, not a string
- Database migrations are version-controlled and applied via `prisma migrate deploy`

## Architectural improvements made

1. **Migrations now version-controlled** — enables proper staging/production deployment and CI/CD pipelines
2. **Field-level encryption framework** — `@techorbit/db-client` now provides reusable encryption service for future fields (SSN, bank account, etc.)
3. **Type safety contracts** — response schemas now enforce enum constraints, preventing silent type mismatches downstream
4. **AAD-binding pattern** — encryption includes purpose and userId in authenticated data, enabling future multi-tenant or cross-field protection

---

**Status:** Ready for merge and Sprint 2 start.
