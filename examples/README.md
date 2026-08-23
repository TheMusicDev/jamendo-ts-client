# jamendo-ts-client examples

Minimal consumer of `@themusicdev/jamendo-ts-client`, imported straight from
the repo's `../dist` build (not the npm package) so it always exercises the
current local code. Proves the built output works end-to-end against the
live Jamendo API using the repo's `.env`.

## Run

Build first, then run from the repo root (so Bun auto-loads the root `.env`):

```sh
bun run build
bun examples/index.ts
```

Or from inside `examples/`:

```sh
bun run start
```

No `bun install` needed here — there's no dependency, it imports `../dist`
directly. The script falls back to `../.env` if `JAMENDO_CLIENT_ID` is not
in the environment, so either cwd works.

## What it shows

- `tracks.list` with `namesearch`
- `artists.list`
- `albums.list`
- typed error handling (`JamendoError` / `JamendoRateLimit` / `JamendoSchemaError`)

## .env keys used

```
JAMENDO_CLIENT_ID=...      # required
JAMENDO_CLIENT_SECRET=...  # unused here, but part of the repo template
```