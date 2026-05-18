-- Migration: 02_add_indexes
-- Description: Add production query-performance indexes for multi-tenant filtering,
--              job polling (SSE), project listing, and status tracking.
--
-- All index names match the @@index(name:) declarations in schema.prisma.
-- These are CREATE INDEX CONCURRENTLY-safe for zero-downtime deploys (run outside a transaction).

-- ── User ────────────────────────────────────────────────────────────────────
-- idx_user_plan: filtered by generation.worker.ts (user.plan) and admin dashboards.
--   Query: SELECT * FROM "User" WHERE plan = 'free';
--   Type: B-tree on low-cardinality column — useful when combined with other
--         filters or for segment counts. Not highly selective alone but avoids
--         sequential scan when plan-filtering is combined with ORDER BY.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_user_plan" ON "User" ("plan");

-- ── Project ─────────────────────────────────────────────────────────────────
-- idx_project_userId: every multi-tenant project query is scoped to a user.
--   Query: SELECT * FROM "Project" WHERE "userId" = '...';
--   Without this: sequential scan on every project listing.
--   Type: High-selectivity B-tree (each user has few projects vs total).
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_project_userId" ON "Project" ("userId");

-- idx_project_status: dashboard filtering by draft/live/deleted/suspended.
--   Query: SELECT count(*) FROM "Project" WHERE status = 'live';
--   Combined with userId composite below for the common case.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_project_status" ON "Project" ("status");

-- idx_project_createdAt: default sort order on /projects listing page.
--   Query: SELECT ... FROM "Project" WHERE "userId" = '...' ORDER BY "createdAt" DESC;
--   The B-tree on created_at enables index-only backward scan for the ORDER BY.
--   Type: Sort-aiding index. Without this, PostgreSQL sorts in memory or uses
--         a sequential scan + sort with limited work_mem, causing temp files on disk.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_project_createdAt" ON "Project" ("createdAt");

-- idx_project_userId_status: composite — the most common query pattern.
--   Query: SELECT ... FROM "Project" WHERE "userId" = '...' AND status != 'deleted' ORDER BY "createdAt" DESC;
--   This is a covering index for the WHERE clause. The B-tree on (userId, status)
--   narrows the search to the user's segment, then filters by status in the index
--   itself (index-only filter), without touching the heap for those two columns.
--   Order of columns matters: high-selectivity (userId) first, low-selectivity (status) second.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_project_userId_status" ON "Project" ("userId", "status");

-- ── GenerationJob ───────────────────────────────────────────────────────────
-- idx_genjob_userId: admin/user queries listing generation history.
--   Query: SELECT ... FROM "GenerationJob" WHERE "userId" = '...' ORDER BY "createdAt" DESC;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_genjob_userId" ON "GenerationJob" ("userId");

-- idx_genjob_projectId: finding all AI generation attempts for a project.
--   Query: SELECT ... FROM "GenerationJob" WHERE "projectId" = '...';
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_genjob_projectId" ON "GenerationJob" ("projectId");

-- idx_genjob_status: worker polling — "find pending jobs" across all projects.
--   Query (BullMQ fallback): SELECT ... FROM "GenerationJob" WHERE status = 'pending';
--   Low-cardinality index, but prevents sequential scan across the entire table
--   for the initial job fetch.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_genjob_status" ON "GenerationJob" ("status");

-- idx_genjob_createdAt: sorting generation history (default DESC).
--   Query: ORDER BY "createdAt" DESC LIMIT 50;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_genjob_createdAt" ON "GenerationJob" ("createdAt");

-- idx_genjob_projectId_status: composite — worker's idempotency check.
--   Query (generation.worker.ts):
--     UPDATE "GenerationJob" SET status = 'running' WHERE id = '...' AND status = 'pending';
--   and:
--     SELECT ... FROM "GenerationJob" WHERE "projectId" = '...' AND status = 'running';
--   The (projectId, status) index covers both the idempotency guard's WHERE clause
--   and the project-scoped status lookup for retry logic.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_genjob_projectId_status" ON "GenerationJob" ("projectId", "status");

-- ── SiteVersion ─────────────────────────────────────────────────────────────
-- (No additional index needed beyond the existing @@unique([projectId, version]).
--  The B-tree on (projectId, version) handles projectId-only lookups via leftmost
--  prefix rule, and version-based reverse scans for "latest version" queries.)

-- ── PublishDeployment ───────────────────────────────────────────────────────
-- idx_publish_projectId: finding all deployments for a project.
--   Query: SELECT ... FROM "PublishDeployment" WHERE "projectId" = '...';
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_publish_projectId" ON "PublishDeployment" ("projectId");

-- idx_publish_status: SSE streaming and dashboard filtering.
--   Query: SELECT ... FROM "PublishDeployment" WHERE status = 'pending';
--   Used by publish.worker.ts to detect stalled deployments.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_publish_status" ON "PublishDeployment" ("status");

-- ── Domain ──────────────────────────────────────────────────────────────────
-- idx_domain_projectId: finding all custom domains assigned to a project.
--   Query: SELECT ... FROM "Domain" WHERE "projectId" = '...';
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_domain_projectId" ON "Domain" ("projectId");

-- idx_domain_verified: filtering verified vs pending/expired domains.
--   Query: SELECT ... FROM "Domain" WHERE verified = true;
--   Combined with projectId for: WHERE "projectId" = '...' AND verified = true;
--   If that query is common, consider a composite idx_domain_projectId_verified.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_domain_verified" ON "Domain" ("verified");
