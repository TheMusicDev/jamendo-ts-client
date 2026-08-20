import type { z } from 'zod';
import { type ClientConfig, resolveConfig } from './config';
import { createCache } from './core/cache';
import { createFetcher } from './core/fetcher';
import { createRateLimiter } from './core/rateLimit';
import { createRedirectFetcher, type RedirectResult } from './core/redirect';
import { type ApiResult, createRequest, type RequestFn, type RequestOptions } from './core/request';
import { type AlbumsApi, albums } from './endpoints/albums';
import { type ArtistsApi, artists } from './endpoints/artists';
import { type AutocompleteApi, autocomplete } from './endpoints/autocomplete';
import { type FeedsApi, feeds } from './endpoints/feeds';
import { type PlaylistsApi, playlists } from './endpoints/playlists';
import { type RadiosApi, radios } from './endpoints/radios';
import { type ReviewsApi, reviews } from './endpoints/reviews';
import { type TracksApi, tracks } from './endpoints/tracks';

export interface Client {
    request<T>(
        method: 'GET' | 'POST',
        path: string,
        params: Record<string, unknown>,
        options: RequestOptions<T, T[]>
    ): Promise<ApiResult<T, T[]>>;
    request<T, R>(
        method: 'GET' | 'POST',
        path: string,
        params: Record<string, unknown>,
        options: RequestOptions<T, R> & { resultsSchema: z.ZodType<R> }
    ): Promise<ApiResult<T, R>>;
    /**
     * Fetch a 302 binary-redirect endpoint (`/tracks/file`, `/albums/file`,
     * `/playlists/file`). Bypasses the envelope/cache/retry chain — returns
     * the file URL from the `Location` header. Throws {@link JamendoHttpError}
     * on 404/500.
     */
    requestRedirect(method: 'GET', path: string, params: Record<string, unknown>): Promise<RedirectResult>;
    albums: AlbumsApi;
    artists: ArtistsApi;
    autocomplete: AutocompleteApi;
    feeds: FeedsApi;
    playlists: PlaylistsApi;
    radios: RadiosApi;
    reviews: ReviewsApi;
    tracks: TracksApi;
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
    const request: RequestFn = createRequest(fetcher, cache, run);
    const requestRedirect = createRedirectFetcher(resolved);
    return {
        request,
        requestRedirect,
        albums: albums(request),
        artists: artists(request),
        autocomplete: autocomplete(request),
        feeds: feeds(request),
        playlists: playlists(request),
        radios: radios(request),
        reviews: reviews(request),
        tracks: tracks(request),
    };
}
