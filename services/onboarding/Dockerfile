# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps

RUN apk add --no-cache tini
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/logger/package.json ./packages/logger/
COPY packages/errors/package.json ./packages/errors/
COPY packages/config/vitest/package.json ./packages/config/vitest/
COPY packages/config/tsconfig/package.json ./packages/config/tsconfig/

RUN corepack enable pnpm && pnpm install --frozen-lockfile

FROM deps AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm build

FROM node:20-alpine AS runtime

RUN apk add --no-cache tini
WORKDIR /app

RUN addgroup -g 1001 -S app && adduser -S app -u 1001

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

RUN chown -R app:app /app

USER app

EXPOSE 3014

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
