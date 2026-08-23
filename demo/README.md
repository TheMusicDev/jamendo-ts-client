# jamendo-ts-client demo

Minimal consumer of `@themusicdev/jamendo-ts-client` from npm. Proves install +
runtime against the live Jamendo API using the repo's `.env`.

## Run

From the repo root (so Bun auto-loads the root `.env`):

```sh
bun demo/index.ts
```

Or from inside `demo/`:

```sh
bun install
bun run start
```

The script falls back to `../.env` if `JAMENDO_CLIENT_ID` is not in the
environment, so either cwd works.

## What it shows

- `tracks.list` with `namesearch` + `include: ["musicinfo", "stats"]`
- `artists.list`
- `albums.list` with `include: ["musicinfo"]`
- typed error handling (`JamendoError` / `JamendoRateLimit` / `JamendoSchemaError`)

## .env keys used

```
JAMENDO_CLIENT_ID=...      # required
JAMENDO_CLIENT_SECRET=...  # unused here, but part of the repo template
```