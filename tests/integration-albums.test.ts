import { expect, test } from 'bun:test';

import { createJamendoClient } from '../src/index';

const clientId = process.env.JAMENDO_CLIENT_ID;

/**
 * Live API smoke tests for the albums resource. Skipped unless
 * JAMENDO_CLIENT_ID is set, so the default `bun test` run never hits the
 * network.
 *
 *   JAMENDO_CLIENT_ID=... bun test tests/integration-albums.test.ts
 */
const it = clientId ? test : test.skip;

it('integration: albums.list returns typed results', async () => {
    const client = createJamendoClient({ clientId: clientId! });
    const res = await client.albums.list({ limit: 5, namesearch: 'rock' });
    expect(Array.isArray(res.results)).toBe(true);
    expect(res.results.length).toBeLessThanOrEqual(5);
    expect(res.resultsCount).toBeGreaterThanOrEqual(0);
});

it('integration: albums.tracks returns albums with nested tracks', async () => {
    const client = createJamendoClient({ clientId: clientId! });
    // Jamendo's /albums/tracks 500s on the fully-unfiltered query; namesearch
    // avoids it (same shape of workaround as the other resource tests).
    const res = await client.albums.tracks({ limit: 2, namesearch: 'rock' });
    expect(Array.isArray(res.results)).toBe(true);
    expect(res.results.length).toBeLessThanOrEqual(2);
});

it('integration: albums.musicinfo returns typed results', async () => {
    const client = createJamendoClient({ clientId: clientId! });
    const res = await client.albums.musicinfo({ limit: 2 });
    expect(Array.isArray(res.results)).toBe(true);
    expect(res.results.length).toBeLessThanOrEqual(2);
});
