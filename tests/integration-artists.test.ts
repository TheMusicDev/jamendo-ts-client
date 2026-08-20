import { expect, test } from 'bun:test';

import { createJamendoClient } from '../src/index';

const clientId = process.env.JAMENDO_CLIENT_ID;

/**
 * Live API smoke tests for the artists resource. Skipped unless
 * JAMENDO_CLIENT_ID is set, so the default `bun test` run never hits the
 * network.
 *
 *   JAMENDO_CLIENT_ID=... bun test tests/integration-artists.test.ts
 */
const it = clientId ? test : test.skip;

it('integration: artists.list returns typed results', async () => {
    const client = createJamendoClient({ clientId: clientId! });
    const res = await client.artists.list({ limit: 5, namesearch: 'rock' });
    expect(Array.isArray(res.results)).toBe(true);
    expect(res.results.length).toBeLessThanOrEqual(5);
    expect(res.resultsCount).toBeGreaterThanOrEqual(0);
});

it('integration: artists.tracks returns artists with nested tracks', async () => {
    const client = createJamendoClient({ clientId: clientId! });
    const res = await client.artists.tracks({ limit: 2 });
    expect(Array.isArray(res.results)).toBe(true);
    expect(res.results.length).toBeLessThanOrEqual(2);
});

it('integration: artists.albums returns artists with nested albums', async () => {
    const client = createJamendoClient({ clientId: clientId! });
    const res = await client.artists.albums({ limit: 2 });
    expect(Array.isArray(res.results)).toBe(true);
    expect(res.results.length).toBeLessThanOrEqual(2);
});

it('integration: artists.locations returns typed results', async () => {
    const client = createJamendoClient({ clientId: clientId! });
    const res = await client.artists.locations({ limit: 2 });
    expect(Array.isArray(res.results)).toBe(true);
    expect(res.results.length).toBeLessThanOrEqual(2);
});

it('integration: artists.musicinfo returns typed results', async () => {
    const client = createJamendoClient({ clientId: clientId! });
    const res = await client.artists.musicinfo({ limit: 2 });
    expect(Array.isArray(res.results)).toBe(true);
    expect(res.results.length).toBeLessThanOrEqual(2);
});
