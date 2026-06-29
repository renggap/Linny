# Linny Live Deployment Design

**Date:** 2026-06-29
**Status:** Approved
**Target domain:** `linny-live.microworker.my.id`
**Target directory:** `/home/linny-live/`

## Goal

Deploy the Neo Linear app (current `main`) to `/home/linny-live/` serving `https://linny-live.microworker.my.id`. Fresh database, fresh secrets, real-time features (WebSocket) working through nginx.

## Architecture

**Stack placement:**
- `/home/linny-live/` — git clone of `main` from `/home/linny/.git`
- PostgreSQL: existing native instance (`127.0.0.1:5432`), fresh database `linny_live` + dedicated role
- Redis: existing native instance (`127.0.0.1:6379`), namespaced with prefix `linny_live:`
- Frontend: Vite build → `/home/linny-live/dist/`, served directly by nginx at `/`
- Backend: Node Fastify on `127.0.0.1:3001` under PM2 (process name `linny-live`)
- nginx vhost: serves `dist/`, proxies `/api/*` and `/ws/*` to `127.0.0.1:3001` with WebSocket `Upgrade` headers
- TLS: Let's Encrypt via certbot (matches existing `blow.on-development.my.id` pattern)
- DNS: Cloudflare A + AAAA records, **DNS-only (gray cloud)** for first deploy

**Why this shape:**
- Matches existing server pattern (native Postgres/Redis, nginx, PM2 — no Docker present)
- Frontend as static files via nginx is the simplest production setup
- DNS-only first deploy avoids Cloudflare-WS complications; can flip to proxied later

## Secrets & env

`/home/linny-live/.env` (chmod 600, never committed):

- `JWT_SECRET` — 64-char hex via `openssl rand -hex 32`
- `DATABASE_URL` — `postgresql://linny_live:<gen>@localhost:5432/linny_live` (32-char alphanumeric)
- `FRONTEND_URL` — `https://linny-live.microworker.my.id`
- `NODE_ENV` — `production`
- `PORT` — `3001`
- `REDIS_PREFIX` — `linny_live:`
- `REDIS_ENABLED` — `true`

Frontend env (`VITE_API_URL`) baked into bundle at build time: `https://linny-live.microworker.my.id/api/v1`.

## Initialization

**PostgreSQL setup:**
- `sudo -u postgres psql` → `CREATE ROLE linny_live WITH ENCRYPTED PASSWORD '<gen>' LOGIN; CREATE DATABASE linny_live OWNER linny_live;`
- `cd /home/linny-live/server && npx prisma migrate deploy` (production-safe)
- `npm run seed` for sample data (optional)

**First user:** automatically promoted to Administrator per `server/index.ts:397-403`.

## Deploy sequence

1. **Cloudflare DNS** — create A + AAAA records (zone `c2a13285a51821c665533987db293771`), DNS-only. Verify via `dig`.
2. **Code** — clone repo to `/home/linny-live/`, checkout `main`.
3. **Secrets** — generate, write `.env` chmod 600.
4. **PostgreSQL** — create role + database.
5. **Dependencies** — `npm install` at root + `server/`.
6. **Prisma** — `prisma generate && prisma migrate deploy`.
7. **Build frontend** — `npm run build`.
8. **Seed (optional)** — `npm run seed`.
9. **PM2** — `pm2 start server/dist/index.js --name linny-live`, `pm2 save`.
10. **nginx vhost** — write config, `nginx -t`, `systemctl reload nginx`.
11. **TLS** — `certbot --nginx -d linny-live.microworker.my.id --non-interactive`.
12. **Smoke test** — `curl -sI https://...` for both `/` and `/api/health`.

## Rollback strategy

Each step is independently revertible:
- DNS: delete Cloudflare record
- Code: `rm -rf /home/linny-live/`
- DB: `DROP DATABASE linny_live; DROP ROLE linny_live;`
- PM2: `pm2 delete linny-live`
- nginx: `rm /etc/nginx/sites-enabled/linny-live.microworker.my.id && systemctl reload nginx`
- TLS: certbot auto-cleans on cert deletion

Failures during one step don't break existing services (other vhosts, other PM2 processes, existing DBs).

## Post-deploy checklist

- [ ] Visit `https://linny-live.microworker.my.id` → loads app, redirects to auth
- [ ] Register first user → becomes Administrator
- [ ] Login, create team, create issue → works end-to-end
- [ ] WebSocket connects (`wss://...`) — check browser dev tools
- [ ] `pm2 logs linny-live --lines 50` shows no errors

## Out of scope

- Docker / docker-compose
- Staging environment
- CDN
- Log aggregation (Datadog, CloudWatch, etc.)
- Automated DB backups (document as ops follow-up)
- Email/SMTP (email features will log to stdout until `EMAIL_*` env vars configured)
- Cloudflare proxy mode (can flip to proxied later — requires confirming WebSocket support on the Cloudflare zone)
