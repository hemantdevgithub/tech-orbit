#!/bin/bash
set -e

echo "=== Techorbit Bootstrap ==="
echo "Installing dependencies..."
pnpm install

echo "Starting infrastructure..."
docker-compose up -d

echo "Waiting for services to be ready..."
sleep 5

echo "Building packages..."
pnpm --filter "@techorbit/*" build

echo ""
echo "=== Ready! ==="
echo "Run 'pnpm dev' to start all services"
echo "Services:"
echo "  - Web app: http://localhost:3000"
echo "  - RabbitMQ: http://localhost:15672 (guest/guest)"
echo "  - Mailpit: http://localhost:8025"