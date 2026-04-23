# @techorbit/requirement

Marketplace requirements service. Customers post job requirements; CRMs claim attribution; requirements move through a status lifecycle (DRAFT → OPEN → INTERVIEWING → OFFER_EXTENDED → PLACED → CLOSED | CANCELLED).

## Endpoints

All routes require a bearer token (identity-svc JWT). Role checks are enforced in the service layer.

### Requirements

| Method | Path | Body / Query | Authz |
|---|---|---|---|
| `POST` | `/api/v1/requirements` | `CreateRequirementSchema` | CUSTOMER (of the target company) or ADMIN |
| `GET` | `/api/v1/requirements` | `RequirementFilterSchema` query params | any auth'd user; non-admins see published + their own drafts + reqs where they're the attributed CRM |
| `GET` | `/api/v1/requirements/:id` | — | visibility-filtered (owner/CRM/admin can see DRAFT) |
| `PATCH` | `/api/v1/requirements/:id` | `UpdateRequirementSchema` | owner + DRAFT-only |
| `POST` | `/api/v1/requirements/:id/publish` | `{}` | owner + DRAFT-only; validates openings / rate coherence |
| `POST` | `/api/v1/requirements/:id/close` | `{ reason: string }` | owner + non-terminal status |

### CRM attribution

| Method | Path | Body / Query | Authz |
|---|---|---|---|
| `POST` | `/api/v1/requirements/:id/attribute-crm` | `{ crmUserId: uuid }` | CRM (of the given uuid) or ADMIN. Returns `{ kind: "attributed", requirement }` (200) when the customer already has this CRM on their profile, else `{ kind: "pending", request }` (202) |
| `GET` | `/api/v1/crm-attribution-requests` | — | customer lists their own pending queue |
| `POST` | `/api/v1/crm-attribution-requests/:id/approve` | `{}` | customer who owns the requirement |
| `POST` | `/api/v1/crm-attribution-requests/:id/reject` | `{}` | customer who owns the requirement |

### Visibility / redaction rules

- DRAFT requirements are readable only by the owner, attributed CRM, or admin.
- Published (OPEN+) requirements are readable by any authenticated user.
- When `blindPosting=true` and the viewer isn't owner / attributed CRM / admin, the response zeroes out `customerCompanyId` and `createdByUserId` (enforced at the service layer, not the UI).

## Environment

| Var | Required | Default | Notes |
|---|---|---|---|
| `DATABASE_URL` | yes | — | Postgres DSN; the `requirement` schema must exist (handled by `infra/docker/postgres-init/01-schemas.sql` locally) |
| `JWT_PUBLIC_KEY` | yes | — | RS256 public PEM; same keypair as identity-svc |
| `PORT` | no | `3005` | |
| `SERVICE_NAME` | no | `requirement-svc` | |
| `PROFILE_SVC_URL` | no | `http://localhost:3004` | Used on the `POST /requirements` hot path to read `CustomerCompanyProfile.attributedCrmUserId` for auto-attribution |
| `RABBITMQ_URL` | no | — | When set, the outbox relay polls every 5 s and publishes `requirement.published.v1` / `requirement.closed.v1` to the `techorbit.events` exchange. Without it, events accumulate in `outgoing_event` as PENDING |
| `ALLOWED_ORIGINS` | no | `http://localhost:3000` | Comma-separated list for CORS |
| `DISABLE_RATE_LIMIT` | no | `false` | Set `1` in test suites |

## Local run

```bash
# Apply migrations
pnpm --filter @techorbit/requirement db:migrate:prod

# Run dev server (requires identity-svc JWT_PUBLIC_KEY in env, see root .env.example)
pnpm --filter @techorbit/requirement dev
```

## Events emitted

`requirement.published.v1` on transition DRAFT → OPEN:

```json
{
  "requirementId": "uuid",
  "customerCompanyId": "uuid",
  "attributedCrmId": "uuid | null",
  "techStack": ["React", "Node.js"],
  "seniority": "SENIOR",
  "locationType": "REMOTE",
  "publishedAt": "ISO-8601"
}
```

`requirement.closed.v1` on transition to CLOSED:

```json
{
  "requirementId": "uuid",
  "reason": "string",
  "closedAt": "ISO-8601"
}
```

Events are written to `outgoing_event` inside the same transaction as the status change and drained to RabbitMQ by the outbox relay worker. Failed publishes increment `attempts` and store the last error; after 10 attempts a row flips to `FAILED` and is skipped until someone investigates.

## Testing

```bash
pnpm --filter @techorbit/requirement test
```

The integration suite spins up a Postgres testcontainer, applies the migration, and stubs `fetch` so the profile-svc call in `createRequirement` returns deterministic responses per test.
