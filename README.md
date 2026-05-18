# AI Website Builder

AI-powered website builder with real-time LLM generation, multi-tenant isolation, production-grade observability, and an automated CI/CD pipeline.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Dashboard   │  │    Editor    │  │   Published Site │  │
│  │  (React/Web) │  │  (React/Web) │  │  (React/Renderer)│  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │            │
│         │           postMessage                │            │
│         │           (AUTH handshake,           │            │
│         │            no token in URL)          │            │
│         └─────────────────┼────────────────────┘            │
└───────────────────────────┼─────────────────────────────────┘
                            │ HTTP/SSE
┌───────────────────────────┼─────────────────────────────────┐
│                    Fastify API (Node.js)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │   Auth   │  │ Generate │  │  Publish │  │  Renderer   │ │
│  │ JWT RS256│  │  LLM     │  │  CDN/R2  │  │  Session    │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬──────┘ │
│       │              │             │                │        │
│  ┌────┴──────────────┴─────────────┴────────────────┴────┐  │
│  │              withRls(Prisma + PostgreSQL)              │  │
│  │              Multi-tenant RLS isolation                │  │
│  └──────────────────────────┬────────────────────────────┘  │
│                             │                                │
│  ┌──────────────────────────┴────────────────────────────┐  │
│  │              BullMQ (Redis-backed queues)              │  │
│  │  Generation Workers │ Publish Workers │ DLQ Consumer  │  │
│  │  Region-scoped queues │ Heartbeat monitor              │  │
│  └───────────────────────────────────────────────────────┘  │
│                             │                                │
│  ┌──────────────────────────┴────────────────────────────┐  │
│  │              Redis (Cache + Pub/Sub + Metrics)         │  │
│  │  SSE Manager │ Rate Limiter │ Metrics │ Alert Engine  │  │
│  │  Baselines │ Error Groups │ Incident Dashboard        │  │
│  └───────────────────────────────────────────────────────┘  │
│                             │                                │
│  ┌──────────────────────────┴────────────────────────────┐  │
│  │     PostgreSQL 16 (Prisma ORM + Row-Level Security)   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    CI/CD Pipeline (GitHub Actions)            │
│  PR/Cherry-pick → CI (lint, typecheck, test, audit, build)  │
│  Push to main  → CI → Staging deploy (auto)                 │
│                  → Production deploy (manual approval gate)  │
│                  → Health check → Rollback on failure        │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

- **LLM-Powered Generation** — OpenAI/Anthropic with 60s hard timeout, per-user cost caps, and atomic Lua-enforced budget limits
- **Multi-tenant Isolation** — PostgreSQL Row-Level Security enforced via `withRls()` transaction wrapper with build-time guards preventing bypass
- **Rate Limiting** — 3-layer defense: Lua sliding-window burst (5/10s), global sustained (30/min), per-route overrides, plus worker-level INCR+EXPIRE
- **Real-Time SSE** — Shared Redis subscriber pattern (1 connection per process, ref-counted) with polling fallback and AUTH handshake (no tokens in URLs)
- **Production Monitoring** — Real-time alert engine, EMA baselines, error grouping with per-minute trends, cost anomaly detection, root cause inference
- **CI/CD Pipeline** — GitHub Actions with Docker multi-stage builds, GHCR registry, SSH deploy, health-gated promotions, and automatic rollback
- **Export** — Full site export as ZIP archive

## Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js 20, TypeScript 5 |
| **API Framework** | Fastify 5 |
| **Database** | PostgreSQL 16, Prisma ORM 6 |
| **Cache / Pub/Sub** | Redis 7 (ioredis) |
| **Job Queue** | BullMQ 5 |
| **Auth** | JWT RS256 (15min access + rotating refresh), bcrypt (salt 12) |
| **LLM** | OpenAI SDK, Anthropic SDK |
| **CDN** | Cloudflare R2 (S3-compatible) |
| **DNS** | Cloudflare API |
| **Frontend (Web)** | React 18, Vite, TanStack Query, Zustand, Tailwind CSS, dnd-kit, react-hook-form + Zod |
| **Frontend (Renderer)** | React 18, standalone Vite app, postMessage bridge |
| **CI/CD** | GitHub Actions, Docker, GitHub Container Registry (GHCR) |
| **Deployment** | SSH + Docker (staging / production environments) |

## Project Structure

```
├── .github/workflows/   GitHub Actions CI/CD pipeline
├── apps/
│   ├── api/             Fastify API server (monorepo entry)
│   │   ├── prisma/      Schema + migrations
│   │   ├── src/
│   │   │   ├── lib/     Core libraries (metrics, SSE, monitoring, RLS, workers)
│   │   │   ├── middleware/  Auth + RLS middleware
│   │   │   ├── modules/     Domain modules (auth, generation, publish, editor, etc.)
│   │   │   └── plugins/     Fastify plugins (prisma, redis, rate-limiter, logger)
│   │   ├── Dockerfile       Multi-stage production build
│   │   └── .env.example
│   ├── web/             React dashboard + editor frontend
│   └── renderer/        Standalone React renderer (iframed published sites)
├── docs/launch/         Launch checklists and deployment docs
├── scripts/             Build-time security guards
│   ├── prisma-guard.ts  Blocks raw Prisma outside withRls()
│   └── security-lint.mjs  Blocks wildcard postMessage origins, URL tokens
└── package.json         Root workspace config
```

## Environment Variables

### Server
| Variable | Default | Required | Description |
|---|---|---|---|
| `PORT` | `3001` | Yes | API server port |
| `NODE_ENV` | `development` | Yes | Runtime environment |
| `LOG_LEVEL` | `info` | No | Fastify log level (`debug`, `info`, `warn`, `error`) |
| `FRONTEND_URL` | `http://localhost:5173` | Yes | CORS origin — must be explicit, never `*` |
| `REGION` | `default` | No | Worker region tag for horizontal scaling |

### Database
| Variable | Default | Required | Description |
|---|---|---|---|
| `DATABASE_URL` | — | Yes | PostgreSQL connection string |

### Redis
| Variable | Default | Required | Description |
|---|---|---|---|
| `REDIS_HOST` | `localhost` | Yes | Redis hostname |
| `REDIS_PORT` | `6379` | Yes | Redis port |
| `REDIS_PASSWORD` | — | No | Redis password |
| `REDIS_KEY_PREFIX` | `ai-builder:` | No | Prefix for all Redis keys |

### JWT
| Variable | Required | Description |
|---|---|---|
| `JWT_PRIVATE_KEY` | Yes | RSA private key (PEM, `\n` for line breaks) |
| `JWT_PUBLIC_KEY` | Yes | RSA public key (PEM, `\n` for line breaks) |

Generate a keypair:
```bash
openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:2048
openssl pkey -in private.pem -pubout -out public.pem
# Paste as single line with \n for real newlines
```

### Cloudflare R2 (CDN)
| Variable | Required | Description |
|---|---|---|
| `R2_ENDPOINT` | Yes | R2 endpoint URL |
| `R2_ACCESS_KEY` | Yes | R2 access key ID |
| `R2_SECRET_KEY` | Yes | R2 secret access key |
| `R2_BUCKET` | Yes | R2 bucket name |
| `R2_PUBLIC_URL` | Yes | Public CDN URL |

### Cloudflare DNS
| Variable | Required | Description |
|---|---|---|
| `CF_API_TOKEN` | Yes | Cloudflare API token (DNS + cache purge) |
| `CF_ZONE_ID` | Yes | Cloudflare zone ID |
| `CDN_CNAME_TARGET` | Yes | CDN CNAME target |
| `DOMAIN_VERIFICATION_SECRET` | Yes | Secret for custom domain verification |

### LLM Provider
| Variable | Default | Required | Description |
|---|---|---|---|
| `LLM_PROVIDER` | `openai` | Yes | `openai` or `anthropic` |
| `OPENAI_API_KEY` | — | If OpenAI | OpenAI API key |
| `OPENAI_MODEL` | `gpt-4o` | No | OpenAI model |
| `ANTHROPIC_API_KEY` | — | If Anthropic | Anthropic API key |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-20250514` | No | Anthropic model |

### Worker Configuration
| Variable | Default | Description |
|---|---|---|
| `WORKER_CONCURRENCY_GENERATE` | `2` | Concurrent generation jobs per process |
| `WORKER_CONCURRENCY_PUBLISH` | `2` | Concurrent publish jobs per process |
| `WORKER_STALLED_INTERVAL` | `30000` | Stalled job detection interval (ms) |
| `WORKER_MAX_STALLED` | `1` | Max stalled attempts before retry |
| `MAX_QUEUE_DEPTH_GENERATE` | `50` | Max queued generation jobs |
| `MAX_QUEUE_DEPTH_PUBLISH` | `20` | Max queued publish jobs |

### Rate Limiting
| Variable | Default | Description |
|---|---|---|
| `RL_GLOBAL_MAX_PER_MIN` | `30` | Global sustained rate limit |
| `RL_GLOBAL_BURST_MAX` | `5` | Burst window max requests |
| `RL_GLOBAL_BURST_WINDOW_SEC` | `10` | Burst window (seconds) |

## How to Run Locally

### Prerequisites
- Node.js 20+
- PostgreSQL 16
- Redis 7
- OpenSSL (for JWT keypair generation)

### Setup

```bash
# 1. Install dependencies (all 3 apps)
cd apps/api && npm install
cd apps/web && npm install
cd apps/renderer && npm install

# 2. Generate JWT keypair
openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:2048
openssl pkey -in private.pem -pubout -out public.pem

# 3. Configure environment
cp apps/api/.env.example apps/api/.env
# Edit .env — set DATABASE_URL, REDIS_HOST, JWT keys, and LLM API key

# 4. Run database migrations
cd apps/api
npx prisma migrate dev

# 5. Start development servers (3 terminals)
# Terminal 1 — API
cd apps/api && npm run dev

# Terminal 2 — Web frontend
cd apps/web && npm run dev

# Terminal 3 — Renderer
cd apps/renderer && npm run dev
```

### Verify

```bash
# API health check
curl http://localhost:3001/api/health

# Web app
open http://localhost:5173

# Renderer
open http://localhost:5174
```

## How to Deploy

### Production Build

```bash
cd apps/api
npm run build          # TypeScript compilation → dist/
npm run prebuild       # Security guards pass automatically in CI
npm start              # Start production server (port 3001)
```

### Docker Build

```bash
cd apps/api
docker build -t ai-builder-api .
docker run -d -p 3001:3001 --env-file .env ai-builder-api
```

See `apps/api/Dockerfile` for the multi-stage build (deps → build → runner as non-root user).

### CI/CD Pipeline

The pipeline (`.github/workflows/ci-cd.yml`) has 4 jobs:

```
Pull Request ──→ CI (lint → typecheck → test → audit → build)
Push to main ──→ CI → Staging Deploy (auto) → Production Deploy (manual)
                    └──→ on failure → Rollback to previous image
```

| Job | Trigger | Description |
|---|---|---|
| `ci` | PR + push to main | Install, lint, typecheck, test, npm audit (fail on high), build, prisma generate, cache outputs |
| `deploy-staging` | Push to main (after CI) | Docker build → push to GHCR → SSH deploy → 6-retry health check |
| `deploy-production` | Push to main (manual approval) | Docker build → backup as `prod-previous` → write `.env` → run migrations → deploy → 12-retry health check → verify alerts endpoint |
| `rollback` | On production failure | SSH stop current → restart `prod-previous` → log event |

**Environments**: `staging` and `production` are configured as GitHub Environments with scoped secrets. Production requires manual approval (configurable reviewers).

**Required GitHub Secrets** (18 total):
| Environment | Secrets |
|---|---|
| Shared | `GHCR_TOKEN` (PAT with `write:packages`) |
| Staging | `STAGING_SSH_HOST`, `STAGING_SSH_USER`, `STAGING_SSH_KEY`, `STAGING_URL`, `STAGING_DATABASE_URL`, `STAGING_REDIS_HOST`, `STAGING_REDIS_PORT`, `STAGING_REDIS_PASSWORD`, `STAGING_JWT_PRIVATE_KEY`, `STAGING_JWT_PUBLIC_KEY` |
| Production | `PROD_SSH_HOST`, `PROD_SSH_USER`, `PROD_SSH_KEY`, `PROD_URL`, `PROD_DATABASE_URL`, `PROD_REDIS_HOST`, `PROD_REDIS_PORT`, `PROD_REDIS_PASSWORD`, `PROD_JWT_PRIVATE_KEY`, `PROD_JWT_PUBLIC_KEY` |

See [docs/launch/environment.md](docs/launch/environment.md) for the full per-environment variable checklist.

## API Reference

### Health Check

```http
GET /api/health
```

No auth required. Returns dependency connectivity:

```json
{
  "status": "ok",
  "timestamp": "2026-05-17T21:00:00.000Z",
  "uptime": 3600,
  "responseTimeMs": 3,
  "dependencies": {
    "redis": { "ok": true, "latencyMs": 1 },
    "db": { "ok": true, "queryTimeMs": 2 },
    "llm": { "ok": true, "latencyMs": 0 }
  },
  "degradedServices": []
}
```

### Auth

| Method | Path | Auth | Rate Limit | Description |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | No | 5/10min | Register with email + password |
| `POST` | `/api/auth/login` | No | 10/min | Login |
| `POST` | `/api/auth/refresh` | No | 30/min | Refresh access token |
| `POST` | `/api/auth/logout` | Yes | 30/min | Revoke refresh token |

### Projects

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/projects` | Yes | List user's projects |
| `POST` | `/api/projects` | Yes | Create project |
| `GET` | `/api/projects/:id` | Yes + RLS | Get project details |
| `DELETE` | `/api/projects/:id` | Yes + RLS | Delete project |

### Generation

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/generate` | Yes + RLS | Start AI generation |
| `GET` | `/api/generate/:jobId/stream` | Yes + RLS | SSE stream of generation progress |

### Editor

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/editor/projects/:id` | Yes + RLS | Get project data + latest version |
| `PATCH` | `/api/editor/projects/:id` | Yes + RLS | Save site version (optimistic locking) |
| `POST` | `/api/editor/projects/:id/sections` | Yes + RLS | Add section |
| `DELETE` | `/api/editor/projects/:id/sections/:sectionId` | Yes + RLS | Delete section |
| `POST` | `/api/editor/projects/:id/sections/reorder` | Yes + RLS | Reorder sections |
| `POST` | `/api/editor/projects/:id/sections/:sectionId/regenerate` | Yes + RLS | Regenerate section via LLM |
| `GET` | `/api/editor/projects/:id/versions` | Yes + RLS | List version history |
| `POST` | `/api/editor/projects/:id/versions/:v/restore` | Yes + RLS | Restore version |

### Renderer

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/renderer/session` | Yes | Get short-lived session token (5min) |
| `GET` | `/api/renderer/:projectId` | Yes + ownership | Get published site JSON |

### Publish

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/publish/:id/deploy` | Yes + RLS | Deploy to CDN |
| `GET` | `/api/publish/:id/stream` | Yes + RLS | SSE stream of deployment status |

### Domains

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/domains/:projectId/verify` | Yes + RLS | Verify custom domain DNS |
| `POST` | `/api/domains/:projectId` | Yes + RLS | Add custom domain |
| `DELETE` | `/api/domains/:projectId/:domain` | Yes + RLS | Remove custom domain |

### Export

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/export/:projectId` | Yes + RLS | Generate ZIP export |

### Monitoring Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | No | System health + dependency graph |
| `GET` | `/api/metrics/system` | Yes | CPU, memory, queue depth |
| `GET` | `/api/metrics/sse` | Yes | SSE connections (current + peak) |
| `GET` | `/api/metrics/redis` | Yes | Redis ping latency + memory |
| `GET` | `/api/metrics/llm` | Yes | LLM costs, token usage, anomaly detection |
| `GET` | `/api/metrics/auth` | Yes | Auth failure rate, brute-force detection |
| `GET` | `/api/metrics/errors` | Yes | Error groups with per-minute trends |
| `GET` | `/api/metrics/alerts` | Yes | Real-time alert evaluation (dedup + cooldown) |
| `GET` | `/api/metrics/incidents` | Yes | Active incidents + 30min timeline |
| `GET` | `/api/metrics/cost-alerts` | Yes | Per-user cost flag thresholds |
| `GET` | `/api/metrics/baselines` | Yes | Rolling EMA baselines per metric |
| `GET` | `/api/admin/dashboard` | Yes | Full production dashboard (all data) |

### Alert Rules

| Signal | WARN | CRITICAL | Escalation |
|---|---|---|---|
| SSE connections | >1,000 | >1,500 | WARN→CRITICAL after 10 min |
| Redis memory | >70% | >85% | WARN→CRITICAL after 10 min |
| Auth failure rate | — | >10% in 5min | Immediate |
| LLM cost spike | >2x baseline | >3x baseline | WARN→CRITICAL after 10 min |

### Root Cause Inference

The dashboard analyzes active alerts and infers likely root causes:
- **SSE spike** → "Traffic surge"
- **Redis latency/latency spike** → "Infrastructure pressure"
- **LLM cost spike** → "AI workload surge"
- **High auth failures** → "Attack or outage"

## Security Model

### Row-Level Security (RLS)

All Prisma operations are wrapped in `withRls()` transactions that enforce PostgreSQL Row-Level Security at the database level:

```typescript
// Every Prisma call follows this pattern:
return withRls(this.prisma, userId, async (tx) =>
  tx.project.findMany({ where: { /* userId injected automatically */ } })
);
```

Two layers prevent bypass:
1. **Runtime** — `withRls()` sets `app.current_user_id` via `SET LOCAL` before every transaction
2. **Build-time** — `prisma-guard.ts` scans all `src/` for raw `prisma.` calls not wrapped in `withRls()`

All PostgreSQL tables have corresponding RLS policies that filter by `current_setting('app.current_user_id')`.

### Authentication

- **JWT RS256** — Asymmetric signing with 2048-bit RSA keys
- **Access tokens**: 15-minute TTL, contains `userId` + `plan`
- **Refresh tokens**: Rotating, stored in Redis, single-use
- **Phase 1 (current)**: Backward-compatible — accepts old and new token formats
- **Phase 2 (future)**: Strict `aud`/`iss` enforcement tracked in GitHub issue

### Rate Limiting

Three independent layers:
1. **Lua sliding-window burst**: 5 requests / 10s (strict, by IP)
2. **@fastify/rate-limit sustained**: 30 requests / min (by IP)
3. **Per-route overrides**: Auth (5/10min), generation (10/h), publish (5/min)
4. **Worker-level**: INCR+EXPIRE for LLM generation and publish (by user ID)

### XSS Prevention

- `sanitizeUrl()` — strict allowlist: only `https:`, `http:`, `mailto:`, and relative paths
- Applied at all 7 URL injection points in HTML builder and renderer

### SSE Security

- **No tokens in iframe URLs** — `src="renderer/?projectId=..."` (no `token=` parameter)
- **postMessage AUTH handshake** — Editor sends auth token via `postMessage`, renderer validates before returning site data
- **Origin validation** — `isValidOrigin()` fails closed (returns `false`) when env var is unset

### LLM Budget Safety

- Atomic Lua scripts enforce per-user monthly cost caps
- Safety buffer at 90% — logs warning
- Soft limit at 110% — blocks further generation
- Fail-closed on Redis errors (returns `BUDGET_CHECK_FAILED`)
- Per-job mutex (`SET NX PX 60000`) prevents concurrent checks for same user

### Log Security

Fastify logger redacts all sensitive fields from logs:
- `req.headers.authorization`
- `req.headers.cookie`
- `body.password`
- `body.passwordHash`

### Future: RBAC

Role-Based Access Control is planned before the first Enterprise contract:
- Organization model with team membership
- Granular permissions per project
- SSO (SAML/OIDC) via WorkOS or Auth0
- Immutable audit log (`audit_events` table) for SOC 2

## CI/CD Pipeline

The pipeline is defined in `.github/workflows/ci-cd.yml` and consists of 4 jobs:

### `ci` — Continuous Integration

Runs on every PR and push to `main`. Fail-fast — any failure stops the pipeline.

```yaml
steps:
  - checkout, setup-node (20)
  - npm ci (cached via lockfile hash)
  - npm run lint (prisma-guard + security-lint)
  - npm run typecheck (tsc --noEmit)
  - npm run test
  - npm audit --audit-level=high  # fails on high+ critical
  - npm run build (tsc)
  - npm run prisma:generate
  - cache node_modules + dist
  - upload artifacts (dist/, prisma/)
```

### `deploy-staging` — Automatic Staging Deploy

Runs on push to `main` after CI passes. Uses environment `staging`.

1. Build Docker image (multi-stage, cached layers via `type=gha`)
2. Push to GHCR with tags `staging-{sha}` and `staging-latest`
3. SSH into staging server — write `.env` via `envs` parameter (secrets never appear in script body)
4. `docker pull` → `docker stop/rm` → `docker run --env-file`
5. Health check: 6 attempts, 10s apart, at `/api/health`

### `deploy-production` — Production Deploy (Manual Approval)

Runs on push to `main` after staging passes. Uses environment `production` with required reviewers.

1. Docker build → push `prod-{sha}` + `prod-latest`
2. SSH backup: `docker tag prod-latest prod-previous`
3. SSH write `.env` via `envs` parameter
4. Run `npx prisma migrate deploy` in a disposable migration container
5. SSH stop old → `docker run --env-file` new container
6. Health check: 12 attempts, 10s apart
7. Verify dependency connectivity (`redis.ok`, `db.ok` via `jq`)
8. Verify alerts endpoint (`/api/metrics/alerts` returns 200)

### `rollback` — Automatic Rollback

Fires if `deploy-production` fails. Triggered by `if: always() && (needs.deploy-production.result == 'failure')`.

1. SSH into production server
2. `docker stop` current container
3. `docker run` image tagged `prod-previous` with same `.env` file
4. Log rollback event via `::error::` annotation

### Docker Build

Multi-stage Dockerfile at `apps/api/Dockerfile`:
- **Stage 1 (deps)**: `npm ci` + `prisma generate` — cached when `package*.json` and `prisma/` are unchanged
- **Stage 2 (build)**: TypeScript compilation to `dist/`
- **Stage 3 (runner)**: Copy only `dist/` + `node_modules` + `prisma/`, run as non-root `appuser`, expose port 3001

```dockerfile
FROM node:20-alpine
RUN apk add --no-cache openssl
# ... multi-stage: deps → build → runner
USER appuser
EXPOSE 3001
CMD ["node", "dist/server.js"]
```

### Rollback Strategy

| Trigger | Action |
|---|---|
| Health check fails (12 retries) | `rollback` job fires |
| Redis/DB connectivity check fails | `rollback` job fires |
| Alerts endpoint unreachable | `rollback` job fires |

Rollback restarts the container with the `prod-previous` Docker tag. This tag is created before each deploy by tagging the running `prod-latest` image. If no previous image exists, the service stays down and logs a manual intervention warning.

## Troubleshooting

### Server Won't Start

```
FATAL: listen EADDRINUSE :::3001
```
→ Port in use. Kill the process: `lsof -ti:3001 | xargs kill -9` or set `PORT=3002`.

### Database Connection Error

```
Error: Can't reach database server
```
→ Verify PostgreSQL is running: `pg_isready`. Check `DATABASE_URL` for correct host, port, and SSL settings: `sslmode=require`.

### Redis Connection Error

```
[ioredis] connect ECONNREFUSED 127.0.0.1:6379
```
→ Start Redis: `redis-server`. Verify `REDIS_HOST` and `REDIS_PORT`.

### Health Check Shows Degraded

```json
{ "status": "degraded", "degradedServices": ["redis"] }
```
→ Run `redis-cli ping`. If PONG, check `REDIS_PASSWORD`. If the service is healthy but Docker/K8s DNS is wrong, check `REDIS_HOST`.

### Prisma Migration Fails

```
Error: P3018: A migration failed to apply
```
→ Check `DATABASE_URL` has write access. Run `npx prisma migrate status` to see pending/applied migrations. Manual fix: `npx prisma migrate resolve --rolled-back "<migration_name>"`.

### Build-Time Guard Blocks Build

```
[prisma-guard] Found raw prisma call without withRls() at src/modules/example.ts:42
```
→ Wrap the call in `withRls(this.prisma, userId, async (tx) => tx.<operation>)`. If the operation truly doesn't need RLS, add a one-line `// rls:skip` comment.

### CI Pipeline Fails on `npm audit`

High-severity vulnerability found. To fix:
1. Check which package: `npm audit`
2. Update: `npm update <package>` or `npm audit fix`
3. If unavoidable (false positive or no patch): add `// npm audit:ignore <package>` comment and update the audit command.

### Docker Build Fails — `openssl` Not Found

```
Error: /lib64/libcrypto.so.3: cannot open shared object file
```
→ The Dockerfile installs `openssl` via `apk add --no-cache openssl` in the `base` stage. If this fails on a non-Alpine image, check the base image.

### Rollback Fired — What Next?

1. Check `docker logs ai-builder-production` on the production server
2. Verify the `prod-previous` tag exists: `docker image ls ghcr.io/{repo}:prod-previous`
3. Investigate the CI log for the specific step that failed
4. Fix the issue, merge to main, and re-deploy

## License

ISC
