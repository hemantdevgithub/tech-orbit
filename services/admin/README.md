# @techorbit/admin

Admin console backend. Role-application review, dispute resolution, user management, and an append-only audit log scoped to admin actions.

## Why this service matters

Every sprint before this built tools for end users. Sprint 9 built the platform-operator surface: the controls a trust & safety / ops team needs to keep the marketplace healthy. Approve CRMs/SRMs/MSMEs before they can act. Resolve commission disputes. Suspend bad actors. Review what any admin did, forever.

## Endpoints

All routes require a bearer token (RS256). Admin-only endpoints additionally require the caller to have the `ADMIN` role.

### Role applications

| Method | Path | Authz |
|---|---|---|
| `POST` | `/api/v1/role-applications` | any authenticated user (on own behalf) |
| `GET`  | `/api/v1/role-applications` | admin: all; user: own |
| `GET`  | `/api/v1/role-applications/:id` | admin or applicant |
| `POST` | `/api/v1/role-applications/:id/approve` | ADMIN |
| `POST` | `/api/v1/role-applications/:id/reject` | ADMIN |

### Disputes

| Method | Path | Authz |
|---|---|---|
| `POST` | `/api/v1/disputes` | any authenticated user |
| `GET`  | `/api/v1/disputes` | admin: all; user: own |
| `GET`  | `/api/v1/disputes/:id` | admin, raiser, or respondent |
| `POST` | `/api/v1/disputes/:id/notes` | admin, raiser, or respondent |
| `POST` | `/api/v1/disputes/:id/resolve` | ADMIN |

### User management

| Method | Path | Authz |
|---|---|---|
| `POST` | `/api/v1/admin/users/:userId/suspend` | ADMIN |
| `POST` | `/api/v1/admin/users/:userId/ban` | ADMIN |
| `POST` | `/api/v1/admin/users/:userId/reset-password` | ADMIN |
| `GET`  | `/api/v1/admin/users/search?q=` | ADMIN |

### Audit + Dashboard

| Method | Path | Authz |
|---|---|---|
| `GET`  | `/api/v1/admin/audit-logs` | ADMIN |
| `GET`  | `/api/v1/admin/dashboard/metrics` | ADMIN |

## Role-approval flow

1. User submits application via `POST /api/v1/role-applications` with `requestedRole` and `applicationData`.
2. Admin reviews in the admin UI.
3. On approve:
   - admin-svc calls `identity-svc POST /api/v1/internal/users/:userId/roles` with the granted role.
   - Application row is flipped to `APPROVED`.
   - `AuditLog` entry `ROLE_APPLICATION_APPROVED` is written.
   - `role.approved.v1` event is enqueued on the outbox (notification-svc consumes it and emails the user).
4. On reject: same shape minus the role grant; review notes are required.

Order matters: the identity-svc call happens before the approval write so a failure there doesn't leave an "APPROVED but no role" inconsistency.

## Dispute resolution flow

Any authenticated user can raise a dispute on a domain context (timesheet, placement, commission payout, etc.) — `contextType` + `contextId` are plain strings; admin-svc doesn't enforce cross-service FKs. The dispute detail page links back to the right domain page using a simple switch on `contextType`.

Notes are append-only during `OPEN` / `UNDER_REVIEW`. Resolving flips status to `RESOLVED`, writes an audit entry, and emits `dispute.resolved.v1`.

## User suspend/ban

Identity-svc's `UserStatus` enum only carries `PENDING | ACTIVE | SUSPENDED`. admin-svc's `BAN` maps to `SUSPENDED` at the auth layer — the distinction is preserved in:

- the `AuditLog` row (`USER_SUSPENDED` vs `USER_BANNED`),
- the domain event (`user.suspended.v1` vs `user.banned.v1`),
- the UI pills (`BANNED` is rendered differently).

Suspend also revokes all active sessions in identity-svc so the user is kicked on the next request; they can't stay logged in until their existing access token expires.

## Audit log

Append-only by construction — the repository deliberately exposes no update/delete. Every admin mutation writes a log entry in the same transaction as the mutation itself, so you can't have a mutation without a log.

Current actions emitted:
- `ROLE_APPLICATION_APPROVED`, `ROLE_APPLICATION_REJECTED`
- `DISPUTE_RESOLVED`
- `USER_SUSPENDED`, `USER_BANNED`, `PASSWORD_RESET_TRIGGERED`

More will be added as new admin surfaces land.

## Bootstrapping the first admin

Admin-svc can't grant the first ADMIN role — there's no admin to approve the first admin application. Use the seed script:

```bash
DATABASE_URL=postgresql://... \
ADMIN_SEED_EMAIL=admin@techorbit.com \
ADMIN_SEED_PASSWORD=<strong-password-12+> \
pnpm --filter @techorbit/admin seed-admin
```

Idempotent: re-runs add `ADMIN` to an existing user by email rather than erroring. The script talks to `identity_user` / `identity_user_role` directly via `pg` (not identity-svc's HTTP API), because that API requires an existing admin.

## Cross-service calls

On admin mutations, admin-svc calls:
- `identity-svc POST /api/v1/internal/users/:id/roles` — grant a role
- `identity-svc POST /api/v1/internal/users/:id/status` — suspend/ban/reactivate (revokes sessions)
- `identity-svc POST /api/v1/internal/users/:id/trigger-password-reset`
- `identity-svc GET  /api/v1/internal/users/search?q=`
- `identity-svc GET  /api/v1/internal/users/:id` — profile + roles (admin UI)

Dashboard metrics:
- `identity-svc GET /api/v1/internal/metrics/active-users`
- `placement-svc GET /api/v1/internal/metrics/total-placements`
- `payments-svc  GET /api/v1/internal/metrics/gmv-this-month`

Any metric call that fails returns `0` — the dashboard stays renderable.

## Events

| Event | Trigger |
|---|---|
| `role.approved.v1` | `POST /role-applications/:id/approve` |
| `role.rejected.v1` | `POST /role-applications/:id/reject` |
| `dispute.raised.v1` | `POST /disputes` |
| `dispute.resolved.v1` | `POST /disputes/:id/resolve` |
| `user.suspended.v1` | `POST /admin/users/:userId/suspend` |
| `user.banned.v1` | `POST /admin/users/:userId/ban` |

All emitted via transactional outbox (`outgoing_event` + 5s polling relay).

## Environment

| Var | Required | Default |
|---|---|---|
| `DATABASE_URL` | yes | — |
| `JWT_PUBLIC_KEY` | yes | — |
| `JWT_PRIVATE_KEY` | yes | — (SERVICE-token signer) |
| `PORT` | no | `3014` |
| `RABBITMQ_URL` | no | — (outbox accumulates if unset) |
| `IDENTITY_SVC_URL` | no | `http://localhost:4001` |
| `PLACEMENT_SVC_URL` | no | `http://localhost:3008` |
| `PAYMENTS_SVC_URL` | no | `http://localhost:3009` |

## Tests

```bash
pnpm --filter @techorbit/admin test
```

- 9 integration tests (Testcontainers Postgres, stubbed identity-svc fetches): approve/reject applications, create/resolve disputes, add notes, suspend users, search users, authz edges.
- 1 smoke test.

## OpenAPI

```bash
pnpm --filter @techorbit/admin openapi:generate
```

Writes `services/admin/openapi.yaml`. CI verifies the committed spec is in sync with the Zod schemas.
