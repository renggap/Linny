# =====================================================
# Neo Linear Backend - Production Dockerfile
# =====================================================

# -------------------------------
# Stage 1: Dependencies
# -------------------------------
FROM node:20-alpine AS deps

# Prisma requires openssl
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy dependency files
COPY package.json package-lock.json* ./

# Install dependencies (deterministic)
RUN npm ci --legacy-peer-deps


# -------------------------------
# Stage 2: Builder
# -------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build


# -------------------------------
# Stage 3: Production Runner
# -------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Prisma runtime dependencies
RUN apk add --no-cache openssl

# Create non-root user
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 prisma

# Copy only required production files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Fix permissions
RUN chown -R prisma:nodejs /app
USER prisma

# Expose backend port
EXPOSE 3001

# Healthcheck (PASTIKAN endpoint ini ada)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Run migrations safely, then start server
CMD sh -c "npx prisma migrate deploy && npm run start"
