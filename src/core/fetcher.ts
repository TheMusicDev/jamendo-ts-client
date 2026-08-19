import { type $Fetch, ofetch } from 'ofetch';

import type { ResolvedConfig } from '../config';

/**
 * Low-level fetcher built around ofetch. ofetch gives baseURL, query
 * serialization, timeout, and JSON parsing. The custom `fetch` is injected via
 * `ofetch.create(_, { fetch })` (the per-call options don't accept it).
 *
 * Jamendo is "RESTlike": even POST writes take their parameters as query
 * params, so params always go via `query` regardless of method. `format=json`
 * is hardcoded — the client only returns parsed objects. `retry: 0` disables
 * ofetch's HTTP retry (Jamendo rate limits are envelope-level code 6, not 429;
 * retries are handled by p-retry in `core/rateLimit.ts`).
 */
export type Fetcher = (method: 'GET' | 'POST', path: string, params?: Record<string, unknown>) => Promise<unknown>;

export function createFetcher(config: ResolvedConfig): Fetcher {
    const $fetch: $Fetch = ofetch.create(
        { baseURL: config.baseUrl, timeout: config.timeoutMs, retry: 0 },
        { fetch: config.fetch }
    );

    return async (method, path, params = {}) => {
        const query: Record<string, unknown> = {
            ...params,
            client_id: config.clientId,
            format: 'json',
        };
        if (config.accessToken) {
            query.access_token = config.accessToken;
        }
        return $fetch(path, { method, query, responseType: 'json' });
    };
}
