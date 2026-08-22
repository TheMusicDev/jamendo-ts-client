import { expect, test } from 'bun:test';

import { createJamendoClient } from '../src/index';

const clientId = process.env.JAMENDO_CLIENT_ID;

/**
 * Live API smoke tests for the playlists resource. Skipped unless
 * JAMENDO_CLIENT_ID is set, so the default `bun test` run never hits the
 * network.
 *
 *   JAMENDO_CLIENT_ID=... bun test tests/integration-playlists.test.ts
 */
const it = clientId ? test : test.skip;

it('integration: playlists.list returns typed results', async () => {
    const client = createJamendoClient({ clientId: clientId! });
    const res = await client.playlists.list({ limit: 5, namesearch: 'rock' });
    expect(Array.isArray(res.results)).toBe(true);
    expect(res.results.length).toBeLessThanOrEqual(5);
    expect(res.resultsCount).toBeGreaterThanOrEqual(0);
});

it('integration: playlists.tracks returns playlists with nested tracks', async () => {
    const client = createJamendoClient({ clientId: clientId! });
    const res = await client.playlists.tracks({ limit: 2 });
    expect(Array.isArray(res.results)).toBe(true);
    expect(res.results.length).toBeLessThanOrEqual(2);
});
