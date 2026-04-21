# Multi-stage build for Next.js 16 standalone output
# Optimized for production deployment with minimal image size

ARG NODE_VERSION=24.13.0

# ── Stage 1: Dependencies ───────────────────────────────────────────────────
FROM node:${NODE_VERSION}-slim AS dependencies
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (production + dev for build)
RUN npm install --no-audit --no-fund

# ── Stage 2: Builder ────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-slim AS builder
WORKDIR /app

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application source
COPY . .

# Build Next.js standalone output
# Requires output: "standalone" in next.config.ts (set in Plan 074-01)
RUN npm run build

# ── Stage 3: Runner ─────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-slim AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output and static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Switch to non-root user
USER nextjs

# Expose Next.js port
EXPOSE 3000

# Start Next.js server
CMD ["node", "server.js"]
