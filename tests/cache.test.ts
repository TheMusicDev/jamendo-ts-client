import { expect, test } from 'bun:test';

import { resolveConfig } from '../src/config';
import { type Cache, type CacheEntry, createCache } from '../src/core/cache';

const entry: CacheEntry<unknown> = {
    results: [{ id: '1' }],
    warnings: '',
    resultsCount: 1,
};

/** Resolve a cache, asserting it is enabled (not null) — one non-null site. */
function makeCache(clientId = 'c', extra: Parameters<typeof resolveConfig>[0] = {}): Cache {
    const cache = createCache(resolveConfig({ clientId, ...extra }));
    expect(cache).not.toBeNull();
    // biome-ignore lint/style/noNonNullAssertion: asserted above
    return cache!;
}

test('cache: disabled returns null (no-op)', () => {
    const config = resolveConfig({ clientId: 'c', cache: { enabled: false } });
    expect(createCache(config)).toBeNull();
});

test('cache: set then get returns the entry', async () => {
    const cache = makeCache();
    const key = cache.keyFor('GET', '/tracks', { limit: 5 });
    await cache.set(key, entry, 60_000);
    const got = await cache.get(key);
    expect(got).toEqual(entry);
});

test('cache: key is stable regardless of param key order', () => {
    const cache = makeCache();
    const a = cache.keyFor('GET', '/tracks', { limit: 5, namesearch: 'rock' });
    const b = cache.keyFor('GET', '/tracks', { namesearch: 'rock', limit: 5 });
    expect(a).toBe(b);
});

test('cache: key differs by method, path, and params', () => {
    const cache = makeCache();
    const base = cache.keyFor('GET', '/tracks', { limit: 5 });
    expect(cache.keyFor('POST', '/tracks', { limit: 5 })).not.toBe(base);
    expect(cache.keyFor('GET', '/albums', { limit: 5 })).not.toBe(base);
    expect(cache.keyFor('GET', '/tracks', { limit: 6 })).not.toBe(base);
});

test('cache: access token isolates keys (user-scope isolation)', () => {
    const anon = makeCache();
    const user1 = makeCache('c', { accessToken: 'tok1' });
    const user2 = makeCache('c', { accessToken: 'tok2' });
    const params = { limit: 5 };
    const kAnon = anon.keyFor('GET', '/users/tracks', params);
    const k1 = user1.keyFor('GET', '/users/tracks', params);
    const k2 = user2.keyFor('GET', '/users/tracks', params);
    expect(kAnon).not.toBe(k1);
    expect(k1).not.toBe(k2);
});

test('cache: ttlFor uses per-endpoint override, else default', () => {
    const cache = makeCache('c', {
        cache: { defaultTtlMs: 60_000, ttlByEndpoint: { listTracks: 3_600_000 } },
    });
    expect(cache.ttlFor('listTracks')).toBe(3_600_000);
    expect(cache.ttlFor('listAlbums')).toBe(60_000);
});

test('cache: misses return undefined', async () => {
    const cache = makeCache();
    const got = await cache.get('nonexistent-key');
    expect(got).toBeUndefined();
});
