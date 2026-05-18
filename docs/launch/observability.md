# Minimum Observability Check

> How to detect and diagnose failures during launch. No new tools — only existing mechanisms.

## LLM Failures

### Where failures are logged
- **Worker stdout**: Generation worker logs LLM failures via `job.log()`:
  ```
  Generation job failed: {"requestId":"...","jobId":"...","error":"LLM_TIMEOUT: ..."}
  ```
- **Redis job status**: Each job writes status to `job:status:{jobId}` (24h TTL):
  ```
  {"status":"failed","progress":100,"message":"LLM_TIMEOUT: OpenAI call exceeded 60s","error":"..."}
  ```
- **DLQ**: Failed jobs are moved to dead letter queue:
  - Queue: `generate:{region}:dlq`
  - Contains: original job data, error stack, retry count, timestamp

### How to detect LLM provider down
1. Check worker logs for sudden spike of `LLM_TIMEOUT` or `LLM_FAILED` errors
2. Check Job status dashboard: spike in `status=failed`
3. Check DLQ depth: rapid growth indicates persistent LLM failure
4. Run Redis scan:
   ```
   redis-cli KEYS 'job:status:*' | xargs redis-cli MGET | grep failed | wc -l
   ```

### How to detect LLM timeout vs auth vs rate-limit
| Error pattern | Cause | Action |
|---------------|-------|--------|
| `LLM_TIMEOUT:` | Provider response > 60s | Check provider status page |
| `401` in LLM response | API key invalid | Rotate key |
| `429` in LLM response | Provider rate-limited | Throttle; reduce concurrency |
| `LLM_FAILED:` | Generic LLM error | Inspect job logs + DLQ |
| `VALIDATION_FAILED:` | LLM returned non-JSON | Model issue — may self-resolve |
| `BUDGET_CHECK_FAILED:` | Redis down for budget check | Check Redis health |

## DLQ Inspection

### Queue Names
- Generate DLQ: `generate:{region}:dlq`
- Publish DLQ: `publish:{region}:dlq`

### Inspect DLQ contents
```bash
# BullMQ does not expose DLQ via CLI directly; use code:
#   const dlq = new Queue('generate:us-east-1:dlq', { connection });
#   const jobs = await dlq.getJobs();
#   jobs.forEach(j => console.log(j.data.error.message));
```

### DLQ entry format
```json
{
  "originalJobId": "uuid",
  "originalQueue": "generate:us-east-1",
  "jobData": { ... },
  "error": { "message": "...", "stack": "...", "failedReason": "...", "stacktrace": [] },
  "retryCount": 3,
  "timestamp": "2026-05-17T...",
  "requestId": "uuid"
}
```

### Monitor DLQ growth
- Health check: `checkDLQHealth(redis)` returns `{ total, retryable, permanent, healthy }`
- Alert when `total > 50` or `healthy === false`

## Redis Down Detection

### Symptoms
- Rate limiting fails open (burst guard + helper use try/catch)
- Budget checks fail closed: `BUDGET_CHECK_FAILED: Unable to verify budget`
- Job status events not published
- SSE subscribers disconnect

### How to verify
```bash
redis-cli -h <host> -p <port> PING
# Expected: PONG
```

### Fallback behavior
| Component | On Redis failure | Impact |
|-----------|-----------------|--------|
| Rate limiting (burst) | Falls open — requests pass | No rate limit until Redis recovers |
| Rate limiting (worker) | Falls closed via try/catch | 429 — some users blocked unnecessarily |
| Budget check | Falls closed | ALL denied until Redis recovers |
| Job status pub/sub | Falls back to polling (500ms) | Slower status updates, still works |
| SSE (publish) | Falls back to polling | Slower, still works |
| Refresh token rotation | Falls closed | Refresh fails, user must re-login |

## LLM Provider Timeout Detection

### Monitor these patterns in logs
```
"error":"LLM_TIMEOUT: Anthropic call exceeded 60s"
"error":"LLM_TIMEOUT: OpenAI call exceeded 60s"
```

### Frequency threshold
- 0-1 per minute: normal (transient network)
- 5+ per minute: provider issue — escalate to provider status page
- 20+ per minute: provider down — consider failover to alternate provider

## Queue Backlog Detection

### Key metrics (from system endpoint)
- `GET /api/metrics/system` returns `queueDepth` per queue
- Normal: `generate` depth < 10, `publish` depth < 5
- Warning: depth > `MAX_QUEUE_DEPTH_GENERATE / 2` (25)
- Critical: depth >= `MAX_QUEUE_DEPTH_GENERATE` (50) — new jobs return 429

### How to check manually
```bash
# Via BullMQ (example psuedocode):
# const queue = new Queue('generate:us-east-1', { connection });
# const [active, waiting, delayed] = await Promise.all([
#   queue.getActiveCount(),
#   queue.getWaitingCount(),
#   queue.getDelayedCount(),
# ]);
```

## Quick-Reference: Failure Detection Matrix

| Scenario | Log pattern | Redis indicator | User-visible |
|----------|-------------|-----------------|--------------|
| Redis down | redis:error | PING fails | Budget checks fail; rate limiting bypassed |
| LLM timeout | LLM_TIMEOUT | failed job counter increments | Generation fails with timeout error |
| LLM rate-limit | LLM_FAILED: 429 | DLQ fills | Generation fails with rate-limit error |
| Queue overload | N/A | depth >= maxDepth | Users see 429 QUEUE_OVERLOADED |
| Postgres down | prisma error | N/A | All API calls fail |
| Worker crash | heartbeat missing | worker:heartbeat:* stale >30s | Jobs stuck in pending |
| Budget exhausted | LLM_BUDGET_EXCEEDED | budget:cost:* >= limit | Generation blocked with upgrade prompt |
