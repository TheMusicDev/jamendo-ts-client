import { expect, test } from 'bun:test';

import { createJamendoClient, JamendoError } from '../src/index';

const clientId = process.env.JAMENDO_CLIENT_ID;

/**
 * Live API smoke tests. Skipped unless JAMENDO_CLIENT_ID is set, so the
 * default `bun test` run never hits the network.
 *
 *   JAMENDO_CLIENT_ID=... bun test tests/integration.test.ts
 */
const it = clientId ? test : test.skip;

it('integration: live tracks list returns typed results', async () => {
    const client = createJamendoClient({ clientId: clientId! });
    const res = await client.tracks.list({ limit: 1, include: ['musicinfo'] });
    expect(res.results.length).toBeGreaterThan(0);
    const track = res.results[0];
    if (!track) throw new Error('no track');
    expect(typeof track.id).toBe('string');
    expect(typeof track.name).toBe('string');
    expect(res.resultsCount).toBeGreaterThanOrEqual(1);
});

it('integration: similar tracks respects limit', async () => {
    const client = createJamendoClient({ clientId: clientId! });
    const list = await client.tracks.list({ limit: 1 });
    const refId = list.results[0]?.id;
    if (!refId) throw new Error('no reference track');
    const res = await client.tracks.similar({ id: Number(refId), limit: 3 });
    expect(res.results.length).toBeLessThanOrEqual(3);
});

it('integration: cache serves a repeat call', async () => {
    const client = createJamendoClient({ clientId: clientId!, cache: { defaultTtlMs: 60_000 } });
    const a = await client.tracks.list({ limit: 1 });
    const b = await client.tracks.list({ limit: 1 });
    expect(b.results).toEqual(a.results);
});

it('integration: bad client id raises typed JamendoError', async () => {
    const client = createJamendoClient({ clientId: 'definitely-not-real' });
    await expect(client.tracks.list({ limit: 1 })).rejects.toBeInstanceOf(JamendoError);
});
