import type { z } from 'zod';
import type { Cache } from './cache';
import { parseEnvelope } from './envelope';
import type { Fetcher } from './fetcher';
import type { RetryFn } from './rateLimit';
import { validateResults } from './validate';

export interface RequestOptions<T> {
    /** Endpoint id, used for cache TTL lookup and error context. */
    opId: string;
    /** Element schema; each entry in `results` is validated against this. */
    schema: z.ZodType<T>;
    /** Whether this op may read/write the cache (GET-only in practice). */
    cache: boolean;
}

export interface ApiResult<T> {
    results: T[];
    warnings: string;
    resultsCount?: number;
    resultsFullcount?: number;
}

type Runner = <T>(fn: RetryFn<T>) => Promise<T>;

/**
 * Request orchestrator. Composes the layers a single API call flows through:
 *
 *   cache.get → (fetcher → envelope → validate) under p-retry → cache.set
 *
 * On a cache hit the validated entry is returned without dispatching. On a
 * miss, the fetch→parse→validate chain runs inside the rate limiter's `run`,
 * so JamendoRateLimit (envelope code 6) retries and everything else aborts.
 * Only a successful result is written back to the cache.
 */
export function createRequest(fetcher: Fetcher, cache: Cache | null, run: Runner) {
    return async function request<T>(
        method: 'GET' | 'POST',
        path: string,
        params: Record<string, unknown>,
        options: RequestOptions<T>
    ): Promise<ApiResult<T>> {
        const { opId, schema, cache: useCache } = options;
        const key = useCache && cache ? cache.keyFor(method, path, params) : null;

        if (key && cache) {
            const hit = await cache.get<T>(key);
            if (hit) {
                return hit;
            }
        }

        const result = await run(async () => {
            const raw = await fetcher(method, path, params);
            const env = parseEnvelope(raw, opId);
            const results = validateResults(env.results, schema, opId);
            return {
                results,
                warnings: env.warnings,
                resultsCount: env.resultsCount,
                resultsFullcount: env.resultsFullcount,
            } satisfies ApiResult<T>;
        });

        if (key && cache) {
            await cache.set(key, result, cache.ttlFor(opId));
        }
        return result;
    };
}
