/**
 * @themusicdev/jamendo-ts-client — hand-written HTTP client for the Jamendo API v3.0.
 *
 * Only types are exported from here. Runtime zod schemas are internal: the
 * public surface is the client factory, config/error types, and the
 * `z.infer`-derived shapes for each resource.
 */

export type { Client } from './client';
// Client + config
export { createJamendoClient } from './client';
export type { CacheConfig, ClientConfig, RateLimitConfig, RateLimitInfo, ResolvedConfig } from './config';
// Redirect fetch result (302 file/stream endpoints)
export type { RedirectResult } from './core/redirect';
// Request result + errors
export type { ApiResult, RequestOptions } from './core/request';
// Albums resource (types only — schemas stay internal)
export type { AlbumsApi } from './endpoints/albums';
// Artists resource
export type { ArtistsApi } from './endpoints/artists';
// Autocomplete resource
export type { AutocompleteApi } from './endpoints/autocomplete';
// Feeds resource
export type { FeedsApi } from './endpoints/feeds';
// Playlists resource
export type { PlaylistsApi } from './endpoints/playlists';
// Radios resource
export type { RadiosApi } from './endpoints/radios';
// Reviews resource
export type { ReviewsApi } from './endpoints/reviews';
// Tracks resource
export type { TracksApi } from './endpoints/tracks';
export {
    errorForCode,
    JamendoError,
    JamendoErrorCode,
    JamendoHttpError,
    JamendoRateLimit,
    JamendoSchemaError,
} from './errors';
export type {
    Album,
    AlbumMusicInfo,
    AlbumsListParams,
    AlbumsMusicinfoParams,
    AlbumTrackItem,
    AlbumTracksParams,
    AlbumWithTracks,
} from './schemas/albums';
export type {
    Artist,
    ArtistAlbumItem,
    ArtistAlbumsParams,
    ArtistLocation,
    ArtistLocationsParams,
    ArtistMusicInfo,
    ArtistsListParams,
    ArtistsMusicinfoParams,
    ArtistTrackItem,
    ArtistTracksParams,
    ArtistWithAlbums,
    ArtistWithLocations,
    ArtistWithTracks,
} from './schemas/artists';
export type {
    AutocompleteMatch,
    AutocompleteParams,
    AutocompleteResults,
} from './schemas/autocomplete';
// Shared
export type { LocalizedText } from './schemas/common';
export type { Feed, FeedImages, FeedsListParams } from './schemas/feeds';
export type {
    Playlist,
    PlaylistsListParams,
    PlaylistTracksParams,
    PlaylistWithTracks,
} from './schemas/playlists';
export type { Radio, RadioPlayingNow, RadioStream, RadioStreamParams, RadiosListParams } from './schemas/radios';
export type { AlbumReview, AlbumReviewsParams, TrackReview, TrackReviewsParams } from './schemas/reviews';
export type {
    MusicInfo,
    SimilarTracksParams,
    Track,
    TracksListParams,
    TrackWithScore,
    Waveform,
} from './schemas/tracks';
export { JAMENDO_CLIENT_VERSION } from './version';
