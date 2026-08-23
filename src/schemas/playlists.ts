import { z } from 'zod';

import { AlbumTrackItemSchema } from './albums';
import { UrlOrEmptySchema } from './common';
import { AudioDLFormatSchema, AudioFormatSchema, ImageSizeSchema, ListParamsSchema } from './params';

/**
 * Playlist resource zod schemas (hand-written from openapi-3.1.yaml `Playlist`,
 * `PlaylistTrackItem`, `PlaylistWithTracks`). Strip mode: unknown fields
 * dropped, typed fields enforced. `id` + `name` are the only always-present
 * fields.
 *
 * `PlaylistTrackItem` is the same shape as `AlbumTrackItem` (spec uses
 * `allOf`), so we reuse that schema rather than duplicate it.
 */

export const PlaylistSchema = z.object({
    id: z.string(),
    name: z.string(),
    creationdate: z.string().optional(),
    user_id: z.string().optional(),
    user_name: z.string().optional(),
    zip: UrlOrEmptySchema.optional(),
    shorturl: UrlOrEmptySchema.optional(),
    shareurl: UrlOrEmptySchema.optional(),
});

/** Playlist with nested tracks, returned by `/playlists/tracks`. */
export const PlaylistWithTracksSchema = PlaylistSchema.extend({
    tracks: z.array(AlbumTrackItemSchema).optional(),
});

export type Playlist = z.infer<typeof PlaylistSchema>;
export type PlaylistWithTracks = z.infer<typeof PlaylistWithTracksSchema>;

/**
 * `/playlists` (listPlaylists) query params. `audioformat` restricted to `mp32`
 * per the spec. `access_token` is intentionally absent — the fetcher injects
 * it from config, so it is never part of an endpoint's params.
 */
export const PlaylistsListParamsSchema = ListParamsSchema.extend({
    order: z.array(z.enum(['name', 'id', 'creationdate'])).optional(),
    id: z.array(z.number().int()).optional(),
    name: z.string().optional(),
    namesearch: z.string().optional(),
    user_id: z.array(z.number().int()).optional(),
    user_name: z.string().optional(),
    datebetween: z.string().optional(),
    audioformat: z.enum(['mp32']).optional(),
});

/**
 * `/playlists/tracks` (listPlaylistTracks) query params. `audioformat` here
 * accepts the full set; adds `track_*` filters, `positionbetween`
 * (`int_int`), and `audiodlformat`.
 */
export const PlaylistTracksParamsSchema = ListParamsSchema.extend({
    order: z
        .array(z.enum(['name', 'id', 'creationdate', 'track_id', 'track_name', 'track_added_date', 'track_position']))
        .optional(),
    id: z.array(z.number().int()).optional(),
    name: z.string().optional(),
    namesearch: z.string().optional(),
    user_id: z.array(z.number().int()).optional(),
    user_name: z.string().optional(),
    datebetween: z.string().optional(),
    audioformat: AudioFormatSchema.optional(),
    track_type: z.array(z.enum(['single', 'albumtrack'])).optional(),
    imagesize: ImageSizeSchema.optional(),
    positionbetween: z.string().optional(),
    audiodlformat: AudioDLFormatSchema.optional(),
});

export type PlaylistsListParams = z.infer<typeof PlaylistsListParamsSchema>;
export type PlaylistTracksParams = z.infer<typeof PlaylistTracksParamsSchema>;
