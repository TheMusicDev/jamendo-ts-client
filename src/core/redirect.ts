import { type $Fetch, ofetch } from 'ofetch';

import type { ResolvedConfig } from '../config';
import { JamendoHttpError } from '../errors';

/**
 * Result of a redirect fetch: the file URL the server 302-redirected to.
 * The caller decides whether to stream or download from `url`.
 */
export interface RedirectResult {
    url: string;
}

/**
 * Fetcher for the 302 binary-redirect endpoints (`/tracks/file`, `/albums/file`,
 * `/playlists/file`). These do NOT use the JSON envelope: no `parseEnvelope`,
 * no zod, no cache, no retry chain. The server responds 302 with a `Location`
 * header = the file URL; 404/500 are plain HTTP errors.
 *
 * Uses ofetch with `redirect: 'manual'` so the 302 is returned unfollowed, then
 * reads the `Location` header. `ignoreResponseError` keeps ofetch from throwing
 * on 404/500 so we can surface a typed {@link JamendoHttpError} with the status.
 */
export type RedirectFetcher = (
    method: 'GET',
    path: string,
    params?: Record<string, unknown>
) => Promise<RedirectResult>;

export function createRedirectFetcher(config: ResolvedConfig): RedirectFetcher {
    const $fetch: $Fetch = ofetch.create(
        {
            baseURL: config.baseUrl,
            timeout: config.timeoutMs,
            retry: 0,
            redirect: 'manual',
            responseType: 'json',
        },
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

        const response = await $fetch.raw(path, { method, query, ignoreResponseError: true });

        if (response.status !== 302) {
            throw new JamendoHttpError(response.status);
        }

        const url = response.headers.get('location');
        if (!url) {
            throw new JamendoHttpError(302, 'Redirect response missing Location header');
        }
        return { url };
    };
}
