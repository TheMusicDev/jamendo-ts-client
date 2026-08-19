import type { ApiResult, RequestFn } from '../core/request';
import {
    type Artist,
    type ArtistAlbumsParams,
    ArtistAlbumsParamsSchema,
    type ArtistLocationsParams,
    ArtistLocationsParamsSchema,
    type ArtistMusicInfo,
    ArtistMusicInfoSchema,
    ArtistSchema,
    type ArtistsListParams,
    ArtistsListParamsSchema,
    type ArtistsMusicinfoParams,
    ArtistsMusicinfoParamsSchema,
    type ArtistTracksParams,
    ArtistTracksParamsSchema,
    type ArtistWithAlbums,
    ArtistWithAlbumsSchema,
    type ArtistWithLocations,
    ArtistWithLocationsSchema,
    type ArtistWithTracks,
    ArtistWithTracksSchema,
} from '../schemas/artists';
import { parseParams } from './util';

export interface ArtistsApi {
    /** List artists (`GET /artists`). Cacheable. */
    list(params?: ArtistsListParams): Promise<ApiResult<Artist>>;
    /** List artists with nested tracks (`GET /artists/tracks`). Cacheable. */
    tracks(params?: ArtistTracksParams): Promise<ApiResult<ArtistWithTracks>>;
    /** List artists with nested albums (`GET /artists/albums`). Cacheable. */
    albums(params?: ArtistAlbumsParams): Promise<ApiResult<ArtistWithAlbums>>;
    /** List artists with locations (`GET /artists/locations`). Cacheable. */
    locations(params?: ArtistLocationsParams): Promise<ApiResult<ArtistWithLocations>>;
    /** List artists with music info (`GET /artists/musicinfo`). Cacheable. */
    musicinfo(params?: ArtistsMusicinfoParams): Promise<ApiResult<ArtistMusicInfo>>;
}

export function artists(request: RequestFn): ArtistsApi {
    return {
        list: async (params = {}) =>
            request<Artist>('GET', '/artists', parseParams(ArtistsListParamsSchema, params), {
                opId: 'listArtists',
                schema: ArtistSchema,
                cache: true,
            }),
        tracks: async (params = {}) =>
            request<ArtistWithTracks>('GET', '/artists/tracks', parseParams(ArtistTracksParamsSchema, params), {
                opId: 'listArtistTracks',
                schema: ArtistWithTracksSchema,
                cache: true,
            }),
        albums: async (params = {}) =>
            request<ArtistWithAlbums>('GET', '/artists/albums', parseParams(ArtistAlbumsParamsSchema, params), {
                opId: 'listArtistAlbums',
                schema: ArtistWithAlbumsSchema,
                cache: true,
            }),
        locations: async (params = {}) =>
            request<ArtistWithLocations>(
                'GET',
                '/artists/locations',
                parseParams(ArtistLocationsParamsSchema, params),
                {
                    opId: 'listArtistLocations',
                    schema: ArtistWithLocationsSchema,
                    cache: true,
                }
            ),
        musicinfo: async (params = {}) =>
            request<ArtistMusicInfo>('GET', '/artists/musicinfo', parseParams(ArtistsMusicinfoParamsSchema, params), {
                opId: 'listArtistsMusicinfo',
                schema: ArtistMusicInfoSchema,
                cache: true,
            }),
    };
}
