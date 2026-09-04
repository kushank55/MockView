# Performance notes

No latency numbers in this file are measured. Treat every claim as a design note until you time it in your environment.

**Not benchmarked yet.**

---

## Database

### Indexes (Prisma schema → `prisma db push`)

| Model | Index | Justified by |
| --- | --- | --- |
| Interview | `(userId)` | Ownership filters |
| Interview | `(userId, type)` | History type filter |
| Interview | `(userId, createdAt)` | History/dashboard `ORDER BY createdAt DESC` |
| ResumeAnalysis | `(userId)` | List / latest |
| ResumeAnalysis | `(userId, createdAt)` | Latest resume + list order |
| Account | `(userId)` | NextAuth account lookup |
| Session | `(userId)` | NextAuth session lookup |
| Goal | `(userId)` | Dashboard / goals list (already present) |

This repo historically applies schema with `prisma db push` rather than checked-in SQL migrations. After pulling these schema changes, run `npx prisma db push` against the database you actually use.

### Query shape

- History list: `select` id, type, topic, score, duration, questions, createdAt — **not** `transcript`.
- Dashboard: `aggregate` for counts/averages; recent interviews `take: 7`; feedback sample `take: 50` selecting only `feedback`; resumes `take: 5` without `resumeText`.
- Resume list: no `resumeText` (full text only on `/api/resume/latest` for interview personalization).
- Register duplicate check: `select: { id: true }` only.

### Pagination

| Endpoint | Default | Max | Metadata |
| --- | --- | --- | --- |
| `GET /api/interviews` | page=1, limit=20 | 50 | `page`, `limit`, `total`, `totalPages`, `hasMore` |
| `GET /api/resume` | same | 50 | same |

History page 1 also loads up to 200 rows for charts (score/type/feedback/createdAt only). Pages 2+ skip that analytics query.

Offset pagination: `skip = (page - 1) * limit`. Very deep pages will cost more; the UI is Load more from the start, not jumping to page 500.

### Suggested measurements (not collected)

- `GET /api/interviews?limit=20` database time
- `GET /api/dashboard` database time, cache hit vs miss
- Payload size of history before/after dropping `transcript`

---

## Cache

| Key | Value | TTL | Invalidation |
| --- | --- | --- | --- |
| `dashboard:v1:{userId}` | Dashboard JSON (stats, activity, goals, …) | 45s | Interview create/delete, resume create/analyze, goal create/delete |
| `rl:ai:m:{userId}` | Counter | 60s | Expires |
| `rl:ai:h:{userId}` | Counter | 3600s | Expires |
| `rl:ai:ip:{ip}` | Counter | 60s | Expires |
| `lock:ai:generate:{userId}` | `"1"` (SET NX) | 25s | Deleted when the generate request finishes |

Store: Redis when `REDIS_URL` is set and reachable; otherwise an in-process Map. Redis errors are logged; reads fail open (cache miss / memory fallback).

Dashboard responses include `cached: true|false` so you can see hits in the Network tab. That flag is not stored inside the cached payload.

**Not benchmarked yet** (hit rate, Redis RTT).

---

## Rate limiting

Gemini routes increment counters **after** auth and (for generate) **after** body validation.

Defaults if env vars are unset: 20/min/user, 80/hour/user, 40/min/IP.

429 includes `Retry-After` and `error.code = RATE_LIMIT_EXCEEDED`.

In-memory counters do not sync across Vercel isolates. Use Redis in production if you need a global ceiling.

**Not benchmarked yet.**

---

## Gemini

| Setting | Value | Reason |
| --- | --- | --- |
| Primary model | `gemini-3.5-flash-lite` | Lower latency, higher free-tier headroom for live turns |
| Fallback | `gemini-3.6-flash` | Quality/availability if Lite fails or returns empty |
| Timeout | 20s (`AbortSignal.timeout`) | Bound serverless wait |
| Retries | 3 attempts, 400ms → 800ms backoff | Transient 5xx / timeout only. Quota skips to the fallback model instead of hammering the same one. |
| Chat window | last 10 messages | Drop old turns, keep recent context |
| Resume excerpt | 4,000 chars on generate | Personalize without pasting the whole PDF |
| Eval transcript | last 40 messages | Cap JSON eval prompt |
| STAR answer | 4,000 chars | Cap rewrite prompt |

Streaming: **not implemented**. Previous `streamText` hung; evaluate/suggest/STAR need a complete JSON object; the interview UI TTS already chunks sentences after a full turn.

**Not benchmarked yet** (Gemini latency, token counts, total API latency).

---

## Timeouts elsewhere

- Interview generate client abort: 25s (slightly above server Gemini timeout).
- Resume PDF parse client abort: 25s.
- Next.js `maxDuration`: 30s generate, 20s suggest.

---

## How to collect numbers later

1. Log `Date.now()` around Prisma and `generateGeminiText`.
2. Compare dashboard with `cached: true` vs `false`.
3. Use Postgres `EXPLAIN ANALYZE` on `Interview` list queries after indexes exist.
4. Do not paste guessed milliseconds into this file.
