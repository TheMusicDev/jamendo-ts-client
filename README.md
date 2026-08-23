# jamendo-ts-client

A type-safe TypeScript HTTP client for the [Jamendo API](https://developer.jamendo.com/) v3.0. Hand-written (no code generators), validated with zod, with caching, rate-limit retry, and ofetch ergonomics.

## Install

```bash
bun add @themusicdev/jamendo-ts-client
```

## Quick start

```ts
import { createJamendoClient } from '@themusicdev/jamendo-ts-client';

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
import { JamendoError, JamendoRateLimit, JamendoSchemaError, JamendoErrorCode } from '@themusicdev/jamendo-ts-client';

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

Every list method returns `ApiResult<T>`: `{ results, warnings, resultsCount?, resultsFullcount? }`. All list ops are cacheable GETs.

- **tracks** — `list`, `similar` (`similar` requires `id`)
- **albums** — `list`, `tracks` (album + nested tracks), `musicinfo` (album + tags/description). `audioformat` restricted to `mp32` on `list`/`musicinfo`; full set on `tracks`.
- **artists** — `list`, `tracks`, `albums`, `locations`, `musicinfo`. `location_radius` defaults server-side when omitted.
- **playlists** — `list`, `tracks` (playlist + nested tracks). `audioformat` restricted to `mp32` on `list`; full set on `tracks`. `access_token` is injected by the fetcher, not passed as a param.
- **radios** — `list`, `stream`. `id` is an integer (unlike most resources where it's a string). `stream` returns a radio's stream URL, `playingnow` track, and `callmeback` ms; one of `id` or `name` is required. **Jamendo documents `stream` as broken** ("is not more working, and it could be never fixed") — tolerate live failure.
- **reviews** — `albums`, `tracks`. `score`/`agreecnt`/ids are strings (the API does not coerce). `user_name` may resemble an email — treat as untrusted.
- **feeds** — `list`. `lang` is a single-value enum (not an array). `title`/`text` are localized objects.
- **autocomplete** — `autocomplete` (requires `prefix`, min 2 chars). **Non-standard shape:** `results` is an object keyed by entity (`tags?`/`artists?`/`tracks?`/`albums?`), not an array. Typed as `ApiResult<AutocompleteMatch, AutocompleteResults>`.

```ts
// albums with nested tracks
const { results } = await client.albums.tracks({ id: [42] });
for (const album of results) {
  console.log(album.name, album.tracks?.length);
}

// autocomplete — results is an object, not an array
const { results: matches } = await client.autocomplete.autocomplete({
  prefix: 'ro',
  entity: ['artists', 'tracks'],
  matchcount: true,
});
for (const artist of matches.artists ?? []) {
  console.log(artist.match, artist.count);
}
```

File/stream endpoints (`/tracks/file`, `/albums/file`, `/playlists/file` — 302 redirects, not JSON) and user-scoped writes (`/users/*`, `/setuser/*` — OAuth write semantics) are deferred to a later release.

## Development

```bash
bun install
bun run test
bun run lint
bun run check:types
bun run build
```

`bun run test` runs the mocked unit suite only — no network, no credentials.
Integration tests (hit the live API, one file per resource under
`tests/integration*.test.ts`) run separately and need `JAMENDO_CLIENT_ID`:

```bash
JAMENDO_CLIENT_ID=... bun run test:integration
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md), generated from conventional commits on
every release.

## License

MIT