# Jamendo TS Client — build plan

Hand-written HTTP client for the Jamendo API v3.0. No codegen. Cross-cutting concerns: **caching (keyv)**, **rate-limit handling (p-retry)**, **fetch ergonomics (ofetch)**, **validation + types (zod)**. Published as `jamendo-ts-client` on npm.

Spec source: `openapi-docs/openapi-3.1.yaml` (30 paths, 30 operations).

> Prefer deps over hand-rolled solutions (user stance). Schemas hand-written in Zod (not generated) — we own the files.

---

## 1. Jamendo API facts (from docs)

- Base URL: `https://api.jamendo.com/v3.0`
- Auth: `client_id` as query param (apiKey) on every call. OAuth2 for write/user-scoped endpoints (access token expires in 2h, refresh available).
- Default response format: JSON. `format` query param (json/xml).
- **Response envelope** (every call):
  ```json
  {
    "headers": { "status": "succeed|failed", "code": 0, "error_message": "", "warnings": "..." },
    "results": [ ... ]
  }
  ```
- **Errors are envelope-level, not HTTP-level.** HTTP is 200 even on failure. Must parse `headers.code`.
- **Rate limit = code 6** ("Rate Limit Exceeded"). No HTTP 429, no `Retry-After` documented.
- Quota: ~35,000 requests/month non-commercial. 500K hits → must contact api@jamendo.com. No published RPM; throttling is dynamic/per-app.
- Warnings field (`headers.warnings`) surfaces quota warnings before hard failure — expose to caller.

Sources:
- [Response codes](https://developer.jamendo.com/v3.0/response-codes)
- [Authentication](https://developer.jamendo.com/v3.0/authentication)
- [API Terms of Use](https://devportal.jamendo.com/api_terms_of_use)

---

## 2. Error code map (envelope `headers.code`)

Built-in enum, thrown as typed errors. All extend `JamendoError` carrying `{ code, type, message, warnings }`.

| code | type | client behavior |
|------|------|-----------------|
| 0 | Success | return validated `results` (warnings may still be present) |
| 1 | Exception | throw `JamendoException` |
| 2 | HttpMethod | throw `JamendoHttpMethod` |
| 3 | Type | throw `JamendoType` |
| 4 | RequiredParameter | throw `JamendoRequiredParameter` |
| 5 | InvalidClientId | throw `JamendoInvalidClientId` |
| **6** | **RateLimitExceeded** | **retry via `p-retry` backoff, then throw `JamendoRateLimit` if exhausted** |
| 7 | MethodNotFound | throw `JamendoMethodNotFound` |
| 8 | NeededParameter | throw `JamendoNeededParameter` |
| 9 | Format | throw `JamendoFormat` |
| 10 | EntryPoint | throw `JamendoEntryPoint` |
| 11 | SuspendedApplication | throw `JamendoSuspendedApplication` |
| 12 | AccessToken | throw `JamendoAccessToken` |
| 13 | InsufficientScope | throw `JamendoInsufficientScope` |
| 21–24, 101 | various | throw mapped `JamendoError` subclass |
| — | SchemaMismatch | `JamendoSchemaError` — thrown by zod when `results` don't match the endpoint's schema (API drift detected) |

Non-retryable codes (all except 6) are thrown immediately; `p-retry`'s `onFailedAttempt` rethrows them so they abort the retry loop instead of consuming attempts.

---

## 3. Dependencies (runtime)

- **`keyv`** — cache (required). Default store = in-memory Map (keyv default). Consumer passes a Keyv store URI (`sqlite://`, `redis://`, `postgresql://`, `mongodb://`) or a Keyv instance for persistence.
- **`ofetch`** — fetch wrapper: `baseURL`, query serialization, timeout, JSON parse, interceptors. Its built-in `retry` is HTTP-status-based → **does not trigger on Jamendo's code 6 (HTTP 200)**, so we do not rely on it. ofetch is for ergonomics only.
- **`p-retry`** — retry + exponential backoff + jitter around the *envelope-aware* call. This is what catches code 6.
- **`zod`** — per-endpoint schemas. Hand-written from OpenAPI. `z.infer` derives TS types (one source of truth). Validates `results` at runtime → throws `JamendoSchemaError` on mismatch.

No other runtime deps. Dev tooling unchanged (biome, tsc, buntest, lefthook, commitlint, fallow).

All four are Bun-compatible, ESM, actively maintained.

> keyv note: for SQLite-backed caching on Bun, `@keyv/sqlite` uses `better-sqlite3` (native). Don't pin a store — consumer picks any keyv-compatible store.

---

## 4. Configuration (constructor)

```ts
createJamendoClient({
  clientId: string,                  // required (apiKey)
  accessToken?: string,              // for OAuth2/user-scoped endpoints
  baseUrl?: string,                  // default https://api.jamendo.com/v3.0
  timeoutMs?: number,                // per-request, default 30000
  cache?: {
    enabled?: boolean,               // default true
    store?: KeyvStore | string,      // Keyv-compatible store or URI; client owns the Keyv instance. default in-memory
    defaultTtlMs?: number,           // default 60000 (1 min)
    ttlByEndpoint?: Record<string, number>, // per-endpoint override (keyed by operationId)
  },
  rateLimit?: {
    maxRetries?: number,             // default 3 — on code 6
    backoffBaseMs?: number,          // default 500 (p-retry minTimeout)
    backoffMaxMs?: number,           // default 8000 (p-retry maxTimeout)
    jitter?: boolean,                // default true (p-retry randomize)
    minIntervalMs?: number,          // preemptive throttle: min gap between dispatched requests, default 0 (off)
    maxConcurrent?: number,          // default Infinity. Set 1+ to serialize.
    onRateLimit?: (info) => void,    // callback on each code 6 attempt, default no-op
  },
  fetch?: typeof fetch,              // injectable for tests (passed to ofetch)
})
```

All knobs configurable. `createJamendoClient({ clientId })` works with defaults.

---

## 5. Architecture

```
src/
  index.ts                 // public exports
  client.ts                // createJamendoClient, composes layers
  config.ts                // config types + defaults + validation
  core/
    fetcher.ts             // ofetch wrapper: URL+query build, auth, timeout, format
    envelope.ts            // parse {headers, results}; map code -> typed error
    validate.ts            // zod schema registry + results validation -> JamendoSchemaError
    cache.ts               // keyv wrapper: get/set key, TTL resolution, GET-only gate
    rateLimit.ts           // p-retry config + preemptive throttle (queue/semaphore)
    request.ts             // orchestrates: cache -> p-retry(fetcher -> envelope -> validate) -> cache write
  errors.ts                // JamendoError + subclasses + code map
  schemas/                 // hand-written zod schemas per resource
    envelope.ts            // EnvelopeSchema, HeadersSchema
    tracks.ts              // TrackSchema, TracksListParamsSchema, ...
    artists.ts
    albums.ts
    ...
  types.ts                 // z.infer'd types re-exported (Track, Artist, Album, ...)
  endpoints/
    tracks.ts              // thin typed wrappers calling client.request
    artists.ts
    albums.ts
    ... (one file per resource group)
  endpoints/index.ts       // mounts all groups onto client
tests/
  envelope.test.ts
  validate.test.ts
  cache.test.ts
  rateLimit.test.ts
  client.test.ts
  fixtures/                // recorded envelope payloads
```

### Layer responsibilities

**fetcher** — uses `ofetch({ baseURL, url, query, timeout, responseType: 'json' })`. Builds query from params + injects `client_id`, `access_token` (if set), and `format=json` (hardcoded — client always returns parsed objects, XML not supported). Applies `timeoutMs`. Returns parsed JSON (envelope). No envelope-code awareness beyond returning it.

**envelope** — `parseEnvelope(json)`: validates `{ headers, results }` shape minimally (zod envelope schema, strip mode). If `headers.code === 0` return `{ results, warnings }`; else throw mapped `JamendoError` (code 6 → `JamendoRateLimit`). This is where Jamendo's non-HTTP error model is normalized.

**validate** — registry mapping `opId` → result element zod schema. `validateResults(opId, results)` runs `schema.array().parse(results)` in **strip mode** (default `z.object()`): unknown fields dropped, typed fields enforced. On zod failure → `JamendoSchemaError` carrying the zod issues. Schema changes to the API = client version bump (user decision).

**cache** — wraps a Keyv instance. Key = `sha1(method + path + sortedQuery + tokenHash)`. GET-only (POST/PUT/DELETE bypass). TTL resolved per-endpoint (`ttlByEndpoint[opId]` ?? `defaultTtlMs`). `enabled: false` short-circuits. Stores **validated** results (post-zod, post-strip) to avoid re-parse + re-validate on hit.

**rateLimit** — two parts:
1. **Reactive** (`p-retry`): wraps the `fetcher → envelope → validate` chain. On `JamendoRateLimit` (code 6), `p-retry` backs off: exponential `2^attempt * backoffBaseMs`, capped at `backoffMaxMs`, + jitter (`randomize`). Up to `maxRetries`. `onFailedAttempt` rethrows non-`JamendoRateLimit` errors so they don't consume attempts. `onRateLimit` config callback fires each attempt. No `Retry-After` from Jamendo → self-backoff only. If exhausted, rethrow `JamendoRateLimit`.
2. **Preemptive** (optional): if `minIntervalMs > 0` or `maxConcurrent < Infinity`, requests pass through a queue/semaphore before the `p-retry` chain. Default off.

**request** — orchestrator: `cache.get(key)` → hit returns cached validated results; else run `p-retry(fetcher → envelope → validate)`, on success `cache.set(key, results, ttl)`, return `{ results, warnings }`. Endpoint wrappers pass `{ opId, cache: bool, schema }`.

### Endpoint modules

Thin. Each operation = one function, typed via `z.infer` of its schema. Example:
```ts
// schemas/tracks.ts
const TrackSchema = z.object({ id: z.string(), name: z.string(), audio: z.string().url().optional(), ... });
export type Track = z.infer<typeof TrackSchema>;
const TracksListParamsSchema = z.object({ /* query params */ });

// endpoints/tracks.ts
export function tracks(client: Client) {
  return {
    list: (params: TracksListParams) =>
      client.request<Track[]>('GET', '/tracks', params, { opId: 'tracksList', cache: true, schema: TrackSchema }),
    audio: (params: TracksAudioParams) =>
      client.request<...>('GET', '/tracks/audio', params, { opId: 'tracksAudio', cache: false, schema: ... }),
  };
}
```
`client.request<T>` generic = `z.infer` element type. 30 operations → ~10-12 resource files. Build core first, then endpoints incrementally (read-heavy GETs first: tracks, artists, albums).

---

## 6. Rate-limit strategy (answers Q3)

**Recommendation:** exponential backoff + jitter via `p-retry`, default 3 retries, fully configurable. Jamendo gives no `Retry-After` and no published RPM → we react to code 6 and self-backoff.

- `maxRetries`: default **3**.
- `backoffBaseMs`: default **500**, `backoffMaxMs`: default **8000**. `p-retry` exponential + `randomize` (jitter).
- `minIntervalMs` / `maxConcurrent`: preemptive self-throttle, default **off**. Consumer opts in to avoid bursts.
- `onRateLimit` callback fires each code-6 attempt (logging/metrics). Default no-op.
- `headers.warnings` always returned on success; on exhaustion, `JamendoRateLimit` carries last `warnings`.

**Should it be configurable?** Yes — fully. Quotas differ per app tier; every knob exposed. Defaults work for `createJamendoClient({ clientId })`.

---

## 7. Caching details

- GET-only. Write endpoints (POST/PUT/DELETE) bypass cache (v1; invalidation deferred — out of scope).
- Key = `sha1(method:path:sortedQuery:tokenHash)`. `tokenHash` isolates user-scoped responses (hash of access token, not raw token).
- Stores **validated, stripped** results (post-zod) → hit path skips re-parse/re-validate.
- TTL: `ttlByEndpoint[opId] ?? defaultTtlMs`. Default 60s. Per-endpoint overrides for stable data (genres: 1h) vs volatile (user playlists: off).
- `cache: false` per-call opt-out in endpoint wrapper.
- Keyv instance shared across client lifetime. Consumer controls persistence (memory / sqlite / redis).

---

## 8. Public API surface (`src/index.ts`)

```ts
export { createJamendoClient } from './client';
export type { JamendoClient, ClientConfig, RequestOptions } from './config';
export { JamendoError, JamendoRateLimit, JamendoSchemaError, ... } from './errors';
export type * from './types';        // Track, Artist, Album, ... (z.infer) — types only, not runtime schemas
export * from './endpoints';         // endpoint param/result types
```

---

## 9. Testing

Bun test. No network. Injectable `fetch` passed to ofetch.

- `envelope.test.ts`: code 0 → results; code 6 → JamendoRateLimit; each code → correct subclass; warnings preserved.
- `validate.test.ts`: valid results pass; unknown fields stripped (assert stripped); missing/wrong-type → JamendoSchemaError with zod issues.
- `cache.test.ts`: hit/miss, GET-only gate, TTL resolution, per-endpoint override, token-scope isolation, `enabled:false` bypass, `cache:false` per-call bypass, hit returns stripped results.
- `rateLimit.test.ts`: code 6 retried N times then throws; backoff delay growth (fake timers); `onFailedAttempt` rethrows non-retryable; `onRateLimit` callback fires; preemptive `minIntervalMs` enforced; `maxConcurrent` serializes.
- `client.test.ts`: end-to-end with ofetch `fetch` injected returning recorded envelopes (fixtures/). Auth injection, query building, timeout.
- Integration smoke test gated behind env var `JAMENDO_CLIENT_ID` (skipped in CI without it).

Ponytail self-check: each non-trivial module ships the smallest test that fails if its logic breaks.

---

## 10. Build order

1. `schemas/envelope.ts` + `errors.ts` + `envelope.ts` + tests. (foundation)
2. `schemas/` for first resource (tracks) + `validate.ts` + tests.
3. `fetcher.ts` (ofetch wrapper, URL/query/auth/timeout) + tests.
4. `cache.ts` (keyv wrapper) + tests.
5. `rateLimit.ts` (p-retry config + optional throttle) + tests.
6. `request.ts` orchestrator + `client.ts` composition + tests.
7. Endpoints incrementally — read GETs first (tracks, artists, albums), then writes. Add schemas per resource as each lands.
8. Public exports + README usage.
9. Integration smoke test (env-gated).

Each step lands green (types + lint + tests) before next.

---

## 11. Out of scope (v1)

- OAuth2 token refresh automation (accept token, don't auto-refresh — document consumer responsibility).
- Write-endpoint cache invalidation.
- XML format support (JSON only; no `format` knob — client always sends `format=json` and returns parsed objects).
- Auto-detection of 3scale `X-RateLimit-*` headers (undocumented; revisit if empirically observed).
- Request retry on network errors (only code 6 retried in v1; network errors throw).
- Strict schema mode / passthrough (strip mode locked — unknown fields dropped).

Add when needed.

---

## 12. Decisions (locked)

1. **Endpoint param typing**: zod-typed params. One source of truth, outgoing query validated before fetch.
2. **Cache store default**: in-memory Keyv. Consumer upgrades by passing `KeyvStore | string`.
3. **`onRateLimit` callback + warnings surfacing**: include in v1.
4. **Version**: first real release `0.1.0` (bump from `0.0.0` at build step 8).
5. **Export zod schemas publicly**: internal only. Types (`z.infer`) exported; runtime schemas stay internal.

---

## 13. Deferred work (next branches)

### Status snapshot — `feat/resources` (PR #4)

**DONE (v1 shipped, on `feat/resources` branch, PR #4 open):**
- [x] Core: cache (keyv), rateLimit (p-retry, code 6), fetcher (ofetch),
      envelope parse, validate (zod strip), request orchestrator, errors.
- [x] Generalized core for non-array results (`R` ≠ `T[]`, autocomplete path).
- [x] Overloaded `RequestFn`/`Client.request` so non-array `R` requires
      `resultsSchema` (fix for the validation-bypass issue).
- [x] 8 resources wired + exported + documented:
      tracks, albums, artists, playlists, radios, reviews, feeds, autocomplete.
- [x] Schemas internal; `z.infer` types exported.
- [x] Unit tests: 111 pass / 0 fail. Types clean. 0 lint errors.
- [x] README: config, errors, caching, rate-limit, per-resource notes.

**NOT DONE (pending — pick up here):**
- [ ] **13.1** Branch A — file/stream + radio stream (4 endpoints).
- [ ] **13.2** Branch B — user reads (`/users/*`) + writes (`/setuser/*`).
- [ ] **13.3** Integration smoke for 7 new resources (live API).
- [ ] **13.4** npm publish (first `0.1.0` release).
- [ ] **13.5** Local `main` reset (hygiene, post-merge).

Legend: `[x]` shipped on `feat/resources` · `[ ]` pending. Each pending item
below has the detail a fresh session needs. **Do not start without user
confirmation.**

### 13.0 Parallel task breakdown (for delegation)

Each row = one delegate-able chunk. `Depends on` = must merge first.
`Parallel with` = can run concurrently (no shared files). All chunks assume
`feat/resources` is merged to `main` first (or branch off `feat/resources`).

| ID | Chunk | Scope (files) | Depends on | Parallel with |
|----|-------|---------------|------------|----------------|
| **A1** | Redirect core path | `src/core/redirect.ts` (new), `src/core/fetcher.ts` (add manual-redirect helper) | — | A5, B0, C1*, D1, E1 |
| **A2** | `tracks.file` endpoint | `src/schemas/tracks-file.ts` (new), `src/endpoints/tracks.ts` (add `file`), test | A1 | A3, A4, A5, B0, C1*, D1 |
| **A3** | `albums.file` endpoint | `src/schemas/albums-file.ts` (new), `src/endpoints/albums.ts` (add `file`), test | A1 | A2, A4, A5, B0, C1*, D1 |
| **A4** | `playlists.file` endpoint | `src/schemas/playlists-file.ts` (new), `src/endpoints/playlists.ts` (add `file`), test | A1 | A2, A3, A5, B0, C1*, D1 |
| **A5** | `radios.stream` (JSON list op) | `src/schemas/radios.ts` (add `RadioStreamSchema`), `src/endpoints/radios.ts` (add `stream`), test | — | A1, A2, A3, A4, B0, C1*, D1 |
| **A6** | Branch A wiring + exports + README | `src/client.ts`, `src/index.ts`, `README.md` | A2, A3, A4, A5 | B*, C1*, D1 |
| **B0** | Branch B design decisions | This doc — DONE 2026-08-20 (see §13.2) | — | — (complete) |
| **B1** | `users` reads (4 endpoints) | `src/schemas/users.ts` (new), `src/endpoints/users.ts` (new), test | B0 (done) | A*, B2, B6, C1*, D1 |
| **B2** | `setuser` writes (5 endpoints) + per-op response zod | `src/schemas/setuser.ts` (new), `src/endpoints/setuser.ts` (new), test | B0 (done), B3 | A*, B1, B6, C1*, D1 |
| **B3** | Cache invalidation (auto, on write) | `src/core/cache.ts` (add `invalidate`), `src/core/request.ts` (POST path calls it), write→read map | B0 (done) | A*, B1, B2, B6, C1*, D1 |
| **B6** | Token auto-refresh | `src/config.ts` (`clientSecret`+`refreshToken`), new `src/core/oauth.ts` (POST `/oauth/grant` refresh), `src/core/fetcher.ts` (refresh on code 12 + retry once), token cache, test | B0 (done) | A*, B1, B2, B3, C1*, D1 |
| **B4** | Branch B wiring + exports + README | `src/client.ts`, `src/index.ts`, `README.md` | B1, B2, B3, B6 | A6, C1*, D1 |
| **C1a–g** | Integration smoke, per resource | `tests/integration-<resource>.test.ts` (new, one each: albums, artists, playlists, radios, reviews, feeds, autocomplete) | — | everything (live API, env-gated) |
| **D1** | npm publish prep | `package.json`, `tsconfig.build.json` (verify), `npm pack --dry-run`, provenance decision | — | everything (but publish after merges) |
| **E1** | Local `main` reset | git only: `git switch main && git reset --hard origin/main` | PR #4 merged | nothing (do once, takes 5s) |

**Parallel waves (suggested dispatch order):**

- **Wave 1 (no deps, launch all at once):** A1, A5, C1a–g (7 tasks), D1.
  9 parallel agents. B0 is DONE (no code, decisions locked in §13.2).
- **Wave 2 (after Wave 1):** A2, A3, A4 (after A1); B1, B2 (after B3), B3, B6
  (all after B0=done). 6 parallel.
- **Wave 3 (integration):** A6 (after A2–A5); B4 (after B1, B2, B3, B6).
  2 parallel. E1 anytime after PR #4 merges. D1 publish after all merges.

**File-conflict notes (why the parallelism is safe):**
- A2/A3/A4 each touch a *different* endpoint file + a *new* schema file → no
  merge conflicts. A1 is the shared core they build on (merge first).
- A5 touches `radios.ts` — same file as nothing else in Branch A → safe.
- B1/B2 are separate new files → safe together.
- A6 and B4 both touch `src/client.ts` + `src/index.ts` + `README.md` → run
  sequentially (A6 then B4), or split: one agent does client.ts, other does
  index.ts. Easiest: serialize A6 → B4.
- C1* tasks are all *new* test files → zero conflict with anything.
- D1 only touches `package.json` + build config → conflicts only if another
  chunk also edits `package.json` (none do except D1 itself).

---

### 13.1 Branch A — file/stream + radio stream endpoints  `[ ] pending`

**Tasks:** A1 (redirect core), A2 (tracks.file), A3 (albums.file),
A4 (playlists.file), A5 (radios.stream), A6 (wiring). See §13.0 table.

Four operations the JSON-envelope core does not cover. Two distinct shapes:

**302 binary redirects (NOT JSON, no envelope, no zod, no cache):**
- `GET /tracks/file` — `downloadTrackFile`. Params: `id` (int, required, single),
  `audioformat` (full enum), `action` (`download`|`stream`, default `download`),
  `fullcount`. Returns 302 → `Location` header = audio URL. 404 if
  `audiodownload_allowed`/`track_audiodownload_allowed` false (since Apr 2022).
  404/500 are plain HTTP errors, NOT the `Error` JSON envelope.
- `GET /albums/file` — `downloadAlbumFile`. Params: `id` (int, required, single),
  `audioformat` (`mp32` only). 302 → zip URL. 404 if `zip_allowed` false.
- `GET /playlists/file` — `downloadPlaylistFile`. Params: `id` (int, required,
  single), `audioformat` (`mp32` only). 302 → zip URL.

**Design:**
- New fetch path in `core/fetcher.ts` (or a sibling `core/redirect.ts`): call
  ofetch with `redirect: 'manual'`, read the 302 `Location` header, return it.
  Do NOT follow automatically — caller decides (stream it, or hand the URL to
  a downloader). Return type: `{ url: string }` (or a `Response` for streaming).
- No `parseEnvelope`, no `validateResults`, no `Cache`. Bypass the `request`
  orchestrator entirely — these are not `ApiResult<T>`. Likely a separate
  `requestRedirect` entry point on `Client`, or dedicated methods that skip
  the cache/retry chain (rate-limit code 6 doesn't apply — these aren't
  envelope calls; though HTTP 429 could still surface, handle by reusing
  `run` if desired, YAGNI-call).
- 404/500 → throw a plain `JamendoError` (or a new `JamendoHttpError` subclass
  carrying status). NOT `JamendoSchemaError` — no schema involved.
- Params: small standalone zod schemas (like autocomplete's), NOT extending
  `ListParamsSchema`. `id` is a single integer here (not the usual string
  array) — note the type mismatch with the rest of the API.

**JSON but documented-unreliable (standard envelope, zod, cacheable in principle):**
- `GET /radios/stream` — `getRadioStream`. Returns 200 JSON envelope,
  `results: RadioStream[]` (stream URL, `playingnow` track, `callmeback` ms).
  Params: `id` (int) OR `name` (string) — one required; `type` (`www`|`pro`,
  default `www`); `format`, `callback`, `fullcount`, imagesize enums.
  **Jamendo documents this as broken** ("is not more working, and it could be
  never fixed"). Confirm against live API before depending on it. Build it as
  a normal cacheable list op (like `radios.list`) but flag the unreliability in
  the JSDoc + README. `RadioStream` schema hand-written from
  `components/schemas/RadioStream`.

**Branch A scope:** 3 redirect endpoints + 1 radio-stream list op. New
`RadioStream` schema. Client surface: `client.tracks.file`, `client.albums.file`,
`client.playlists.file`, `client.radios.stream`. Tests: redirect-path unit
tests (mock ofetch returning 302 + Location), radio-stream as a normal list
test. Integration smoke behind `JAMENDO_CLIENT_ID` (radio stream may fail
live — tolerate).

### 13.2 Branch B — user-scoped reads + writes  `[ ] pending`

**Tasks:** B0 (design decisions — BLOCKER, do first), B1 (users reads),
B2 (setuser writes), B3 (cache invalidation, conditional), B4 (wiring).
See §13.0 table. **B0 must be answered before B1/B2/B3 start.**

**Reads (GET, standard envelope, access_token-gated):**
- `GET /users` — `getUser`. Lookup (id | access_token | name — one required),
  NOT open search. `order` enum documented empty — confirm whether to omit.
  Returns `User[]`.
- `GET /users/artists` — `listUserFanArtists`. Fan-of artists.
- `GET /users/albums` — `listUserMyAlbums`.
- `GET /users/tracks` — `listUserTracks`.

**Writes (POST, access_token required, NOT cacheable):**
- `POST /setuser/fan` — `setUserFan`. Become/un-become a fan.
- `POST /setuser/favorite` — `setUserFavorite`. Favorite a track/album/...
- `POST /setuser/like` — `setUserLike`.
- `POST /setuser/dislike` — `setUserDislike`.
- `POST /setuser/myalbum` — `setUserMyAlbum`.

**Design decisions (locked 2026-08-20 — revises §11):**
1. **Token refresh**: AUTO-REFRESH. Client stores refresh creds and
   auto-refreshes the access_token on expiry (2h). Revises §11 ("no
   auto-refresh" → now in scope). Jamendo OAuth2 grant endpoint:
   `POST https://api.jamendo.com/v3.0/oauth/grant` with `grant_type=
   refresh_token`, `refresh_token`, `client_id`, **`client_secret`** → new
   `access_token` + new `refresh_token`. Impl: new config fields
   (`clientSecret`, `refreshToken`; `clientId` already present), a token
   cache + refresh hook in `core/fetcher.ts` that re-fetches on envelope code
   12 (`JamendoAccessToken`) and retries once. Consumer opts in by providing
   `clientSecret` + `refreshToken`; without both, degrades to accept-token
   (no refresh). NOTE: the initial `refresh_token` comes from a one-time
   manual Authorization Code Grant (step 1+2) — that flow is OUT of scope;
   consumer obtains it once and passes it in.
2. **Write cache invalidation**: AUTOMATIC. Write ops auto-drop related read
   cache keys after a successful write. Revises §11 ("out of scope v1" → now
   in scope). Impl: a write→read dependency map (`setUserFavorite` invalidates
   playlist/tracks + users/tracks keys, etc.). `core/cache.ts` gains
   `invalidate(pattern|opIds)`; `core/request.ts` POST path calls it on
   success. **B3 is now required, not conditional.**
3. **POST path through `request`**: current `request` supports POST
   (`'GET' | 'POST'`). POST needs: no cache read, no cache write, `access_token`
   injected by fetcher (already is), envelope still applies, **then
   auto-invalidate** (decision #2). zod validation of write responses: FULL,
   per-op (decision below).
4. **Write response validation**: FULL ZOD PER WRITE OP. Hand-write a
   response schema for each `setuser/*` op (success result shape), same
   discipline as reads. Catches API drift on writes too. 5 new schemas.
5. **`access_token` as param vs injected**: OMIT FROM PARAMS. Fetcher injects
   it from config (consistent with playlists/reviews). `/users` params
   schemas do NOT declare `access_token`. Confirmed.
6. **PII**: `User` schema may carry `name`, `dispname`, `link`, `image`.
   Treat as untrusted (same as reviews `user_name`). Document in JSDoc +
   README, no special handling beyond that.

**Branch B scope:** `User` + 5 per-op `setuser` response schemas; `users`
resource (`list`, `artists`, `albums`, `tracks`); `setuser` resource
(`fan`, `favorite`, `like`, `dislike`, `myalbum`); **token auto-refresh**
(B6); **automatic cache invalidation on writes** (B3, with write→read map).
POST methods on `Client` already typed (`'GET' | 'POST'`). Tests: write ops
assert `cache: false`, POST method, access_token injection, no cache write,
auto-invalidate called, refresh-on-code-12 retried once.

### 13.3 Whenever — integration smoke coverage  `[ ] pending`

`tests/integration.test.ts` currently only covers `tracks`. 7 new resources
untested against live API. Add one happy-path per resource (albums, artists,
playlists, radios, reviews, feeds, autocomplete) behind `JAMENDO_CLIENT_ID`.
Group in the existing file or one per resource. Low-risk, no design calls.

### 13.4 Whenever — npm publish prep  `[ ] pending`

`package.json` already has: `version: 0.1.0`, `files: ["dist"]`, `prepack:
bun run build`, `build: tsc -p tsconfig.build.json`, `exports` + `types`.
Mostly done. Remaining:
- Confirm `tsconfig.build.json` exists and emits `dist/` (index.js + d.ts).
- Add `provenance` / publish with `npm publish --access public --provenance`
  (requires GitHub Actions OIDC — decide: manual publish or CI publish flow).
- Add `publishConfig` if needed.
- Verify `openapi-docs/`, `client-plan.md`, `tests/` excluded from tarball
  (`files: ["dist"]` already excludes them — confirm via `npm pack --dry-run`).
- First publish: `npm publish --access public`. Tag `latest`.

### 13.5 Whenever — local `main` cleanup  `[ ] pending`

Local `main` is 8 commits ahead of `origin/main` (the `feat/resources`
commits landed on local main before branching). After PR #4 merges, reset:
`git switch main && git reset --hard origin/main`. Pure hygiene, not a build
task. Ask user before running (rewrites local main).