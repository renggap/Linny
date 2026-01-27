# =====================================================
# Neo Linear Backend - Production Dockerfile
# =====================================================
# Build arguments - passed from docker-compose or Easypanel
ARG DATABASE_URL
ARG JWT_SECRET
ARG NODE_ENV=production
ARG FRONTEND_URL
ARG PORT=3001

# -------------------------------
# Stage 1: Dependencies
# -------------------------------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps


# -------------------------------
# Stage 2: Builder
# -------------------------------
FROM node:20-alpine AS builder

# Receive build arguments
ARG DATABASE_URL
ARG JWT_SECRET
ARG NODE_ENV
ARG FRONTEND_URL
ARG PORT

# Set as environment variables for build time
ENV DATABASE_URL=$DATABASE_URL
ENV JWT_SECRET=$JWT_SECRET
ENV NODE_ENV=$NODE_ENV
ENV FRONTEND_URL=$FRONTEND_URL
ENV PORT=$PORT

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client first
RUN npx prisma generate

# Build with fallback - if build fails, show debug info
RUN npm run build || (echo "===== BUILD FAILED - DEBUG INFO =====" && ls -la && echo "===== package.json scripts =====" && cat package.json && exit 1)

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
