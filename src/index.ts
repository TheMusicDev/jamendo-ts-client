/**
 * jamendo-ts-client — hand-written HTTP client for the Jamendo API v3.0.
 *
 * Only types are exported from here. Runtime zod schemas are internal: the
 * public surface is the client factory, config/error types, and the
 * `z.infer`-derived shapes for each resource.
 */

export type { Client } from './client';
// Client + config
export { createJamendoClient } from './client';
export type { CacheConfig, ClientConfig, RateLimitConfig, RateLimitInfo, ResolvedConfig } from './config';
// Request result + errors
export type { ApiResult, RequestOptions } from './core/request';
// Tracks resource (types only — schemas stay internal)
export type { TracksApi } from './endpoints/tracks';
export {
    errorForCode,
    JamendoError,
    JamendoErrorCode,
    JamendoRateLimit,
    JamendoSchemaError,
} from './errors';
export type {
    MusicInfo,
    SimilarTracksParams,
    Track,
    TracksListParams,
    TrackWithScore,
    Waveform,
} from './schemas/tracks';
export { JAMENDO_CLIENT_VERSION } from './version';
