// Seed an initial ADMIN user directly into identity.identity_user +
// identity.identity_user_role. Idempotent: re-runs add ADMIN to an existing
// user rather than failing.
//
// Usage:
//   DATABASE_URL=postgresql://... pnpm --filter @techorbit/admin seed-admin -- \
//     --email=admin@techorbit.com --password=<strong-password>
//
// Lives in admin-svc (not identity-svc) because this script's purpose is to
// bootstrap the first admin user before admin-svc's HTTP endpoints can be
// called — no existing admin can approve the first admin.

import argon2 from "argon2";
import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";
import { Client } from "pg";

const { values } = parseArgs({
  allowPositionals: true,
  options: {
    email: { type: "string" },
    password: { type: "string" },
    firstName: { type: "string", default: "Platform" },
    lastName: { type: "string", default: "Admin" },
  },
});

async function main(): Promise<void> {
  const email = values.email ?? process.env.ADMIN_SEED_EMAIL;
  const password = values.password ?? process.env.ADMIN_SEED_PASSWORD;
  if (!email || !password) {
    console.error("Usage: seed-admin --email=<x> --password=<y> (or set ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD).");
    process.exit(2);
  }
  if (password.length < 12) {
    console.error("Password must be at least 12 characters.");
    process.exit(2);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL not set.");
    process.exit(2);
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const existing = await client.query<{ id: string }>(
      `SELECT id FROM identity_user WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email],
    );

    let userId: string;
    if (existing.rows.length > 0) {
      userId = existing.rows[0]!.id;
      console.log(`[seed-admin] User exists (${userId}); ensuring ADMIN role.`);
    } else {
      userId = randomUUID();
      const passwordHash = await argon2.hash(password, {
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
        type: argon2.argon2id,
      });
      await client.query(
        `INSERT INTO identity_user
           (id, email, password_hash, first_name, last_name, status, email_verified, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'ACTIVE', TRUE, NOW(), NOW())`,
        [userId, email, passwordHash, values.firstName, values.lastName],
      );
      console.log(`[seed-admin] Created user ${userId} (${email}).`);
    }

    const adminRole = await client.query(
      `SELECT id FROM identity_user_role WHERE user_id = $1 AND role_type = 'ADMIN' LIMIT 1`,
      [userId],
    );
    if (adminRole.rows.length === 0) {
      await client.query(
        `INSERT INTO identity_user_role
           (id, user_id, role_type, status, created_at, updated_at)
         VALUES ($1, $2, 'ADMIN', 'ACTIVE', NOW(), NOW())`,
        [randomUUID(), userId],
      );
      console.log(`[seed-admin] Granted ADMIN role.`);
    } else {
      console.log(`[seed-admin] ADMIN role already present.`);
    }
  } finally {
    await client.end();
  }

  console.log("[seed-admin] Done.");
}

main().catch((err) => {
  console.error("[seed-admin] Failed:", err);
  process.exit(1);
});
