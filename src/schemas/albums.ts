import { z } from 'zod';

import { LocalizedTextSchema } from './common';
import { AudioDLFormatSchema, AudioFormatSchema, ImageSizeSchema, ListParamsSchema } from './params';

/**
 * Album resource zod schemas (hand-written from openapi-3.1.yaml `Album`,
 * `AlbumTrackItem`, `AlbumWithTracks`, `AlbumMusicInfo`). Strip mode: unknown
 * fields dropped, typed fields enforced. Fields depend on the `include`
 * query param, so most are optional; `id` + `name` are the only always-present
 * fields.
 */

export const AlbumSchema = z.object({
    id: z.string(),
    name: z.string(),
    releasedate: z.string().optional(),
    artist_id: z.string().optional(),
    artist_name: z.string().optional(),
    image: z.string().url().optional(),
    zip: z.string().url().optional(),
    zip_allowed: z.boolean().optional(),
    shorturl: z.string().url().optional(),
    shareurl: z.string().url().optional(),
});

/**
 * Nested track as it appears inside an album (`/albums/tracks`,
 * `/playlists/tracks`). Unlike a standalone `Track`, these fields are all
 * strings — `position`, `duration`, `count` are not coerced to numbers by
 * the API.
 */
export const AlbumTrackItemSchema = z.object({
    count: z.string().optional(),
    id: z.string().optional(),
    position: z.string().optional(),
    name: z.string().optional(),
    duration: z.string().optional(),
    license_ccurl: z.string().url().optional(),
    audio: z.string().url().optional(),
    audiodownload: z.string().url().optional(),
    audiodownload_allowed: z.boolean().optional(),
});

/** Album with nested tracks, returned by `/albums/tracks`. */
export const AlbumWithTracksSchema = AlbumSchema.extend({
    tracks: z.array(AlbumTrackItemSchema).optional(),
});

/** Album music info: tags + localized description, returned by `/albums/musicinfo`. */
export const AlbumMusicInfoSchema = AlbumSchema.extend({
    musicinfo: z
        .object({
            tags: z.array(z.string()).optional(),
            description: LocalizedTextSchema.optional(),
        })
        .optional(),
});

export type Album = z.infer<typeof AlbumSchema>;
export type AlbumTrackItem = z.infer<typeof AlbumTrackItemSchema>;
export type AlbumWithTracks = z.infer<typeof AlbumWithTracksSchema>;
export type AlbumMusicInfo = z.infer<typeof AlbumMusicInfoSchema>;

/**
 * `/albums` (listAlbums) query params. `audioformat` is restricted to `mp32`
 * per the spec; `imagesize` accepts any int (spec enumerates 17 sizes).
 */
export const AlbumsListParamsSchema = ListParamsSchema.extend({
    order: z
        .array(
            z.enum([
                'name',
                'id',
                'releasedate',
                'artist_id',
                'artist_name',
                'popularity_total',
                'popularity_month',
                'popularity_week',
            ])
        )
        .optional(),
    id: z.array(z.number().int()).optional(),
    name: z.string().optional(),
    namesearch: z.string().optional(),
    artist_id: z.array(z.number().int()).optional(),
    artist_name: z.string().optional(),
    datebetween: z.string().optional(),
    imagesize: ImageSizeSchema.optional(),
    audioformat: z.enum(['mp32']).optional(),
    type: z.array(z.enum(['single', 'album'])).optional(),
});

/**
 * `/albums/tracks` (listAlbumTracks) query params. `audioformat` here accepts
 * the full set (mp31/mp32/ogg/flac); adds `track_*` filters + `audiodlformat`.
 */
export const AlbumTracksParamsSchema = ListParamsSchema.extend({
    order: z
        .array(
            z.enum([
                'name',
                'id',
                'releasedate',
                'artist_id',
                'artist_name',
                'popularity_total',
                'popularity_month',
                'popularity_week',
                'track_id',
                'track_name',
                'track_position',
            ])
        )
        .optional(),
    id: z.array(z.number().int()).optional(),
    name: z.string().optional(),
    namesearch: z.string().optional(),
    artist_id: z.array(z.number().int()).optional(),
    artist_name: z.string().optional(),
    datebetween: z.string().optional(),
    imagesize: ImageSizeSchema.optional(),
    audioformat: AudioFormatSchema.optional(),
    audiodlformat: AudioDLFormatSchema.optional(),
    type: z.array(z.enum(['single', 'album'])).optional(),
    track_id: z.array(z.number().int()).optional(),
    track_name: z.string().optional(),
});

/**
 * `/albums/musicinfo` (listAlbumsMusicinfo) query params. Same as `/albums`
 * plus a single `tag` filter; `audioformat` restricted to `mp32`.
 */
export const AlbumsMusicinfoParamsSchema = ListParamsSchema.extend({
    order: z
        .array(
            z.enum([
                'name',
                'id',
                'releasedate',
                'artist_id',
                'artist_name',
                'popularity_total',
                'popularity_month',
                'popularity_week',
            ])
        )
        .optional(),
    id: z.array(z.number().int()).optional(),
    name: z.string().optional(),
    namesearch: z.string().optional(),
    artist_id: z.array(z.number().int()).optional(),
    artist_name: z.string().optional(),
    datebetween: z.string().optional(),
    imagesize: ImageSizeSchema.optional(),
    audioformat: z.enum(['mp32']).optional(),
    type: z.array(z.enum(['single', 'album'])).optional(),
    tag: z.string().optional(),
});

export type AlbumsListParams = z.infer<typeof AlbumsListParamsSchema>;
export type AlbumTracksParams = z.infer<typeof AlbumTracksParamsSchema>;
export type AlbumsMusicinfoParams = z.infer<typeof AlbumsMusicinfoParamsSchema>;
