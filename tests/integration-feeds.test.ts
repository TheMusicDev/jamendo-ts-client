import { expect, test } from 'bun:test';

import { createJamendoClient } from '../src/index';

const clientId = process.env.JAMENDO_CLIENT_ID;

/**
 * Live API smoke tests for the feeds resource. Skipped unless
 * JAMENDO_CLIENT_ID is set, so the default `bun test` run never hits the
 * network.
 *
 *   JAMENDO_CLIENT_ID=... bun test tests/integration-feeds.test.ts
 */
const it = clientId ? test : test.skip;

it('integration: feeds.list returns typed results', async () => {
    const client = createJamendoClient({ clientId: clientId! });
    const res = await client.feeds.list({ limit: 5 });
    expect(Array.isArray(res.results)).toBe(true);
    expect(res.results.length).toBeLessThanOrEqual(5);
    expect(res.resultsCount).toBeGreaterThanOrEqual(0);
});
