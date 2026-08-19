# jamendo-ts-client

A type-safe TypeScript HTTP client for the [Jamendo API](https://developer.jamendo.com/) v3.0. Hand-written (no code generators), validated with zod, with caching, rate-limit retry, and ofetch ergonomics.

## Install

```bash
bun add jamendo-ts-client
```

## Quick start

```ts
import { createJamendoClient } from 'jamendo-ts-client';

const client = createJamendoClient({ clientId: process.env.JAMENDO_CLIENT_ID! });

const { results, warnings, resultsCount, resultsFullcount } = await client.tracks.list({
  limit: 10,
  namesearch: 'rock',
  include: ['musicinfo', 'stats'],
});

for (const track of results) {
  console.log(track.id, track.name, track.audio);
}
```

`createJamendoClient({ clientId })` works with all defaults. Only `clientId` is required.

## Configuration

```ts
const client = createJamendoClient({
  clientId: '...',
  accessToken: '...',              // optional: user-scoped OAuth token
  timeoutMs: 30_000,               // per-request, default 30000
  fetch: customFetch,              // inject a fetch impl (testing/proxying)

  cache: {
    enabled: true,                 // default true, in-memory
    defaultTtlMs: 60_000,          // default 60000
    store: 'redis://localhost',    // any keyv store or URI
    ttlByEndpoint: { listTracks: 3_600_000 }, // per-opId overrides
  },

  rateLimit: {
    maxRetries: 3,                 // retries on envelope code 6, default 3
    backoffBaseMs: 500,            // exponential backoff base, default 500
    backoffMaxMs: 8_000,           // backoff cap, default 8000
    jitter: true,                  // default true
    minIntervalMs: 0,              // preemptive min gap between dispatches, default 0 (off)
    maxConcurrent: Infinity,       // preemptive concurrency cap, default Infinity (off)
    onRateLimit: (info) => console.warn('rate-limited', info), // per-attempt callback
  },
});
```

## Errors

Jamendo signals errors in the response envelope (`headers.code`), not via HTTP status. The client normalizes them to typed errors you can switch on via `err.code`:

```ts
import { JamendoError, JamendoRateLimit, JamendoSchemaError, JamendoErrorCode } from 'jamendo-ts-client';

try {
  await client.tracks.list({ ... });
} catch (err) {
  if (err instanceof JamendoRateLimit) {
    // envelope code 6 — retried up to maxRetries, then thrown
  } else if (err instanceof JamendoSchemaError) {
    // response didn't match the expected zod shape (API drift)
  } else if (err instanceof JamendoError) {
    console.log(err.code, err.type, err.message, err.warnings);
  }
}
```

`JamendoErrorCode` enumerates the known envelope codes (e.g. `RateLimitExceeded`, `InvalidClientId`).

## Caching

GET requests are cacheable. Keys are deterministic hashes over method + path + sorted params + an access-token hash, so the same query under the same token hits the cache regardless of param key order. Only validated, successful results are cached. Disable per-call with `{ cache: false }` (not exposed yet at the endpoint level — all track list ops are cacheable).

## Rate limiting

Jamendo's quota is dynamic and per-app; the API returns envelope code 6 when throttled (not HTTP 429). The client retries code 6 with exponential backoff + jitter via `p-retry`. Every other error aborts immediately. `onRateLimit` fires once per rate-limited attempt. Optional preemptive throttling (`minIntervalMs`, `maxConcurrent`) spaces out dispatches before the retry chain.

## Resources

- **tracks** — `list`, `similar`

More resources (albums, artists, playlists, users, reviews, feeds) follow the same pattern and are added incrementally.

## Development

```bash
bun install
bun test
bun run lint
bun run check:types
bun run build
```

Integration smoke test (hits the live API) runs when `JAMENDO_CLIENT_ID` is set:

```bash
JAMENDO_CLIENT_ID=... bun test tests/integration.test.ts
```

## License

MIT