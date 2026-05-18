# Environment Setup Verification

> Checklist for production launch. Every item must be confirmed before deploying.

## Required Environment Variables

### Secrets (mark as SECRET in vault)
| Variable | Dev | Staging | Prod | Secret? |
|----------|-----|---------|------|---------|
| `JWT_PRIVATE_KEY` | test-key-dev | test-key-staging | **PROD KEY** | ✅ YES |
| `JWT_PUBLIC_KEY` | test-pub-dev | test-pub-staging | **PROD KEY** | ✅ YES |
| `DATABASE_URL` | localhost | staging-db | **prod-db.internal** | ✅ YES |
| `REDIS_PASSWORD` | (empty) | set | set | ✅ YES |
| `OPENAI_API_KEY` | dev-key | staging-key | **PROD KEY** | ✅ YES |
| `ANTHROPIC_API_KEY` | dev-key | staging-key | **PROD KEY** | ✅ YES |
| `R2_ACCESS_KEY` | dev-key | staging-key | **PROD KEY** | ✅ YES |
| `R2_SECRET_KEY` | dev-key | staging-key | **PROD KEY** | ✅ YES |
| `CF_API_TOKEN` | dev-token | staging-token | **PROD TOKEN** | ✅ YES |
| `DOMAIN_VERIFICATION_SECRET` | dev-secret | staging-secret | **PROD SECRET** | ✅ YES |

### Per-Environment Configuration
| Variable | Dev | Staging | Prod | Notes |
|----------|-----|---------|------|-------|
| `PORT` | 3001 | 3001 | 3001 | Same across envs |
| `NODE_ENV` | development | staging | **production** | ✅ VERIFY prod |
| `LOG_LEVEL` | debug | info | warn | Adjust as needed |
| `REGION` | dev | staging | us-east-1 | Per-region isolation |
| `FRONTEND_URL` | http://localhost:5173 | https://staging.example.com | **https://app.example.com** | ✅ LOCKED — no wildcard |
| `RENDERER_ORIGIN` | http://localhost:5173 | https://staging.example.com | **https://app.example.com** | ✅ LOCKED — must match origin |
| `R2_ENDPOINT` | http://localhost:9000 | https://staging.r2.dev | **https://prod.r2.cloud** | |
| `R2_BUCKET` | ai-builder-dev | ai-builder-staging | ai-builder-prod | |
| `R2_PUBLIC_URL` | http://localhost:9000/dev | https://cdn-staging.example.com | **https://cdn.example.com** | |
| `CF_ZONE_ID` | (empty) | staging-zone | **prod-zone** | |
| `CDN_CNAME_TARGET` | (empty) | staging-cdn | **prod-cdn** | |
| `MAX_QUEUE_DEPTH_GENERATE` | 50 | 50 | 50 | |
| `MAX_QUEUE_DEPTH_PUBLISH` | 20 | 20 | 20 | |
| `RL_GLOBAL_MAX_PER_MIN` | 30 | 30 | 30 | |
| `RL_GLOBAL_BURST_MAX` | 5 | 5 | 5 | |
| `RL_GLOBAL_BURST_WINDOW_SEC` | 10 | 10 | 10 | |

## Security Verification

- [ ] **No wildcard CORS** — `FRONTEND_URL` must be an explicit origin, never `*`
- [ ] **Renderer origin is locked** — `RENDERER_ORIGIN` matches `FRONTEND_URL`
- [ ] **Tokens never appear in URLs** — Verify renderer iframe src: `src={`${RENDERER_BASE}/?projectId=${projectId}`}` has NO `token=` parameter
- [ ] **`NODE_ENV=production`** in production — confirms prod-only behavior
- [ ] **JWT keys rotated** — separate keypair per environment
- [ ] **Database password** — minimum 32 chars, generated, stored in vault
- [ ] **Redis password** — set and strong (unless using ElastiCache IAM auth)

## Deployment Verification

- [ ] Prisma migrations applied (`prisma migrate deploy`)
- [ ] Workers start and heartbeats visible
- [ ] Health endpoint returns 200
- [ ] Rate limiting active (exceeding limit returns 429)
- [ ] Logging redacts secrets (already configured in app.ts)
- [ ] CORS allows only the frontend origin
- [ ] SSE timeout configured (10min)

## Checklist

```
[ ] All secrets loaded from vault (not .env files)
[ ] No .env files on disk
[ ] DATABASE_URL uses SSL (sslmode=require)
[ ] Redis password set and verified
[ ] NODE_ENV=production
[ ] FRONTEND_URL is an explicit origin
[ ] RENDERER_ORIGIN matches FRONTEND_URL
[ ] JWT keys are per-environment
[ ] CORS origins locked to explicit list
[ ] Rate limit config reviewed
[ ] Workers configured with correct concurrency
```
