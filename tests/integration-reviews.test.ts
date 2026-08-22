import { expect, test } from 'bun:test';

import { createJamendoClient } from '../src/index';

const clientId = process.env.JAMENDO_CLIENT_ID;

/**
 * Live API smoke tests for the reviews resource. Skipped unless
 * JAMENDO_CLIENT_ID is set, so the default `bun test` run never hits the
 * network.
 *
 *   JAMENDO_CLIENT_ID=... bun test tests/integration-reviews.test.ts
 */
const it = clientId ? test : test.skip;

it('integration: reviews.albums returns typed results', async () => {
    const client = createJamendoClient({ clientId: clientId! });
    const res = await client.reviews.albums({ limit: 5 });
    expect(Array.isArray(res.results)).toBe(true);
    expect(res.results.length).toBeLessThanOrEqual(5);
    expect(res.resultsCount).toBeGreaterThanOrEqual(0);
});

it('integration: reviews.tracks returns typed results', async () => {
    const client = createJamendoClient({ clientId: clientId! });
    const res = await client.reviews.tracks({ limit: 5 });
    expect(Array.isArray(res.results)).toBe(true);
    expect(res.results.length).toBeLessThanOrEqual(5);
    expect(res.resultsCount).toBeGreaterThanOrEqual(0);
});
