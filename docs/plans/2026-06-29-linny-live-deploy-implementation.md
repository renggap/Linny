# Linny Live Deployment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deploy Neo Linear `main` to `/home/linny-live/` serving `https://linny-live.microworker.my.id` end-to-end (frontend + API + WebSocket) on the existing nginx + native PostgreSQL/Redis + PM2 server.

**Architecture:** Fresh DB `linny_live` on existing Postgres, namespaced Redis (`linny_live:` prefix), static frontend served by nginx at `/`, Fastify backend on `127.0.0.1:3001` under PM2, nginx proxies `/api/*` and `/ws/*` to backend with WebSocket upgrade headers, TLS via Let's Encrypt, DNS via Cloudflare API (DNS-only).

**Tech Stack:** nginx, PostgreSQL 16, Redis 7, Node 20+, PM2, Fastify, Prisma, Vite, certbot, Cloudflare API.

---

## Sequencing

12 sequential tasks. Each is independently revertible. Do not parallelize — later steps depend on earlier outputs (DB password, build artifacts, etc.).

1. Cloudflare DNS A+AAAA records
2. Clone code to `/home/linny-live/`
3. Generate secrets + write `.env`
4. Create PostgreSQL role + database
5. Install dependencies (root + server)
6. Run Prisma migrations
7. Build frontend
8. Seed database (optional)
9. Start PM2 process
10. Write + enable nginx vhost
11. Issue TLS cert via certbot
12. Smoke test

---

## Task 1: Create Cloudflare DNS records

**Files affected:** None (Cloudflare API only)

**Step 1: Discover existing record (if any)**

```bash
curl -s -X GET "https://api.cloudflare.com/client/v4/zones/c2a13285a51821c665533987db293771/dns_records?name=linny-live.microworker.my.id" \
  -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
  -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
  -H "Content-Type: application/json" | jq '.result | length'
```
Expected output: `0` (no existing record). If `1` or more, skip to step 4.

**Step 2: Create A record (IPv4)**

```bash
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/c2a13285a51821c665533987db293771/dns_records" \
  -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
  -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "A",
    "name": "linny-live",
    "content": "152.53.186.207",
    "ttl": 120,
    "proxied": false
  }' | jq '.success, .result.id'
```
Expected: `true` then a record ID. `proxied: false` = DNS-only (gray cloud).

**Step 3: Create AAAA record (IPv6)**

```bash
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/c2a13285a51821c665533987db293771/dns_records" \
  -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
  -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "AAAA",
    "name": "linny-live",
    "content": "2a0a:4cc0:c1:1116:28f9:c6ff:fe84:a452",
    "ttl": 120,
    "proxied": false
  }' | jq '.success'
```
Expected: `true`.

**Step 4: Verify resolution (may take 30-60s)**

```bash
for i in 1 2 3 4 5 6; do
  result=$(dig +short linny-live.microworker.my.id A | head -1)
  [ -n "$result" ] && break
  sleep 10
done
echo "Resolved: $result"
```
Expected: `Resolved: 152.53.186.207`.

**Rollback:** `curl -X DELETE .../dns_records/<record-id>` for both records.

---

## Task 2: Clone code to /home/linny-live/

**Step 1: Clone from local repo**

```bash
git clone /home/linny /home/linny-live
cd /home/linny-live
git checkout main
git log --oneline -1
```
Expected: latest commit on `main` (`eb169f2 docs: add linny-live deployment design` or newer).

**Step 2: Verify .env is NOT tracked**

```bash
git ls-files | grep -E "^\.env$" && echo "WARNING: .env is tracked!" || echo "OK: .env not tracked"
cat .gitignore | grep -E "^\.env$"
```
Expected: `OK: .env not tracked` and a matching line in `.gitignore`.

**Rollback:** `rm -rf /home/linny-live`.

---

## Task 3: Generate secrets + write .env

**Step 1: Generate secrets**

```bash
JWT_SECRET=$(openssl rand -hex 32)
DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)
echo "JWT_SECRET length: ${#JWT_SECRET}"
echo "DB_PASSWORD length: ${#DB_PASSWORD}"
```
Expected: `JWT_SECRET length: 64`, `DB_PASSWORD length: 32`.

**Step 2: Write .env**

```bash
cat > /home/linny-live/.env <<EOF
PORT=3001
NODE_ENV=production
JWT_SECRET=$JWT_SECRET
DATABASE_URL=postgresql://linny_live:$DB_PASSWORD@localhost:5432/linny_live
FRONTEND_URL=https://linny-live.microworker.my.id
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_ENABLED=true
REDIS_PREFIX=linny_live:
EOF
chmod 600 /home/linny-live/.env
```

**Step 3: Verify**

```bash
ls -la /home/linny-live/.env
cat /home/linny-live/.env | grep -E "^(JWT_SECRET|DATABASE_URL)=" | sed 's/=.*/=<redacted>/'
```
Expected: `-rw------- 1 ... .env` and two `<redacted>` lines.

**Step 4: Save password for next task**

```bash
echo "$DB_PASSWORD" > /tmp/linny-live-db-password
chmod 600 /tmp/linny-live-db-password
```
Will be consumed in Task 4 and then deleted.

**Rollback:** `rm /home/linny-live/.env /tmp/linny-live-db-password`.

---

## Task 4: Create PostgreSQL role + database

**Step 1: Run SQL**

```bash
DB_PASSWORD=$(cat /tmp/linny-live-db-password)
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
CREATE ROLE linny_live WITH ENCRYPTED PASSWORD '$DB_PASSWORD' LOGIN;
CREATE DATABASE linny_live OWNER linny_live;
GRANT ALL PRIVILEGES ON DATABASE linny_live TO linny_live;
SQL
```
Expected: `CREATE ROLE`, `CREATE DATABASE`, `GRANT`.

**Step 2: Verify connection**

```bash
DB_PASSWORD=$(cat /tmp/linny-live-db-password)
PGPASSWORD="$DB_PASSWORD" psql -h localhost -U linny_live -d linny_live -c '\conninfo'
```
Expected: connection info showing `linny_live@localhost:5432`.

**Step 3: Clean up password file**

```bash
rm /tmp/linny-live-db-password
```

**Rollback:** `sudo -u postgres psql -c 'DROP DATABASE linny_live; DROP ROLE linny_live;'`.

---

## Task 5: Install dependencies

**Step 1: Install root deps**

```bash
cd /home/linny-live
npm install --omit=dev --no-audit --no-fund 2>&1 | tail -5
```
Expected: `added N packages` with no errors.

**Step 2: Install server deps (need devDeps for build)**

```bash
cd /home/linny-live/server
npm install --no-audit --no-fund 2>&1 | tail -5
```
Expected: `added N packages` with no errors.

**Step 3: Verify Prisma client exists**

```bash
ls /home/linny-live/server/node_modules/.prisma/client/index.js 2>&1 | head -1
```
Will likely fail — Prisma client gets generated in Task 6.

**Rollback:** `rm -rf /home/linny-live/node_modules /home/linny-live/server/node_modules`.

---

## Task 6: Run Prisma migrations

**Step 1: Generate Prisma client**

```bash
cd /home/linny-live/server
npx prisma generate 2>&1 | tail -5
```
Expected: `Generated Prisma Client`.

**Step 2: Apply migrations**

```bash
cd /home/linny-live/server
npx prisma migrate deploy 2>&1 | tail -15
```
Expected: `Applied N migrations` or `No pending migrations to apply`.

**Step 3: Verify schema**

```bash
PGPASSWORD="$(grep -oP '(?<=:)[^@]+(?=@localhost)' /home/linny-live/.env)" \
  psql -h localhost -U linny_live -d linny_live -c '\dt' | head -20
```
Expected: list of tables including `User`, `Team`, `Project`, `Issue`, etc.

**Rollback:** `sudo -u postgres psql -c 'DROP DATABASE linny_live; CREATE DATABASE linny_live OWNER linny_live;'` then re-run migrations.

---

## Task 7: Build frontend

**Step 1: Set build-time env**

```bash
cd /home/linny-live
export VITE_API_URL=https://linny-live.microworker.my.id/api/v1
```

**Step 2: Run build**

```bash
npm run build 2>&1 | tail -15
```
Expected: `dist/index.html`, `dist/assets/...`, "built in Xs".

**Step 3: Verify dist**

```bash
ls /home/linny-live/dist/index.html
ls /home/linny-live/dist/assets/ | head -5
```
Expected: both `index.html` and `assets/` exist with content.

**Rollback:** `rm -rf /home/linny-live/dist`.

---

## Task 8: Build server + seed database (optional)

**Step 1: Build server TypeScript**

```bash
cd /home/linny-live/server
npm run build 2>&1 | tail -5
```
Expected: TypeScript compile succeeds, `server/dist/index.js` exists.

```bash
ls /home/linny-live/server/dist/index.js
```
Expected: file exists.

**Step 2: Seed sample data**

```bash
cd /home/linny-live
npm run seed 2>&1 | tail -10
```
Expected: `Seeding complete` or similar. If seed fails for non-fatal reasons (e.g., already-seeded), note and proceed.

**Rollback:** Skip step 2 if not desired. To wipe: `sudo -u postgres psql -c 'TRUNCATE ... CASCADE;'` (drastic — prefer re-running seed).

---

## Task 9: Start PM2 process

**Step 1: Start server under PM2**

```bash
cd /home/linny-live
pm2 start server/dist/index.js \
  --name linny-live \
  --env production \
  --cwd /home/linny-live/server
pm2 save
```
Expected: `[PM2] Spawning PM2 daemon`, `[PM2][...] App linny-live launched`, `Saving current process list`.

**Step 2: Verify online**

```bash
sleep 3
pm2 list | grep linny-live
pm2 logs linny-live --lines 20 --nostream 2>&1 | tail -25
```
Expected: `online` status, no error stack in logs, `Neo Linear server started on port 3001`.

**Step 3: Verify local HTTP**

```bash
curl -sI http://127.0.0.1:3001/api/health | head -5
curl -s http://127.0.0.1:3001/api/health | jq '.status, .database, .redis.connected'
```
Expected: `200 OK`, then `healthy`, `connected`, `true`.

**Step 4: Ensure PM2 survives reboot**

```bash
pm2 startup systemd 2>&1 | tail -5
```
If output says `[PM2] Init script found` and `systemctl enable pm2-root`, already set up. If it suggests running a `sudo env ...` command, run it.

**Rollback:** `pm2 delete linny-live && pm2 save`.

---

## Task 10: Write + enable nginx vhost

**Step 1: Write vhost config**

Create `/etc/nginx/sites-available/linny-live.microworker.my.id` with sudo:

```nginx
# HTTP → HTTPS redirect + ACME challenge
server {
    listen 80;
    listen [::]:80;
    server_name linny-live.microworker.my.id;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS — installed by certbot in Task 11. Placeholder for now so config validates.
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name linny-live.microworker.my.id;

    # Cert paths populated by certbot --nginx in Task 11
    ssl_certificate /etc/letsencrypt/live/linny-live.microworker.my.id/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/linny-live.microworker.my.id/privkey.pem;

    # Static frontend
    root /home/linny-live/dist;
    index index.html;

    # Logging
    access_log /var/log/nginx/linny-live-access.log;
    error_log /var/log/nginx/linny-live-error.log;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;

    # API + WebSocket → Fastify backend
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket-friendly timeouts
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    # Static files + SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Note: This config references cert paths that won't exist until Task 11. To avoid a chicken-and-egg problem, Task 11 will issue the cert FIRST against the HTTP-only block, then we'll enable the HTTPS block. Alternatively, comment out the HTTPS `server { ... }` block for now and let certbot add it via `--nginx`. Use the latter approach:

**Simplified config (use this for Task 10):** HTTP-only block + static-file serving on port 80. certbot will add the HTTPS block in Task 11.

```bash
sudo tee /etc/nginx/sites-available/linny-live.microworker.my.id > /dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name linny-live.microworker.my.id;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    root /home/linny-live/dist;
    index index.html;

    access_log /var/log/nginx/linny-live-access.log;
    error_log /var/log/nginx/linny-live-error.log;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF
```

**Step 2: Ensure /var/www/certbot exists**

```bash
sudo mkdir -p /var/www/certbot
ls -ld /var/www/certbot
```

**Step 3: Enable + test + reload**

```bash
sudo ln -sf /etc/nginx/sites-available/linny-live.microworker.my.id /etc/nginx/sites-enabled/
sudo nginx -t 2>&1 | tail -3
sudo systemctl reload nginx
```
Expected: `syntax is ok`, `test is successful`, then silent reload.

**Step 4: Verify HTTP serving**

```bash
curl -sI http://linny-live.microworker.my.id/ | head -3
curl -sI http://linny-live.microworker.my.id/api/health | head -3
```
Expected: `200 OK` for both (frontend HTML + JSON from API).

**Rollback:** `sudo rm /etc/nginx/sites-enabled/linny-live.microworker.my.id && sudo systemctl reload nginx`.

---

## Task 11: Issue TLS cert via certbot

**Step 1: Issue cert**

```bash
sudo certbot --nginx \
  -d linny-live.microworker.my.id \
  --non-interactive \
  --agree-tos \
  -m admin@microworker.my.id \
  --redirect 2>&1 | tail -15
```
Expected: `Congratulations! Your certificate and chain have been saved`, then `Deploying certificate` and `Successfully deployed certificate`.

certbot will auto-edit `/etc/nginx/sites-available/linny-live.microworker.my.id` to add the 443 server block + redirect.

**Step 2: Verify cert files**

```bash
sudo ls /etc/letsencrypt/live/linny-live.microworker.my.id/
```
Expected: `cert.pem`, `chain.pem`, `fullchain.pem`, `privkey.pem`, `README`.

**Step 3: Verify HTTPS serving**

```bash
curl -sI https://linny-live.microworker.my.id/ | head -5
curl -sI https://linny-live.microworker.my.id/api/health | head -5
```
Expected: `HTTP/2 200` (or `HTTP/1.1 200`) with `server: nginx`.

**Step 4: Verify auto-renewal**

```bash
sudo certbot renew --dry-run 2>&1 | tail -5
```
Expected: `simulating renewal` and `Congratulations, all renewals succeeded`.

**Rollback:** `sudo certbot delete --cert-name linny-live.microworker.my.id`. The nginx vhost will revert to HTTP-only.

---

## Task 12: Smoke test

**Step 1: Frontend loads**

```bash
curl -s https://linny-live.microworker.my.id/ | grep -E '<title|<div id="root"' | head -3
```
Expected: `<title>...Neo Linear...</title>` and `<div id="root">`.

**Step 2: API health**

```bash
curl -s https://linny-live.microworker.my.id/api/health | jq
```
Expected: JSON with `status: "healthy"`, `database: "connected"`, `redis.connected: true`.

**Step 3: CSRF token**

```bash
curl -sI https://linny-live.microworker.my.id/api/csrf-token | grep -iE "set-cookie|HTTP"
curl -s https://linny-live.microworker.my.id/api/csrf-token | jq
```
Expected: `HTTP/2 200`, `set-cookie: csrfToken=...`, JSON body `{ "csrfToken": "..." }`.

**Step 4: WebSocket (manual browser test)**

Open `https://linny-live.microworker.my.id` in a browser, register a user, create a team. Verify in dev tools:
- `wss://linny-live.microworker.my.id/ws/user/<id>` connects (101 Switching Protocols)
- No console errors
- `__cfruid` / `csrfToken` cookies present

**Step 5: PM2 logs clean**

```bash
pm2 logs linny-live --lines 50 --nostream 2>&1 | grep -iE "error|fatal" | head -5
```
Expected: no matches (or only pre-startup dev warnings).

**Step 6: Final summary**

```bash
echo "=== Linny Live Deploy ==="
echo "URL: https://linny-live.microworker.my.id"
echo "DB:  linny_live on localhost:5432"
echo "PM2: $(pm2 list | grep linny-live | awk '{print $18}')"
echo "TLS:  $(sudo openssl x509 -in /etc/letsencrypt/live/linny-live.microworker.my.id/cert.pem -noout -dates | head -1)"
```

---

## Final verification checklist

After all 12 tasks:

- [ ] `dig linny-live.microworker.my.id` returns `152.53.186.207`
- [ ] `https://linny-live.microworker.my.id/` returns 200 + HTML
- [ ] `https://linny-live.microworker.my.id/api/health` returns `status: healthy`
- [ ] `https://linny-live.microworker.my.id/api/csrf-token` sets csrfToken cookie
- [ ] WebSocket `wss://...` connects from browser
- [ ] `pm2 list` shows `linny-live` online
- [ ] `certbot renew --dry-run` succeeds
- [ ] First user registration promotes to Administrator

---

## Sequencing recap

- One execution session, 12 sequential tasks, no commits to the app repo (this is deploy infra, not code)
- Each task has explicit rollback
- DNS propagates while you continue with code/DB setup
- TLS issued last so HTTP-only nginx can serve the ACME challenge

---

## Out of scope

- Cloudflare proxy mode (gray cloud for now; flip to orange later if desired)
- Email/SMTP (email features log to stdout until `EMAIL_*` env vars set)
- Automated DB backups
- Monitoring/alerting
- Staging environment
