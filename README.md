# AI Website Builder

AI-powered website builder with real-time generation, multi-tenant isolation, and production-grade observability.

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
│         │           (AUTH handshake)           │            │
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
│  └───────────────────────────────────────────────────────┘  │
│                             │                                │
│  ┌──────────────────────────┴────────────────────────────┐  │
│  │              Redis (Cache + Pub/Sub + Metrics)         │  │
│  │  SSE Manager │ Rate Limiter │ Metrics │ Alert Engine  │  │
│  └───────────────────────────────────────────────────────┘  │
│                             │                                │
│  ┌──────────────────────────┴────────────────────────────┐  │
│  │     PostgreSQL 16 (Prisma ORM + Row-Level Security)   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

- **Authentication** — JWT RS256 with access/refresh token rotation, bcrypt (salt 12)
- **Multi-tenant Isolation** — PostgreSQL Row-Level Security enforced via `withRls()` transaction wrapper with build-time guards
- **Rate Limiting** — 3-layer: global burst (Lua sliding window), global sustained (`@fastify/rate-limit`), per-route overrides + worker-level INCR+EXPIRE
- **LLM Generation Pipeline** — OpenAI/Anthropic with budget limits, cost estimation, 60s hard timeout, per-user cost caps
- **SSE Real-Time System** — Shared Redis subscriber pattern (1 connection per process) with polling fallback
- **Deployment** — Cloudflare R2 (CDN), Cloudflare DNS, atomic version locking
- **Monitoring & Observability** — Real-time alert engine, adaptive baselines (EMA), error grouping with trend analysis, incident dashboard
- **Export** — Full site export as ZIP archive

## Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js 20, TypeScript 5 |
| **API Framework** | Fastify 5 |
| **Database** | PostgreSQL 16, Prisma ORM 6 |
| **Cache / Pub/Sub** | Redis 7 (ioredis) |
| **Job Queue** | BullMQ 5 |
| **Auth** | JWT RS256, bcrypt |
| **LLM** | OpenAI SDK, Anthropic SDK |
| **CDN** | Cloudflare R2 (S3-compatible) |
| **DNS** | Cloudflare API |
| **Frontend (Web)** | React 18, Vite, TanStack Query, Zustand, Tailwind CSS |
| **Frontend (Renderer)** | React 18, standalone Vite app, postMessage bridge |

## How to Run Locally

### Prerequisites

- Node.js 20+
- PostgreSQL 16
- Redis 7
- OpenSSL (for JWT key generation)

### Setup

```bash
# 1. Install dependencies
cd apps/api && npm install
cd apps/web && npm install
cd apps/renderer && npm install

# 2. Generate JWT key pair
openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:2048
openssl pkey -in private.pem -pubout -out public.pem

# 3. Configure environment
cp apps/api/.env.example apps/api/.env
# Edit .env with your keys and credentials

# 4. Set up database
cd apps/api
npx prisma migrate dev

# 5. Run development servers
# Terminal 1 — API
cd apps/api && npm run dev

# Terminal 2 — Web frontend
cd apps/web && npm run dev

# Terminal 3 — Renderer
cd apps/renderer && npm run dev
```

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `PORT` | API server port | `3001` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `JWT_PRIVATE_KEY` | RSA private key (\\n for newlines) | `-----BEGIN PRIVATE KEY-----\n...` |
| `JWT_PUBLIC_KEY` | RSA public key (\\n for newlines) | `-----BEGIN PUBLIC KEY-----\n...` |
| `LLM_PROVIDER` | LLM backend (`openai` or `anthropic`) | `openai` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `ANTHROPIC_API_KEY` | Anthropic API key | `sk-ant-...` |
| `R2_ENDPOINT` | Cloudflare R2 endpoint | `https://<account>.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY` | R2 access key ID | — |
| `R2_SECRET_KEY` | R2 secret access key | — |
| `CF_API_TOKEN` | Cloudflare API token | — |
| `REGION` | Worker region tag | `us-east-1` |

See `apps/api/.env.example` for the complete list.

## Deployment

### Production Build

```bash
cd apps/api
npm run build       # TypeScript compilation
npm run prebuild    # Build-time security + Prisma guards
npm start           # Start production server
```

### CI/CD Flow

1. Run `npm run security-lint` — blocks wildcard origins, URL tokens, unsafe URL construction
2. Run `npm run prisma-guard` — blocks raw Prisma usage outside `withRls()`
3. Run TypeScript compilation
4. Run Prisma migrations
5. Deploy to target environment

## API Overview

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register (rate: 5/10min) |
| `POST` | `/api/auth/login` | Login (rate: 10/min) |
| `POST` | `/api/auth/refresh` | Refresh token (rate: 30/min) |
| `POST` | `/api/auth/logout` | Logout (auth required) |

### Generation

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/generate` | Start AI generation (auth + RLS) |
| `GET` | `/api/generate/:jobId/stream` | SSE stream generation status |

### Editor

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/editor/projects/:id` | Get project data (auth + RLS) |
| `POST` | `/api/editor/projects/:id/save` | Save changes (auth + RLS) |
| `GET` | `/api/editor/projects/:id/versions` | List versions |
| `POST` | `/api/editor/projects/:id/versions` | Create version snapshot |

### Renderer

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/renderer/session` | Get session token (auth) |
| `GET` | `/api/renderer/:projectId` | Get site JSON (auth + ownership) |
| `POST` | `/api/renderer/:projectId/snapshot` | Generate snapshot (auth + RLS) |

### Publish

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/publish/:id/deploy` | Deploy to CDN (auth + RLS) |
| `GET` | `/api/publish/:id/stream` | SSE stream deployment status |

### System & Monitoring

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | System health (no auth) |
| `GET` | `/api/metrics/system` | System metrics (auth) |
| `GET` | `/api/metrics/sse` | SSE connection metrics |
| `GET` | `/api/metrics/redis` | Redis health metrics |
| `GET` | `/api/metrics/llm` | LLM cost + anomaly detection |
| `GET` | `/api/metrics/auth` | Auth failure rates + brute-force |
| `GET` | `/api/metrics/errors` | Error groups with trends |
| `GET` | `/api/metrics/alerts` | Real-time alert evaluation |
| `GET` | `/api/metrics/incidents` | Active incidents + timeline |
| `GET` | `/api/metrics/cost-alerts` | Cost threshold alerts |
| `GET` | `/api/admin/dashboard` | Full production dashboard |

## Monitoring

### Health Check

`GET /api/health` returns dependency status:

```json
{
  "status": "ok",
  "dependencies": {
    "redis": { "ok": true, "latencyMs": 2 },
    "db": { "ok": true, "queryTimeMs": 5 },
    "llm": { "ok": true, "latencyMs": 0 }
  },
  "degradedServices": []
}
```

### Alert Rules

| Signal | WARN | CRITICAL | After |
|---|---|---|---|
| SSE connections | >1,000 | >1,500 | 10 min |
| Redis memory | >70% | >85% | 10 min |
| Auth failure rate | — | >10% / 5min | Immediate |
| LLM cost spike | >2x baseline | >3x baseline | 10 min |

### Root Cause Inference

The dashboard automatically infers root causes:
- **SSE spike** → "Traffic surge"
- **Redis latency spike** → "Infrastructure pressure"
- **LLM cost spike** → "AI workload surge"
- **Auth failures** → "Attack or outage"

## Security Highlights

- **RLS Isolation** — Every Prisma operation wrapped in `withRls()` transaction. Build-time guards (`prisma-guard.ts`, `security-lint.mjs`) prevent regressions.
- **JWT RS256** — Asymmetric signing. Access tokens (15min TTL) + rotating refresh tokens stored in Redis. Phase 1 backward-compatible; Phase 2 adds `aud`/`iss` enforcement.
- **Rate Limiting** — 3 layers: global burst (5/10s), sustained (30/min), per-route overrides. Worker-level INCR+EXPIRE for generation/publish.
- **XSS Prevention** — `sanitizeUrl()` strict allowlist (https/http/mailto/relative-only) applied at all URL injection points.
- **SSE Security** — No tokens in iframe URLs. PostMessage AUTH handshake with origin validation. `isValidOrigin()` fails closed when unconfigured.
- **LLM Budget** — Atomic Lua-enforced monthly caps. Safety buffer at 90%. Fail-closed on Redis errors.
- **Log Redaction** — Fastify logger redacts `authorization`, `cookie`, and password fields.

## Project Structure

```
├── apps/
│   ├── api/           Fastify API server (monorepo entry)
│   ├── web/           React dashboard + editor frontend
│   └── renderer/      Standalone React renderer (iframe)
├── docs/
│   └── launch/        Deployment documentation
├── scripts/
│   ├── prisma-guard.ts    Build-time Prisma usage guard
│   └── security-lint.mjs  Build-time security lint
└── package.json       Root workspace config
```

## License

ISC
