import type { z } from 'zod';
import type { Cache } from './cache';
import { parseEnvelope } from './envelope';
import type { Fetcher } from './fetcher';
import type { RetryFn } from './rateLimit';
import { validateResults, validateResultsAs } from './validate';

export interface RequestOptions<T, R = T[]> {
    /** Endpoint id, used for cache TTL lookup and error context. */
    opId: string;
    /**
     * Element schema; each entry in `results` is validated against this on the
     * standard array path. Ignored when `resultsSchema` is set.
     */
    schema: z.ZodType<T>;
    /**
     * Whole-`results` schema for endpoints that do not return the standard
     * array envelope (e.g. `/autocomplete`, keyed by entity). When set,
     * `results` is validated as `R` directly instead of `T[]`.
     */
    resultsSchema?: z.ZodType<R>;
    /** Whether this op may read/write the cache (GET-only in practice). */
    cache: boolean;
}

export interface ApiResult<T, R = T[]> {
    results: R;
    warnings: string;
    resultsCount?: number;
    resultsFullcount?: number;
}

type Runner = <T>(fn: RetryFn<T>) => Promise<T>;

/**
 * The public request entry point endpoint modules build on.
 *
 * Overloaded so a non-default `R` (whole-results shape, e.g. `/autocomplete`)
 * can only be requested together with `resultsSchema`. Without `resultsSchema`
 * the caller is bound to the standard array path `R = T[]`, which is the only
 * branch that validates element-wise — this keeps the internal `as unknown as
 * R` cast sound (R is T[] there) instead of letting a caller assert an object
 * shape while the runtime still validates an array.
 */
export interface RequestFn {
    <T>(
        method: 'GET' | 'POST',
        path: string,
        params: Record<string, unknown>,
        options: RequestOptions<T, T[]>
    ): Promise<ApiResult<T, T[]>>;
    <T, R>(
        method: 'GET' | 'POST',
        path: string,
        params: Record<string, unknown>,
        options: RequestOptions<T, R> & { resultsSchema: z.ZodType<R> }
    ): Promise<ApiResult<T, R>>;
}

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
    return async function request<T, R = T[]>(
        method: 'GET' | 'POST',
        path: string,
        params: Record<string, unknown>,
        options: RequestOptions<T, R>
    ): Promise<ApiResult<T, R>> {
        const { opId, schema, resultsSchema, cache: useCache } = options;
        const key = useCache && cache ? cache.keyFor(method, path, params) : null;

        if (key && cache) {
            const hit = await cache.get<R>(key);
            if (hit) {
                return hit;
            }
        }

        const result = await run(async () => {
            const raw = await fetcher(method, path, params);
            const env = parseEnvelope(raw, opId);
            // Array path (default) vs whole-results path (/autocomplete). The
            // cast is sound: without resultsSchema, R defaults to T[].
            const results = resultsSchema
                ? validateResultsAs<R>(env.results, resultsSchema, opId)
                : (validateResults<T>(env.results, schema, opId) as unknown as R);
            return {
                results,
                warnings: env.warnings,
                resultsCount: env.resultsCount,
                resultsFullcount: env.resultsFullcount,
            } satisfies ApiResult<T, R>;
        });

        if (key && cache) {
            await cache.set(key, result, cache.ttlFor(opId));
        }
        return result;
    };
}
