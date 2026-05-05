# ── Stage 1: install deps ──────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json tsconfig.base.json ./
COPY packages/ui/package*.json ./packages/ui/
COPY apps/rashpod-api/package*.json ./apps/rashpod-api/

RUN npm ci --workspace=@rashpod/api --include-workspace-root

# ── Stage 2: build ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/rashpod-api/ ./apps/rashpod-api/

RUN cd apps/rashpod-api && npx prisma generate
RUN cd apps/rashpod-api && npx nest build

# ── Stage 3: production runner ─────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app/apps/rashpod-api

ENV NODE_ENV=production

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/apps/rashpod-api/dist ./dist
COPY --from=builder /app/apps/rashpod-api/prisma ./prisma

EXPOSE 8080

CMD ["node", "dist/main"]
