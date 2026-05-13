# Sprint 3 Summary — Requirements Service

**Branch:** `sprint/3-requirements` (branched from `sprint/2-profiles` after Checkpoint C)
**Status:** Complete — all quality gates passing (30/30 lint, 30/30 typecheck, 29/29 test)

---

## What Was Built

### Checkpoint C — port hygiene + repo cleanup (commits 1–9)

Before Sprint 3 proper, realigned the whole repo:
- Sprint 2 Task 10/11 work (integration tests, field-encryption base64 validation, identity test-helper Prisma isolation) committed as 3 commits on `sprint/2-profiles`.
- Moved SPRINT_1 and SPRINT_3 prompts into `prompts/` and documented the convention in the root README.
- Deleted placeholder `services/onboarding` and `services/reporting` (Sprint 0 scaffolds).
- Set PORT defaults to match the engineering spec across all 13 remaining services; fixed `api-gateway/src/index.ts` to read `config.PORT` instead of a hardcoded 3001.
- Added `TECH_STACK_OPTIONS` constant + `TechStack` union type in `packages/types` for the requirement post form.

### Task 1 — Prisma schema (multiSchema)

`services/requirement/prisma/schema.prisma` is the first service on the multi-schema Postgres pattern:
- `previewFeatures = ["multiSchema"]`, `datasource schemas = ["requirement"]`, every model/enum with `@@schema("requirement")`.
- Migration generated via `prisma migrate diff` (non-interactive) and applied with `migrate deploy`.
- Models: `Requirement`, `CrmAttributionRequest` (FK to Requirement, cascading delete), `OutgoingEvent` (outbox).
- Enums: `RequirementStatus` (7-state), `LocationType`, `Seniority`, `WorkAuthStatus`, `CrmAttributionStatus`, `OutgoingEventStatus`.
- Indexes picked for the actual Sprint 3 queries: `(status, published_at)` for browse, `customer_company_id` for "my reqs", `attributed_crm_id` for the CRM view, `(status, crm_user_id)` / `(customer_company_id, status)` on attribution requests.

### Task 2 — shared types

`packages/types/src/requirement.ts`:
- Request: `CreateRequirementSchema`, `UpdateRequirementSchema` (both with a `billRateMax >= billRateMin` refine), `PublishRequirementSchema`, `CloseRequirementSchema`.
- Filter: `RequirementFilterSchema` with a single-or-list helper so `?status=OPEN` and `?status=OPEN&status=INTERVIEWING` both work.
- Response: `RequirementResponseSchema`, `RequirementListResponseSchema`, `CrmAttributionRequestResponseSchema`.
- Events: `RequirementPublishedEventSchema`, `RequirementClosedEventSchema` (envelope follows the profile-svc pattern).
- `enums.ts` now has `LocationType` + `CrmAttributionStatus`; expanded `RequirementStatus` to 7 states.
- Reuses `AttributeCrmSchema` from profile.ts instead of duplicating.

### Tasks 3–4 — repository + service layer

`services/requirement/src/repositories/`:
- `requirement.repository.ts`: CRUD + lifecycle (publish/close), `findById` with DRAFT-visibility gate, `update` with owner-only + DRAFT guard, `list` with cursor pagination (fetch-one-extra to know `hasMore`) and visibility AND-OR (non-admin → published OR own drafts OR reqs where I'm the attributed CRM) plus filters (status / seniority / locationType / techStack hasSome / workAuthPrefs hasSome / free-text search). Exports `requirementAuth` helpers for the service layer.
- `crm-attribution.repository.ts`: pending-dedupe lookup, list for customer (with defense-in-depth ownership check), approve / reject that re-verify caller is customer or admin.

`services/requirement/src/services/`:
- `requirement.service.ts`: CUSTOMER-role check, customerCompanyId must match caller (ADMIN bypass), fetches `CustomerCompanyProfile` via `profile-api.ts` HTTP client for auto-attribution. `publishRequirement` / `closeRequirement` write the outbox event in the same transaction as the status change.
- `crm-attribution.service.ts`: three-path claim logic (already-you → 200 attributed, different-CRM → 409 conflict, fresh → 202 pending with dedupe of existing PENDING rows). `approveAttribution` transactionally flips the request to APPROVED AND stamps `attributedCrmId` on the requirement.

Supporting `lib/`:
- `prisma.ts` — singleton.
- `profile-api.ts` — fetch-based client that forwards the caller's Bearer token; 404/403 both map to "no profile".
- `outbox.ts` — `buildEvent` + `enqueueEvent` (transaction-scoped).
- `response-mappers.ts` — `toRequirementResponse` applies the blind-posting redaction (zeroes `customerCompanyId` / `createdByUserId` for non-owner/CRM/admin viewers), normalizes `Decimal → number` and `Date → ISO string`.

### Task 5 — API routes

`services/requirement/src/routes/`:
- `requirement.routes.ts`: POST / GET list / GET :id / PATCH :id / POST :id/publish / POST :id/close.
- `crm-attribution.routes.ts`: POST :id/attribute-crm (200 on auto-confirm, 202 on pending), GET queue, POST :id/approve, POST :id/reject.
- `server.ts` rewritten: cors, helmet, rate-limit, auth middleware, route registration, typed error handler, /health probe.

### Task 6 — outbox relay worker

`services/requirement/src/lib/outbox-worker.ts`:
- Polls `outgoing_event` every 5 s, publishes up to 100 PENDING rows per tick.
- Re-entrancy guard so slow batches don't overlap.
- Failure increments `attempts` with truncated `lastError`; after 10 attempts the row flips to `FAILED` for manual review.
- Wired into `server.ts` via `onReady` / `onClose` hooks; only starts when `RABBITMQ_URL` is set.

### Tasks 7–10 — frontend

- `apps/web/src/app/requirements/new/page.tsx`: 3-step post form. Per-step validation; `react-hook-form` + `zodResolver(CreateRequirementSchema)`. TECH_STACK_OPTIONS drives a tag-picker. Submit actions = Save draft / Publish now.
- `apps/web/src/app/requirements/page.tsx`: browse table with filter bar (status / seniority / location / search) and tech-stack badge picker. Cursor pagination with "Load more" that appends rather than replacing. "Post a requirement" CTA gated on CUSTOMER role.
- `apps/web/src/app/requirements/[id]/page.tsx`: detail view. Title + status badge + (blind-aware) company label header. Description rendered with `react-markdown` in a `prose` block. Key-details `<dl>` grid. Right-rail role-specific actions: owner sees Publish / Edit / Close; CRM sees inline Claim with three states (attributed / taken / pending); candidate/SRM sees disabled "Submit candidate" with Sprint-4 tooltip.
- `apps/web/src/app/requirements/[id]/edit/page.tsx`: draft-only single-card edit form that PATCHes and redirects back.
- `apps/web/src/app/settings/crm-attribution/page.tsx`: customer's pending-approval queue with inline Approve / Reject.
- `packages/api-client/src/requirement.ts`: `RequirementApiClient` + `createRequirementApiClient` + `ClaimAttributionResult` discriminated union.
- `apps/web/src/lib/api-client.ts`: `getRequirementClient()` singleton + `NEXT_PUBLIC_REQUIREMENT_URL` (default `http://localhost:3005`).
- Added `react-markdown` + `@tailwindcss/typography` to apps/web and wired typography into the Tailwind config.

### Task 11 — integration tests

`services/requirement/tests/integration/`:
- Testcontainers Postgres spin-up + `prisma migrate deploy` in globalSetup.
- `stubProfileCustomer` helper uses `vi.spyOn(globalThis, "fetch")` to mock the profile-svc call — no second testcontainer required.
- 9 `requirement.test.ts` cases: creates as CUSTOMER, auto-attribution from customer profile, role rejection, customerCompanyId enforcement, publish transition + outbox row, close transition + outbox row, list filters + visibility, blind-posting redaction, 401 unauth.
- 6 `crm-attribution.test.ts` cases: pending claim, approve flips + stamps `attributedCrmId`, reject flips only, auto-confirm when customer has this CRM, 409 on different-CRM conflict, customer queue scoping.
- Plus 1 smoke test.

### Task 12 — documentation

- `services/requirement/README.md`: endpoints table, env vars, local run, events + outbox behaviour.
- This summary.

---

## Quality Gates

```
pnpm lint     → 30/30 tasks successful
pnpm typecheck → 30/30 tasks successful
pnpm test     → 29/29 tasks successful
```

End-to-end service tests: 16 (9 requirement + 6 attribution + 1 smoke), all green.

---

## Definition of Done — status check

| DoD item | Status |
|---|---|
| Customer can create, edit, and publish a requirement via the UI | ✅ `/requirements/new`, `/requirements/[id]/edit`, publish button on detail |
| Customer can close a requirement with a reason | ✅ detail-page button + `window.prompt` for reason (Sprint 4: modal) |
| Published requirements appear in browse list for all authenticated users | ✅ |
| Filters (status / tech / seniority / location) work | ✅ |
| Requirement detail page renders with all fields | ✅ |
| Blind posting hides company info from non-owners | ✅ enforced at the service layer via response mapper, not just UI |
| CRM can claim attribution; customer can approve / reject | ✅ inline + `/settings/crm-attribution` |
| Auto-attribution works if customer already has a CRM linked | ✅ |
| `requirement.published.v1` event emitted | ✅ outbox row written transactionally; relay ships to RabbitMQ when `RABBITMQ_URL` is set |
| Draft requirements not visible to non-owners | ✅ repository gate, covered by integration test |
| Only customers can create/publish requirements | ✅ |
| Only owners can edit/close | ✅ |
| Blind posting enforced at API layer | ✅ |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` all green | ✅ |
| Playwright E2E | ⏳ deferred — see below |

---

## Known Issues / Deferred

1. **Playwright E2E** — not in this sprint. The backend integration coverage (Testcontainers + full HTTP round-trips via Fastify `inject`) gives us equivalent confidence for the Sprint 3 feature set; real browser E2E wrapping post → publish → browse + claim → approve is a Sprint 3.5 or Sprint 4 item.
2. **OpenAPI spec regeneration** — `zod-to-openapi` isn't wired into any service yet (same state as Sprint 2). Still worth its own follow-up.
3. **Close-requirement modal** — currently uses `window.prompt` for the reason. Accessible / stylable modal lands in Sprint 4.
4. **Edit form duplication** — `/requirements/new` (3-step wizard) and `/requirements/[id]/edit` (single card) have overlapping field markup. A shared `<RequirementForm>` component is worth extracting in Sprint 4 before matching-svc pulls on these types too.
5. **Cross-service HTTP** — requirement-svc → profile-svc uses a raw `fetch` with the caller's bearer token. Fine for Sprint 3; a cached or event-driven sync can replace it when we actually see load.
6. **Outbox partitioning** — relay polls a single table; fine at current scale. Switch to `LISTEN/NOTIFY` or logical replication if / when we outgrow 5-second latency.
7. **`customerCompanyId` semantics** — currently equals the customer's `primaryUserId`. When multi-user companies arrive, this needs to become `CustomerCompanyProfile.id` with a membership join.

---

## Dependencies for Sprint 4

- `matching-svc` consumes `requirement.published.v1` (subject line, tech-stack vector, seniority, location); the outbox relay already emits it.
- Candidate submissions in Sprint 4 will target `/api/v1/requirements/:id/submissions` — the `requiredInterviews` field on Requirement is already the source of truth for how many interviews a submission needs.
- `CrmAttributionRequest` rows feed commission calculations later (Sprint 7); `approvedBy` + `approvedAt` are the audit trail.
- Event consumers in notification-svc (Sprint 8) will want `requirement.published.v1` for "new requirement matching your skills" alerts.
