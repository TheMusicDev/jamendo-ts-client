import { type ClientConfig, resolveConfig } from './config';
import { createCache } from './core/cache';
import { createFetcher } from './core/fetcher';
import { createRateLimiter } from './core/rateLimit';
import { type ApiResult, createRequest, type RequestOptions } from './core/request';

export interface Client {
    request<T>(
        method: 'GET' | 'POST',
        path: string,
        params: Record<string, unknown>,
        options: RequestOptions<T>
    ): Promise<ApiResult<T>>;
}

/**
 * Build a Jamendo API client. Composes the config, fetcher, cache, and
 * rate limiter into a single `request` entry point that endpoint modules
 * build on. `createJamendoClient({ clientId })` works with all defaults.
 */
export function createJamendoClient(config: ClientConfig): Client {
    const resolved = resolveConfig(config);
    const fetcher = createFetcher(resolved);
    const cache = createCache(resolved);
    const { run } = createRateLimiter(resolved);
    const request = createRequest(fetcher, cache, run);
    return { request };
}
