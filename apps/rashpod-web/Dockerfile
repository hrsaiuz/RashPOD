# ── Stage 1: install deps ──────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
COPY packages/ui/package*.json ./packages/ui/
COPY apps/rashpod-web/package*.json ./apps/rashpod-web/

RUN npm ci --workspace=@rashpod/web --include-workspace-root

# ── Stage 2: build ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY package*.json ./
COPY tsconfig.base.json ./
COPY rashpod-ui-tokens.ts ./
COPY packages/ ./packages/
COPY apps/rashpod-web/ ./apps/rashpod-web/

ENV NEXT_TELEMETRY_DISABLED=1
RUN cd apps/rashpod-web && npx next build

# ── Stage 3: production runner ─────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/rashpod-web/.next/standalone ./
COPY --from=builder /app/apps/rashpod-web/.next/static ./apps/rashpod-web/.next/static

USER nextjs

EXPOSE 8080

CMD ["node", "apps/rashpod-web/server.js"]
