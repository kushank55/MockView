# Engineering decisions

MockView is a Next.js App Router modular monolith: UI → Route Handlers → Prisma / Gemini. These five changes stay inside that shape. They were chosen because they fix real production risks (unbounded reads, Gemini cost, IDOR, leaky errors), not because they add résumé keywords.

---

# 1. Database indexing, query shaping, and pagination

## Problem
Interview history and the dashboard loaded a user's interviews with large JSON columns (`transcript`, full `feedback`) even when the UI only needed list metadata. Resume lists also returned `resumeText`. There was no page size cap, so a heavy user would pull every row on every History visit.

## Solution
- Kept the existing `Interview` indexes (`userId`, `userId+type`, `userId+createdAt`) because they match `WHERE userId … ORDER BY createdAt DESC` and type filters.
- Added `Account.userId`, `Session.userId`, and `ResumeAnalysis(userId, createdAt)` indexes to match NextAuth and resume-latest/list queries.
- History `GET /api/interviews` now selects list fields only, paginates with `page`/`limit` (default 20, max 50), and computes analytics from at most 200 recent rows — and only on page 1.
- Dashboard uses `aggregate` + `take` + `select` instead of loading full interview rows.
- Resume list omits `resumeText` and is paginated the same way.

## Why?
Page/limit pagination matches the existing History UI (filters + Load more) without inventing cursor tokens the client did not already have. Composite `(userId, createdAt)` is the index Postgres can use for the real `WHERE` + `ORDER BY` pattern.

## Trade-offs
Analytics are sampled from the latest 200 interviews, not the full lifetime. Later history pages skip the analytics queries, so charts do not refresh on "Load more". Offset pagination gets slower at very high page numbers.

## Alternatives
Cursor pagination (`createdAt, id`) would be more stable under concurrent inserts. A materialized stats table would avoid the 200-row sample. Both add complexity this MVP does not need yet.

## Impact
History and dashboard payloads no longer grow with transcript size. The API cannot return an unlimited collection.

## How to verify
Open `/history` with more than 20 interviews and confirm "Load more". Inspect network: list responses should not include `transcript`. `EXPLAIN` the list query in Prisma Studio / `psql` after `prisma db push`.

Not benchmarked yet.

---

# 2. Redis cache-aside (with memory fallback)

## Problem
`GET /api/dashboard` always ran six Prisma queries (aggregates, recent interviews, feedback sample, goals, streak, resumes) on every dashboard visit. AI endpoints also needed a shared counter store for rate limits.

## Solution
Cache-aside for the **computed dashboard payload** only:

```
Request → cacheGet(dashboard:v1:{userId})
  hit  → return
  miss → Prisma → cacheSet TTL 45s → return
```

Invalidate on interview create/delete, resume save/analyze, and goal create/delete.

If `REDIS_URL` is missing or Redis errors, an in-process `Map` with TTL is used so interviews still work. Rate-limit counters use the same store (`cacheIncr`).

## Why?
The dashboard is read often and changes only after a small set of writes. 45 seconds is short enough that a finished interview shows up quickly, and long enough to collapse refresh storms. User-specific keys prevent cross-user leaks.

## Trade-offs
Without Redis, the memory map is per Node process (and per serverless isolate). Stale dashboard data can last up to 45 seconds after a write if invalidation fails. We do **not** cache interview transcripts, scores of in-progress sessions, or Gemini answers.

## Alternatives
Caching every `GET /api/interviews` would need cache keys per filter/page and more invalidation surface. HTTP `Cache-Control` private caching cannot share rate-limit state across instances.

## Impact
Repeat dashboard loads can skip Postgres when Redis (or the process map) still has a fresh entry. Rate limits can be shared across instances when Redis is configured.

## How to verify
Hit `/api/dashboard` twice within 45s: the second JSON includes `"cached": true` on a hit. Complete an interview and confirm the next dashboard fetch is `"cached": false` (invalidation) or wait for TTL.

Not benchmarked yet.

---

# 3. Rate limiting for AI endpoints

## Problem
Every live turn, evaluation, suggestion, STAR rewrite, and resume analysis calls Gemini. Duplicate clicks or a scripted client could burn quota and cost without a 429.

## Solution
Configurable fixed-window counters (env, with defaults):

- `AI_RATE_LIMIT_PER_MINUTE` (default 20) per user
- `AI_RATE_LIMIT_PER_HOUR` (default 80) per user
- `AI_RATE_LIMIT_IP_PER_MINUTE` (default 40) per IP

Applied to: `POST /api/interview/generate`, `evaluate`, `suggest`, `POST /api/interviews/[id]/star`, `POST /api/resume/analyze`.

429 body:

```json
{
  "success": false,
  "error": { "code": "RATE_LIMIT_EXCEEDED", "message": "Too many AI requests. Please try again later." }
}
```

plus `Retry-After`.

Generate also takes a 25s SET NX lock per user so two overlapping turns cannot start two Gemini calls.

## Why?
User limits stop one account from exhausting the key. IP limits catch bursts that share a NAT more loosely. Limits are env-based so production can tighten them without a deploy of magic numbers.

## Trade-offs
Fixed windows allow a burst at window boundaries. In-memory fallback is not cluster-accurate. Fail-open on store errors prefers availability over hard blocking (a Redis outage should not take down interviews). The generate lock is per user, not per interview session.

## Alternatives
Token bucket / sliding window in a dedicated limiter library. Stricter fail-closed (reject if Redis is down) would protect cost better and hurt availability.

## Impact
Abuse and accidental double-submits are bounded. Gemini spend has an application-level ceiling in addition to Google's own quotas.

## How to verify
Set `AI_RATE_LIMIT_PER_MINUTE=1`, send two generate requests, expect HTTP 429 and `RATE_LIMIT_EXCEEDED`. Restore the default afterwards.

Not benchmarked yet.

---

# 4. Gemini prompt size, retries, and (no) streaming

## Problem
Generate sent the full chat plus a large resume on every turn. Failures surfaced raw SDK messages. There was no shared timeout/retry policy. An earlier `streamText` integration hung under this App Router + AI SDK setup.

## Solution
- Shared `generateGeminiText`: 20s timeout, Lite then Flash, up to 3 attempts with backoff **only** for transient errors (5xx, timeout, quota). Permanent API-key errors are not retried.
- Trim live chat to the last 10 user/assistant messages; cap resume excerpt at 4,000 characters; cap evaluation transcript at 40 messages; STAR answers at 4,000 characters.
- Concise system prompts (same interview behavior, fewer repeated instructions).
- **Streaming was not shipped.** The UI already speaks sentence-by-sentence after a complete turn. JSON endpoints (evaluate / suggest / STAR) cannot paint a partial object. A previous stream hung.

Model choice: `gemini-3.5-flash-lite` first for turn latency and free-tier headroom; `gemini-3.6-flash` if Lite is empty or errors. 2.x Flash IDs 404 on newer keys.

## Why?
LLM calls dominate latency and cost. Cutting duplicate history and resume text reduces tokens without dropping the latest conversational context. Timeouts stop a hung generate from holding a serverless function until `maxDuration`.

## Trade-offs
Older turns fall out of the 10-message window. Resume personalization uses an excerpt, not the full PDF. No token-accurate streaming UX.

## Alternatives
Re-introduce streaming behind a feature flag after proving `streamText` does not hang. A smaller dedicated "interviewer" model if Google exposes one with a stable ID.

## Impact
Each turn should send less prompt text. Transient Gemini blips retry once or twice instead of failing the interview immediately. Users still wait for a full turn before TTS starts — by design.

## How to verify
Complete a long interview and inspect the generate request: server logs should show trimmed history. Kill the API key and confirm no retry storm (permanent error). Toggle airplane mode mid-turn and confirm a graceful interviewer error, not a stack trace.

Not benchmarked yet.

---

# 5. Authorization (ownership) and centralized errors

## Problem
Some routes authenticated the session but loaded or mutated by id alone (STAR rewrite). Existence of another user's interview could leak via 403 vs 404. Error bodies sometimes returned `error.message` from Prisma or Gemini.

## Solution
- Session helper `getSessionUser()`.
- Resource access uses `findFirst` / `deleteMany` with `{ id, userId }`. Missing rows are **404**, not 403, so attackers cannot distinguish "exists but not yours".
- Goals already deleted by `{ id, userId }`; same pattern kept.
- `jsonError(status, code, message)` returns `{ success: false, error: { code, message } }` without stack traces. Servers still `console.error` the real error.
- Clients read messages through `apiErrorMessage()` so nested `error` objects do not render as `[object Object]`.

## Why?
Authentication answers "who is logged in?". Authorization answers "may this user touch this row?". A consistent error envelope lets the UI handle 429/503/404 without scraping strings.

## Trade-offs
A 404 for both missing and foreign ids is slightly worse UX for a user who mistypes their own URL, and better security. Top-level `code`/`message` duplicates the nested object for older clients.

## Alternatives
A full ACL/RBAC layer. Middleware that wraps every route. Overkill for a single-tenant-user resource model.

## Impact
Another user's interview id should not return their transcript. Production clients should not see database or SDK internals.

## How to verify
While logged in as user A, `GET /api/interviews/{B's id}` → 404. Trigger a Gemini failure and confirm the JSON has `error.code` / `error.message` only.

Not benchmarked yet.
