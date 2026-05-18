# Launch Smoke Test

> Manual verification checklist. Every step must pass before declaring launch ready.

## Prerequisites

- [ ] API server is running and reachable
- [ ] Frontend is deployed and reachable
- [ ] Database migrations applied
- [ ] Redis is reachable
- [ ] At least one test user (not used in other tests)

---

## Test 1: Register User

**Action**: `POST /api/auth/register`
```json
{ "email": "smoke-test-{timestamp}@example.com", "password": "TestPass123!" }
```

**Expected** (201):
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "...",
  "user": { "id": "uuid", "email": "..." }
}
```

**Verify**:
- [ ] 201 status code
- [ ] `accessToken` is a JWT (3 dot-separated base64 segments)
- [ ] `refreshToken` is present
- [ ] `user.id` is a UUID
- [ ] Token decodes to `{ sub, iss: "ai-builder", aud: "api" }`

---

## Test 2: Login

**Action**: `POST /api/auth/login`
```json
{ "email": "<registered-email>", "password": "TestPass123!" }
```

**Expected** (200):
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "...",
  "user": { "id": "uuid", "email": "..." }
}
```

**Verify**:
- [ ] 200 status code
- [ ] Login with wrong password returns 401
- [ ] Login with non-existent email returns 401

---

## Test 3: Create Project

**Action**: `POST /api/projects` (with Bearer token)
```json
{ "name": "Smoke Test Project" }
```

**Expected** (201):
```json
{
  "id": "uuid",
  "name": "Smoke Test Project",
  "status": "draft",
  "userId": "<user-id>",
  "createdAt": "..."
}
```

**Verify**:
- [ ] 201 status code
- [ ] `status` is `draft`
- [ ] `userId` matches the authenticated user

---

## Test 4: Generate Content

**Action**: `POST /api/generate` (with Bearer token)
```json
{ "projectId": "<project-id>", "prompt": "A landing page for a coffee shop" }
```

**Expected** (201):
```json
{ "jobId": "uuid" }
```

**Poll** until `status` is `done` (via SSE stream at `GET /api/generate/{jobId}/stream`):
- [ ] Job transitions: `pending` → `running` → `done`
- [ ] Returns within 120 seconds
- [ ] Final status has `projectId` and `version`

---

## Test 5: Publish Site

**Action**: `POST /api/publish/projects/{project-id}` (with Bearer token)

**Expected** (201):
```json
{ "deploymentId": "uuid" }
```

**Poll** until `status` is `done` (via SSE stream at `GET /api/publish/projects/{project-id}/stream`):
- [ ] Deployment transitions: `pending` → `building` → `uploading` → `done`
- [ ] Returns within 60 seconds
- [ ] Final event has `cdnUrl`

---

## Test 6: Open Published URL

**Action**: Navigate to the `cdnUrl` returned from publish test

**Expected**:
- [ ] Full HTML page renders
- [ ] All sections visible (hero, features, etc.)
- [ ] CSS applied (colors, fonts, spacing)
- [ ] No script errors in console
- [ ] Page loads in < 3 seconds

---

## Test 7: Refresh Page

**Action**: Reload the published URL

**Expected**:
- [ ] Content unchanged from first load
- [ ] All images/links work
- [ ] No 404s or missing assets

---

## Test 8: Logout + Login Again

**Action**: `POST /api/auth/logout` (with Bearer token)

**Expected** (200):
```json
{ "ok": true }
```

**Action**: `POST /api/auth/login` with same credentials

**Expected** (200):
- [ ] New `accessToken` returned
- [ ] New `refreshToken` returned
- [ ] Old access token still works for its remaining TTL (optional)

---

## Test 9: Unauthorized Access (401/403)

| Action | Expected |
|--------|----------|
| `GET /api/projects` (no token) | 401 |
| `GET /api/projects` (expired token) | 401 |
| `GET /api/projects` (invalid token) | 401 |
| `GET /api/projects/{other-user-project}` | 403 or 404 |
| `POST /api/generate` (no token) | 401 |
| `POST /api/publish/projects/{id}` (no token) | 401 |
| `POST /api/renderer/session` (no token) | 401 |
| `GET /api/renderer/{other-user-project}` | 403 or 404 |

- [ ] All unauthorized actions return 401 or 403
- [ ] Error responses do not leak user data

---

## Summary

| Test | Result |
|------|--------|
| 1. Register | [ ] PASS / [ ] FAIL |
| 2. Login | [ ] PASS / [ ] FAIL |
| 3. Create Project | [ ] PASS / [ ] FAIL |
| 4. Generate Content | [ ] PASS / [ ] FAIL |
| 5. Publish Site | [ ] PASS / [ ] FAIL |
| 6. Open URL | [ ] PASS / [ ] FAIL |
| 7. Refresh Page | [ ] PASS / [ ] FAIL |
| 8. Logout + Login | [ ] PASS / [ ] FAIL |
| 9. Unauthorized Access | [ ] PASS / [ ] FAIL |

**Overall**: [ ] PASS ALL / [ ] FAIL — DO NOT DEPLOY
