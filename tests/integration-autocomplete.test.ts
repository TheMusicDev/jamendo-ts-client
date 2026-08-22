import { expect, test } from 'bun:test';

import { createJamendoClient } from '../src/index';

const clientId = process.env.JAMENDO_CLIENT_ID;

/**
 * Live API smoke tests for the autocomplete resource. Skipped unless
 * JAMENDO_CLIENT_ID is set, so the default `bun test` run never hits the
 * network.
 *
 *   JAMENDO_CLIENT_ID=... bun test tests/integration-autocomplete.test.ts
 */
const it = clientId ? test : test.skip;

it('integration: autocomplete returns results keyed by entity', async () => {
    const client = createJamendoClient({ clientId: clientId! });
    const res = await client.autocomplete.autocomplete({
        prefix: 'ro',
        limit: '5',
        entity: ['artists', 'tracks', 'albums', 'tags'],
    });
    // Unlike every other endpoint, `results` is an object keyed by entity,
    // not an array. Buckets may be absent or empty on a valid response, so we
    // only assert shape — each present bucket must be an array.
    expect(typeof res.results).toBe('object');
    expect(Array.isArray(res.results)).toBe(false);
    const buckets = ['tags', 'artists', 'tracks', 'albums'] as const;
    for (const b of buckets) {
        if (res.results[b] !== undefined) {
            expect(Array.isArray(res.results[b])).toBe(true);
        }
    }
});
