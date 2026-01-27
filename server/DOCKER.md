# 🐳 Docker Deployment Guide - Neo Linear Server

## Overview

This guide covers deploying the Neo Linear backend server using Docker.

## Prerequisites

- Docker 20.10+ installed
- Docker Compose 2.0+ installed
- PostgreSQL database (included in docker-compose)
- Redis cache (included in docker-compose, optional)

## Quick Start

### 1. Build and Start All Services

```bash
docker compose up -d --build
```

This will:
- Build the server Docker image
- Start PostgreSQL database
- Start Redis cache
- Run database migrations
- Start the backend server on port 3001

### 2. Check Logs

```bash
# All services
docker compose logs -f

# Server only
docker compose logs -f server

# PostgreSQL
docker compose logs -f postgres

# Redis
docker compose logs -f redis
```

### 3. Stop Services

```bash
docker compose down
```

## Environment Variables

### Required Variables

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://neo_linear:neo_linear_password@postgres:5432/neo_linear` | ✅ Yes |
| `JWT_SECRET` | Secret for JWT tokens | Use `openssl rand -hex 32` | ✅ Yes |
| `NODE_ENV` | Environment | `production` | ✅ Yes |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` | ✅ Yes |
| `PORT` | Server port | `3001` | Optional |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_HOST` | Redis hostname | `redis` |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_ENABLED` | Enable Redis caching | `true` |
| `REDIS_PREFIX` | Redis key prefix | `neo_linear:` |

## Configuration Files

### `.env` (Root Directory)

Create this file for local development:

```env
# JWT Secret (generate with: openssl rand -hex 32)
JWT_SECRET=your-secret-key-here

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### `server/.env` (For Local Development)

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://neo_linear:neo_linear_password@localhost:5432/neo_linear
JWT_SECRET=dev-secret
FRONTEND_URL=http://localhost:3000
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_ENABLED=true
REDIS_PREFIX=neo_linear:
```

## Docker Stages

The Dockerfile uses a multi-stage build:

### Stage 1: Dependencies
- Installs npm packages
- Caches node_modules
- Base: `node:20-alpine`

### Stage 2: Builder
- Receives build arguments (ENV vars)
- Generates Prisma client
- Compiles TypeScript to `dist/`
- Runs in production mode

### Stage 3: Runner
- Production-optimized image
- Runs as non-root user (`prisma`)
- Runs migrations on startup
- Starts server

## Build Arguments

The following build arguments are passed to Docker:

```dockerfile
ARG DATABASE_URL
ARG JWT_SECRET
ARG NODE_ENV=production
ARG FRONTEND_URL
ARG PORT=3001
```

These are set in `docker-compose.yml`:

```yaml
server:
  build:
    args:
      DATABASE_URL: postgresql://neo_linear:neo_linear_password@postgres:5432/neo_linear
      JWT_SECRET: ${JWT_SECRET:-dev-secret-change-in-production}
      NODE_ENV: production
      FRONTEND_URL: ${FRONTEND_URL:-http://localhost:3000}
      PORT: 3001
```

## Health Checks

The server container includes a health check:

```bash
# Manual health check
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected"
}
```

## Database Migrations

Migrations run automatically on container startup:

```bash
CMD sh -c "npx prisma migrate deploy && npm run start"
```

To run migrations manually:

```bash
# Inside container
docker compose exec server npx prisma migrate deploy

# Or with Prisma CLI
docker compose exec server npx prisma migrate dev
```

## Troubleshooting

### Build Fails with "exit code 2"

**Cause**: Missing environment variables during build

**Solution**:
1. Check `docker-compose.yml` build args are set
2. Verify `.env` file exists with required variables
3. Run test script: `cd server && ./test-build.sh`

### Container Won't Start

**Cause**: Database not ready

**Solution**:
```bash
# Check container status
docker compose ps

# Check database logs
docker compose logs postgres

# Restart server after database is ready
docker compose restart server
```

### Permission Errors

**Cause**: Running as root

**Solution**: Container runs as `prisma` user (uid 1001)

### Port Already in Use

**Cause**: Port 3001 already bound

**Solution**:
```bash
# Find process using port 3001
netstat -tulpn | grep 3001

# Or change port in docker-compose.yml
services:
  server:
    ports:
      - "3002:3001"  # Use 3002 on host
```

## Production Deployment

### Using Easypanel (Recommended for VPS)

1. **Add New Service** → **Docker Compose**
2. **Paste** `docker-compose.yml` content
3. **Set Environment Variables** in Easypanel:
   - `JWT_SECRET`: Your generated secret
   - `FRONTEND_URL`: Your actual frontend domain
4. **Deploy**

### Using Docker Commands

```bash
# Build image
docker build -t neo-linear-server ./server

# Run with all dependencies
docker compose up -d

# Scale server (if needed)
docker compose up -d --scale server=3
```

### Using Kubernetes

See `k8s/` directory for Kubernetes manifests (if available).

## Security Best Practices

1. **Always use strong JWT_SECRET**:
   ```bash
   openssl rand -hex 32
   ```

2. **Use non-root user** (already configured)

3. **Limit container capabilities**:
   ```yaml
   cap_drop:
     - ALL
   cap_add:
     - NET_BIND_SERVICE
   ```

4. **Use read-only root filesystem** (advanced):
   ```yaml
   read_only: true
   tmpfs:
     - /tmp
   ```

5. **Scan images for vulnerabilities**:
   ```bash
   docker scan neo-linear-server:latest
   ```

## Monitoring

### Logs

```bash
# Follow logs
docker compose logs -f server

# Last 100 lines
docker compose logs --tail=100 server

# Since specific time
docker compose logs --since 1h server
```

### Metrics

The server exposes metrics at `/api/metrics` (if configured).

### Performance

```bash
# Container stats
docker stats neo_linear_server

# Resource usage
docker compose top
```

## Backup and Restore

### Database Backup

```bash
# Backup
docker compose exec postgres pg_dump -U neo_linear neo_linear > backup.sql

# Restore
docker compose exec -T postgres psql -U neo_linear neo_linear < backup.sql
```

### Volume Backup

```bash
# Backup volumes
docker run --rm -v neo_linear_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz /data

# Restore
docker run --rm -v neo_linear_postgres_data:/data -v $(pwd):/backup alpine sh -c "cd /data && tar xzf /backup/postgres-backup.tar.gz --strip 1"
```

## Updating

```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose up -d --build

# Or specific service
docker compose up -d --build server
```

## Support

For issues and questions:
- GitHub Issues: [repository-url]/issues
- Documentation: See `CLAUDE.md` and `README.md`
