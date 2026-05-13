#!/usr/bin/env bash
# Generate an RS256 keypair for JWT signing and write the PEMs into .env.
# Idempotent: refuses to overwrite an existing non-empty JWT_PRIVATE_KEY.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo ".env not found at $ENV_FILE — creating from .env.example"
  cp "$ROOT_DIR/.env.example" "$ENV_FILE"
fi

if grep -Eq '^JWT_PRIVATE_KEY="[^"]+"' "$ENV_FILE"; then
  echo "JWT_PRIVATE_KEY already set in .env — refusing to overwrite."
  echo "Remove the existing values manually and re-run to rotate."
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$TMP_DIR/private.pem" >/dev/null 2>&1
openssl rsa -in "$TMP_DIR/private.pem" -pubout -out "$TMP_DIR/public.pem" >/dev/null 2>&1

# Escape newlines so the PEM fits on one line inside .env
PRIVATE_ESCAPED="$(awk 'BEGIN{ORS="\\n"} {print}' "$TMP_DIR/private.pem")"
PUBLIC_ESCAPED="$(awk 'BEGIN{ORS="\\n"} {print}' "$TMP_DIR/public.pem")"

# Strip any existing JWT_* lines (empty or not) then append
TMP_ENV="$(mktemp)"
grep -v -E '^JWT_(PRIVATE|PUBLIC)_KEY=' "$ENV_FILE" > "$TMP_ENV" || true
{
  cat "$TMP_ENV"
  printf 'JWT_PRIVATE_KEY="%s"\n' "$PRIVATE_ESCAPED"
  printf 'JWT_PUBLIC_KEY="%s"\n' "$PUBLIC_ESCAPED"
} > "$ENV_FILE"
rm -f "$TMP_ENV"

echo "JWT RS256 keypair written to $ENV_FILE"
