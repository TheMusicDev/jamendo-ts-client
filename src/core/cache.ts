import { createHash } from 'node:crypto';

import { Keyv } from 'keyv';

import type { ResolvedConfig } from '../config';

/** What we cache: the validated, stripped results container + envelope metadata. */
export interface CacheEntry<R> {
    results: R;
    warnings: string;
    resultsCount?: number;
    resultsFullcount?: number;
}

export interface Cache {
    /** Build a stable cache key for a request. */
    keyFor(method: string, path: string, params: Record<string, unknown>): string;
    /** TTL (ms) for an endpoint, resolving per-endpoint overrides. */
    ttlFor(opId: string): number;
    get<R>(key: string): Promise<CacheEntry<R> | undefined>;
    set<R>(key: string, entry: CacheEntry<R>, ttlMs: number): Promise<void>;
}

/** Deterministic query string so identical params in any order share a key. */
function stableQuery(params: Record<string, unknown>): string {
    return Object.keys(params)
        .sort()
        .map((k) => `${k}=${JSON.stringify(params[k])}`)
        .join('&');
}

export function createCache(config: ResolvedConfig): Cache | null {
    if (!config.cache.enabled) {
        return null;
    }

    const tokenHash = config.accessToken
        ? createHash('sha1').update(config.accessToken).digest('hex').slice(0, 16)
        : '';
    // Keyv accepts a store, a Map, an options object, or a URI string at runtime;
    // its types omit the string form, so cast to the constructor's first param.
    const keyv = new Keyv(config.cache.store as ConstructorParameters<typeof Keyv>[0], {
        namespace: 'jamendo-ts-client',
    });

    return {
        keyFor(method, path, params) {
            // Include baseUrl + clientId so two clients sharing a persistent
            // store (different app or API origin) never resolve to each other's
            // cached entries.
            return createHash('sha1')
                .update(`${config.baseUrl}:${config.clientId}:${method}:${path}:${stableQuery(params)}:${tokenHash}`)
                .digest('hex');
        },

        ttlFor(opId) {
            return config.cache.ttlByEndpoint[opId] ?? config.cache.defaultTtlMs;
        },

        async get<R>(key: string): Promise<CacheEntry<R> | undefined> {
            // Cache is type-erased storage; we store validated entries and trust the
            // caller's R matches the schema that produced the entry.
            return keyv.get<CacheEntry<unknown>>(key) as Promise<CacheEntry<R> | undefined>;
        },

        async set<R>(key: string, entry: CacheEntry<R>, ttlMs: number): Promise<void> {
            await keyv.set(key, entry, ttlMs);
        },
    };
}
