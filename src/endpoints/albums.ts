import type { ApiResult, RequestFn } from '../core/request';
import {
    type Album,
    type AlbumMusicInfo,
    AlbumMusicInfoSchema,
    AlbumSchema,
    type AlbumsListParams,
    AlbumsListParamsSchema,
    type AlbumsMusicinfoParams,
    AlbumsMusicinfoParamsSchema,
    type AlbumTracksParams,
    AlbumTracksParamsSchema,
    type AlbumWithTracks,
    AlbumWithTracksSchema,
} from '../schemas/albums';
import { parseParams } from './util';

export interface AlbumsApi {
    /** List albums (`GET /albums`). Cacheable. */
    list(params?: AlbumsListParams): Promise<ApiResult<Album>>;
    /** List albums with nested tracks (`GET /albums/tracks`). Cacheable. */
    tracks(params?: AlbumTracksParams): Promise<ApiResult<AlbumWithTracks>>;
    /** List albums with music info (`GET /albums/musicinfo`). Cacheable. */
    musicinfo(params?: AlbumsMusicinfoParams): Promise<ApiResult<AlbumMusicInfo>>;
}

export function albums(request: RequestFn): AlbumsApi {
    return {
        list: async (params = {}) =>
            request<Album>('GET', '/albums', parseParams(AlbumsListParamsSchema, params), {
                opId: 'listAlbums',
                schema: AlbumSchema,
                cache: true,
            }),
        tracks: async (params = {}) =>
            request<AlbumWithTracks>('GET', '/albums/tracks', parseParams(AlbumTracksParamsSchema, params), {
                opId: 'listAlbumTracks',
                schema: AlbumWithTracksSchema,
                cache: true,
            }),
        musicinfo: async (params = {}) =>
            request<AlbumMusicInfo>('GET', '/albums/musicinfo', parseParams(AlbumsMusicinfoParamsSchema, params), {
                opId: 'listAlbumsMusicinfo',
                schema: AlbumMusicInfoSchema,
                cache: true,
            }),
    };
}
