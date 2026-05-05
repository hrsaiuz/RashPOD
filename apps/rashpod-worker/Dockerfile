# ── Stage 1: install deps ──────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

RUN apk add --no-cache python3 make g++ vips-dev

COPY package*.json ./
COPY packages/ui/package*.json ./packages/ui/
COPY apps/rashpod-worker/package*.json ./apps/rashpod-worker/

RUN npm ci --workspace=@rashpod/worker --include-workspace-root

# ── Stage 2: build ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache vips-dev

COPY --from=deps /app/node_modules ./node_modules

COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/rashpod-worker/ ./apps/rashpod-worker/

RUN cd apps/rashpod-worker && npx tsc -p tsconfig.json

# ── Stage 3: production runner ─────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app/apps/rashpod-worker

RUN apk add --no-cache vips

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/apps/rashpod-worker/dist ./dist

EXPOSE 8080

CMD ["node", "dist/main.js"]
