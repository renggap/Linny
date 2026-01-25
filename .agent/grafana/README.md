# Grafana Dashboard for Navigator

This directory contains a complete Grafana + Prometheus stack for monitoring Claude Code Navigator metrics.

## Quick Start

```bash
cd .agent/grafana
docker compose up -d
```

## Access

- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090

## Dashboard

The Navigator dashboard includes:
- Token usage trends
- Context efficiency metrics
- Cache performance
- Session duration tracking
- Error rates

## Stopping

```bash
docker compose down
```

## Data Persistence

Metrics data is stored in Docker volumes:
- `prometheus-data`: Prometheus time-series database
- `grafana-data`: Grafana dashboards and settings

To completely reset:
```bash
docker compose down -v
```
