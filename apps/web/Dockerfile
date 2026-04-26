# ==========================================
# Stage 1: Dependencies
# ==========================================
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG ALL_PROXY
ARG NO_PROXY
FROM node:20-slim AS deps
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG ALL_PROXY
ARG NO_PROXY
ENV HTTP_PROXY=$HTTP_PROXY
ENV HTTPS_PROXY=$HTTPS_PROXY
ENV ALL_PROXY=$ALL_PROXY
ENV NO_PROXY=$NO_PROXY
ENV http_proxy=$HTTP_PROXY
ENV https_proxy=$HTTPS_PROXY
ENV all_proxy=$ALL_PROXY
ENV no_proxy=$NO_PROXY
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY pnpm-workspace.yaml package.json ./
COPY .npmrc ./
RUN touch pnpm-lock.yaml

COPY packages/types ./packages/types
COPY packages/sdk ./packages/sdk

RUN pnpm install --filter @research-os/types --filter @research-os/sdk

COPY packages/vendor/excalidraw/packages/common ./packages/vendor/excalidraw/packages/common
COPY packages/vendor/excalidraw/packages/math ./packages/vendor/excalidraw/packages/math
COPY packages/vendor/excalidraw/packages/element ./packages/vendor/excalidraw/packages/element
COPY packages/vendor/excalidraw/packages/utils ./packages/vendor/excalidraw/packages/utils
COPY packages/vendor/excalidraw/packages/excalidraw ./packages/vendor/excalidraw/packages/excalidraw

RUN rm -rf /app/packages/vendor/excalidraw/packages/*/dist 2>/dev/null || true

COPY apps/web/package.json ./apps/web/

RUN pnpm install --filter web...

# ==========================================
# Stage 2: Builder
# ==========================================
FROM node:20-slim AS builder
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG ALL_PROXY
ARG NO_PROXY
ENV HTTP_PROXY=$HTTP_PROXY
ENV HTTPS_PROXY=$HTTPS_PROXY
ENV ALL_PROXY=$ALL_PROXY
ENV NO_PROXY=$NO_PROXY
ENV http_proxy=$HTTP_PROXY
ENV https_proxy=$HTTPS_PROXY
ENV all_proxy=$ALL_PROXY
ENV no_proxy=$NO_PROXY
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

COPY apps/web ./apps/web
COPY pnpm-workspace.yaml package.json ./
COPY .npmrc ./

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

WORKDIR /app/apps/web
RUN pnpm build

# ==========================================
# Stage 3: Runner (Development)
# ==========================================
FROM node:20-slim AS dev
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG ALL_PROXY
ARG NO_PROXY
ENV HTTP_PROXY=$HTTP_PROXY
ENV HTTPS_PROXY=$HTTPS_PROXY
ENV ALL_PROXY=$ALL_PROXY
ENV NO_PROXY=$NO_PROXY
ENV http_proxy=$HTTP_PROXY
ENV https_proxy=$HTTPS_PROXY
ENV all_proxy=$ALL_PROXY
ENV no_proxy=$NO_PROXY
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY pnpm-workspace.yaml package.json ./
COPY .npmrc ./
RUN touch pnpm-lock.yaml
COPY packages ./packages
COPY apps/web ./apps/web

RUN rm -rf /app/packages/vendor/excalidraw/packages/*/dist 2>/dev/null || true

RUN pnpm install --filter web...

WORKDIR /app/apps/web

EXPOSE 3000

COPY apps/web/start.sh /app/apps/web/start.sh
RUN chmod +x /app/apps/web/start.sh

CMD ["/app/apps/web/start.sh"]

# ==========================================
# Stage 4: Runner (Production)
# ==========================================
FROM node:20-slim AS prod
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG ALL_PROXY
ARG NO_PROXY
ENV HTTP_PROXY=$HTTP_PROXY
ENV HTTPS_PROXY=$HTTPS_PROXY
ENV ALL_PROXY=$ALL_PROXY
ENV NO_PROXY=$NO_PROXY
ENV http_proxy=$HTTP_PROXY
ENV https_proxy=$HTTPS_PROXY
ENV all_proxy=$ALL_PROXY
ENV no_proxy=$NO_PROXY
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./apps/web/.next/standalone
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/.next/standalone/server.js"]
