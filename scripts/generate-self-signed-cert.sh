#!/usr/bin/env bash
# Generate a self-signed TLS cert for local HTTPS development or single-host
# prod deployments without a domain. The browser will show a warning — use
# Let's Encrypt for anything real (see docs/DEPLOYMENT_VPS.md).
#
# Outputs:
#   certs/key.pem  — private key (pkcs8, 4096-bit RSA)
#   certs/cert.pem — self-signed certificate (365 days)

set -euo pipefail

CERT_DIR="${1:-certs}"
HOST="${2:-localhost}"
DAYS="${3:-365}"

mkdir -p "$CERT_DIR"

if [[ -f "$CERT_DIR/cert.pem" && -f "$CERT_DIR/key.pem" ]]; then
  echo "Certs already exist in $CERT_DIR. Delete them first to regenerate."
  exit 0
fi

openssl req -x509 -newkey rsa:4096 -sha256 -nodes -days "$DAYS" \
  -keyout "$CERT_DIR/key.pem" \
  -out "$CERT_DIR/cert.pem" \
  -subj "/CN=$HOST" \
  -addext "subjectAltName=DNS:$HOST,DNS:*.$HOST,IP:127.0.0.1" \
  2>&1 | grep -v "^$" || true

chmod 600 "$CERT_DIR/key.pem"
echo "Wrote $CERT_DIR/cert.pem and $CERT_DIR/key.pem (valid $DAYS days, CN=$HOST)"
