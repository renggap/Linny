# Neo Linear Production Setup

This document contains information about the production deployment of Neo Linear at https://linear.neodigital.co.id

## 🚀 Production URL

**Frontend**: https://linear.neodigital.co.id
**API**: https://linear.neodigital.co.id/api

## 🏗️ Architecture

```
Internet (Port 443/80)
    ↓
nginx (SSL Termination, Reverse Proxy)
    ↓
├──→ Frontend (Vite Preview Server - Port 4173)
└──→ Backend API (Fastify - Port 3001)
    ├──→ PostgreSQL (Docker - Port 5432)
    └──→ Redis (Docker - Port 6379)
```

## 🔐 Security Features

### SSL/TLS Configuration
- **Certificate**: Let's Encrypt (auto-renews)
- **Protocols**: TLS 1.2 and 1.3 only
- **HSTS**: Enabled with 2-year max-age, includeSubDomains, preload
- **OCSP Stapling**: Enabled

### Nginx Security Headers
- `Strict-Transport-Security`: max-age=63072000; includeSubDomains; preload
- `X-Frame-Options`: SAMEORIGIN
- `X-Content-Type-Options`: nosniff
- `X-XSS-Protection`: 1; mode=block
- `Referrer-Policy`: strict-origin-when-cross-origin
- `Permissions-Policy`: geolocation=(), microphone=(), camera=()

### Rate Limiting
- **API endpoints**: 10 req/s with burst of 20
- **General requests**: 30 req/s with burst of 50
- **Backend**: 100 req per 15 minutes per IP
- **429 status**: Returned when limit exceeded

### Backend Security
- **JWT**: 3-day expiry, secret validation on startup
- **CORS**: Strict origin checking (production domain only)
- **Rate limiting**: Removed allowList bypasses in production
- **Body limit**: 5MB max request size
- **Logging**: Warning level in production (JSON format)
- **Sensitive data redaction**: Authorization headers and cookies not logged

## 📊 Monitoring

### Health Endpoints

**Backend Health:**
```bash
curl https://linear.neodigital.co.id/api/health
```

Returns:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-27T06:31:00.000Z",
  "uptime": "0m 52s",
  "database": "connected",
  "redis": {
    "status": "connected",
    "memory": "1.05M",
    "keyCount": 0
  },
  "memory": "22MB / 24MB",
  "environment": "production"
}
```

### Service Status

Check all services:
```bash
/home/Linear-Clone/manage-production.sh status
```

## 🔧 Service Management

### Management Script

All production services are managed via the `manage-production.sh` script:

```bash
# Start all services
./manage-production.sh start

# Stop all services
./manage-production.sh stop

# Restart all services
./manage-production.sh restart

# Check service status
./manage-production.sh status

# View logs (follow mode)
./manage-production.sh logs backend
./manage-production.sh logs frontend
```

### Manual Service Control

**Backend (Fastify):**
```bash
# Start
cd /home/Linear-Clone/server
export $(cat /home/Linear-Clone/.env | grep -v '^#' | xargs)
NODE_ENV=production node dist/index.js

# Stop
pkill -f "node.*dist/index.js"
```

**Frontend (Vite Preview):**
```bash
# Start
cd /home/Linear-Clone
npm run preview

# Stop
pkill -f "vite preview"
```

**Nginx:**
```bash
# Start
systemctl start nginx

# Stop
systemctl stop nginx

# Restart
systemctl restart nginx

# Reload config (no downtime)
systemctl reload nginx

# Check status
systemctl status nginx
```

**Docker (PostgreSQL + Redis):**
```bash
# Start
docker compose up -d

# Stop
docker compose down

# View logs
docker compose logs -f

# Check status
docker compose ps
```

## 📝 Logs

### Log Locations

- **Backend**: `/home/Linear-Clone/logs/backend.log`
- **Frontend**: `/home/Linear-Clone/logs/frontend.log`
- **Nginx access**: `/var/log/nginx/access.log`
- **Nginx error**: `/var/log/nginx/error.log`
- **Backend error**: Check via management script `./manage-production.sh logs backend`

### Viewing Logs

```bash
# Follow backend logs
./manage-production.sh logs backend

# Follow frontend logs
./manage-production.sh logs frontend

# Nginx access log (last 100 lines)
tail -100 /var/log/nginx/access.log

# Nginx error log (last 100 lines)
tail -100 /var/log/nginx/error.log
```

## 🔄 Deployment Process

### Initial Setup

1. **Build frontend:**
   ```bash
   cd /home/Linear-Clone
   npm run build
   ```

2. **Build backend:**
   ```bash
   cd /home/Linear-Clone/server
   npm run build
   ```

3. **Start services:**
   ```bash
   ./manage-production.sh start
   ```

### Updates

1. **Stop services:**
   ```bash
   ./manage-production.sh stop
   ```

2. **Pull latest code**

3. **Rebuild:**
   ```bash
   npm run build
   cd server && npm run build
   ```

4. **Start services:**
   ```bash
   ./manage-production.sh start
   ```

## 🔐 Environment Variables

Production environment variables are stored in `/home/Linear-Clone/.env`:

```bash
# JWT Authentication
JWT_SECRET=<your-secure-secret>

# Database
DATABASE_URL="postgresql://neo_linear:password@localhost:5432/neo_linear"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_ENABLED=true
REDIS_PREFIX=neo_linear:

# Frontend
FRONTEND_URL=https://linear.neodigital.co.id
VITE_API_URL=https://linear.neodigital.co.id
```

**Important**: The `.env` file has restricted permissions (600).

## 🛡️ SSL Certificate Management

SSL certificates are managed by Let's Encrypt via certbot:

- **Auto-renewal**: Enabled (systemd timer)
- **Certificate location**: `/etc/letsencrypt/live/linear.neodigital.co.id/`
- **Manual renewal**:
  ```bash
  certbot renew
  ```
- **Dry run** (test renewal):
  ```bash
  certbot renew --dry-run
  ```

## 📈 Performance Optimizations

### Nginx
- HTTP/2 enabled
- Static asset caching (1 year)
- Gzip compression
- SSL session caching
- Proxy buffering disabled for API (real-time responses)
- WebSocket timeouts: 7 days

### Backend
- Redis caching for API responses
- Connection pooling (Prisma)
- Job queue for background tasks
- Request/response logging disabled in production

### Frontend
- Production build (minified, tree-shaken)
- Static asset caching via nginx
- Code splitting for optimal loading

## 🚨 Troubleshooting

### Services Not Starting

1. **Check logs:**
   ```bash
   ./manage-production.sh logs backend
   ./manage-production.sh logs frontend
   ```

2. **Verify environment variables:**
   ```bash
   cat /home/Linear-Clone/.env
   ```

3. **Check ports:**
   ```bash
   ss -tlnp | grep -E ':3001|:4173|:443|:80'
   ```

4. **Verify Docker containers:**
   ```bash
   docker compose ps
   ```

### High Memory Usage

- Check Redis memory: `redis-cli info memory`
- Check database connections: Review Prisma connection pool
- Review nginx worker processes: `ps aux | grep nginx`

### SSL Certificate Issues

```bash
# Check certificate expiry
echo | openssl s_client -connect linear.neodigital.co.id:443 -servername linear.neodigital.co.id 2>/dev/null | grep -E 'subject|notAfter'

# Force renewal
certbot force-renewal

# Restart nginx after renewal
systemctl reload nginx
```

## 📞 Support

For issues or questions:
- Check logs: `/home/Linear-Clone/logs/`
- Check service status: `./manage-production.sh status`
- Review this documentation
- Check nginx config: `/etc/nginx/sites-available/linear.neodigital.co.id`

## 📅 Maintenance

### Daily
- Monitor logs for errors
- Check service status

### Weekly
- Review error logs
- Check disk space
- Monitor memory usage

### Monthly
- Review SSL certificate status
- Check for security updates
- Review rate limiting effectiveness
- Database backup verification

### Quarterly
- Security audit
- Performance review
- Dependency updates
- Disaster recovery testing
