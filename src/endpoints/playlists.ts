import type { ApiResult, RequestFn } from '../core/request';
import {
    type Playlist,
    PlaylistSchema,
    type PlaylistsListParams,
    PlaylistsListParamsSchema,
    type PlaylistTracksParams,
    PlaylistTracksParamsSchema,
    type PlaylistWithTracks,
    PlaylistWithTracksSchema,
} from '../schemas/playlists';
import { parseParams } from './util';

export interface PlaylistsApi {
    /** List playlists (`GET /playlists`). Cacheable. */
    list(params?: PlaylistsListParams): Promise<ApiResult<Playlist>>;
    /** List playlists with nested tracks (`GET /playlists/tracks`). Cacheable. */
    tracks(params?: PlaylistTracksParams): Promise<ApiResult<PlaylistWithTracks>>;
}

export function playlists(request: RequestFn): PlaylistsApi {
    return {
        list: async (params = {}) =>
            request<Playlist>('GET', '/playlists', parseParams(PlaylistsListParamsSchema, params), {
                opId: 'listPlaylists',
                schema: PlaylistSchema,
                cache: true,
            }),
        tracks: async (params = {}) =>
            request<PlaylistWithTracks>('GET', '/playlists/tracks', parseParams(PlaylistTracksParamsSchema, params), {
                opId: 'listPlaylistTracks',
                schema: PlaylistWithTracksSchema,
                cache: true,
            }),
    };
}
