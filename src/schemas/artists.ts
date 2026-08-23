import { z } from 'zod';

import { LocalizedTextSchema, UrlOrEmptySchema } from './common';
import { AudioDLFormatSchema, AudioFormatSchema, ImageSizeSchema, ListParamsSchema } from './params';

/**
 * Artist resource zod schemas (hand-written from openapi-3.1.yaml `Artist`,
 * `ArtistTrackItem`, `ArtistAlbumItem`, `ArtistLocation`,
 * `ArtistWithTracks`, `ArtistWithAlbums`, `ArtistWithLocations`,
 * `ArtistMusicInfo`). Strip mode: unknown fields dropped, typed fields
 * enforced. `id` + `name` are the only always-present fields.
 */

export const ArtistSchema = z.object({
    id: z.string(),
    name: z.string(),
    website: UrlOrEmptySchema.optional(),
    joindate: z.string().optional(),
    image: UrlOrEmptySchema.optional(),
    shorturl: UrlOrEmptySchema.optional(),
    shareurl: UrlOrEmptySchema.optional(),
});

/** Nested track as it appears inside an artist (`/artists/tracks`). */
const ArtistTrackItemSchema = z.object({
    album_id: z.string().optional(),
    album_name: z.string().optional(),
    id: z.string().optional(),
    name: z.string().optional(),
    duration: z.string().optional(),
    releasedate: z.string().optional(),
    license_ccurl: UrlOrEmptySchema.optional(),
    album_image: UrlOrEmptySchema.optional(),
    image: UrlOrEmptySchema.optional(),
    audio: UrlOrEmptySchema.optional(),
    audiodownload: UrlOrEmptySchema.optional(),
    audiodownload_allowed: z.boolean().optional(),
});

/** Nested album as it appears inside an artist (`/artists/albums`). */
const ArtistAlbumItemSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    releasedate: z.string().optional(),
    image: UrlOrEmptySchema.optional(),
});

/** Geographic location entry (`/artists/locations`). */
const ArtistLocationSchema = z.object({
    id: z.string().optional(),
    longitude: z.string().optional(),
    latitude: z.string().optional(),
    country: z.string().optional(),
    city: z.string().optional(),
});

export const ArtistWithTracksSchema = ArtistSchema.extend({
    tracks: z.array(ArtistTrackItemSchema).optional(),
});

export const ArtistWithAlbumsSchema = ArtistSchema.extend({
    albums: z.array(ArtistAlbumItemSchema).optional(),
});

export const ArtistWithLocationsSchema = ArtistSchema.extend({
    locations: z.array(ArtistLocationSchema).optional(),
});

export const ArtistMusicInfoSchema = ArtistSchema.extend({
    musicinfo: z
        .object({
            tags: z.array(z.string()).optional(),
            description: LocalizedTextSchema.optional(),
        })
        .optional(),
});

export type Artist = z.infer<typeof ArtistSchema>;
export type ArtistTrackItem = z.infer<typeof ArtistTrackItemSchema>;
export type ArtistAlbumItem = z.infer<typeof ArtistAlbumItemSchema>;
export type ArtistLocation = z.infer<typeof ArtistLocationSchema>;
export type ArtistWithTracks = z.infer<typeof ArtistWithTracksSchema>;
export type ArtistWithAlbums = z.infer<typeof ArtistWithAlbumsSchema>;
export type ArtistWithLocations = z.infer<typeof ArtistWithLocationsSchema>;
export type ArtistMusicInfo = z.infer<typeof ArtistMusicInfoSchema>;

/** Shared base for `/artists` family list params. */
const ArtistsBaseParamsSchema = ListParamsSchema.extend({
    order: z
        .array(z.enum(['name', 'id', 'joindate', 'popularity_total', 'popularity_month', 'popularity_week']))
        .optional(),
    id: z.array(z.number().int()).optional(),
    name: z.string().optional(),
    namesearch: z.string().optional(),
    hasimage: z.enum(['true', '1']).optional(),
    datebetween: z.string().optional(),
});

/** `/artists` (listArtists) query params. */
export const ArtistsListParamsSchema = ArtistsBaseParamsSchema;

/** `/artists/tracks` (listArtistTracks) query params. */
export const ArtistTracksParamsSchema = ArtistsBaseParamsSchema.extend({
    order: z
        .array(
            z.enum([
                'name',
                'id',
                'joindate',
                'popularity_total',
                'popularity_month',
                'popularity_week',
                'track_name',
                'track_id',
                'track_releasedate',
            ])
        )
        .optional(),
    track_id: z.array(z.number().int()).optional(),
    track_name: z.string().optional(),
    track_type: z.array(z.enum(['single', 'albumtrack'])).optional(),
    album_datebetween: z.string().optional(),
    album_id: z.array(z.number().int()).optional(),
    album_name: z.string().optional(),
    imagesize: ImageSizeSchema.optional(),
    audioformat: AudioFormatSchema.optional(),
    audiodlformat: AudioDLFormatSchema.optional(),
});

/** `/artists/albums` (listArtistAlbums) query params. */
export const ArtistAlbumsParamsSchema = ArtistsBaseParamsSchema.extend({
    order: z
        .array(
            z.enum([
                'name',
                'id',
                'joindate',
                'popularity_total',
                'popularity_month',
                'popularity_week',
                'album_name',
                'album_id',
                'album_releasedate',
            ])
        )
        .optional(),
    album_id: z.array(z.number().int()).optional(),
    album_name: z.string().optional(),
    album_datebetween: z.string().optional(),
    imagesize: ImageSizeSchema.optional(),
});

/** `/artists/locations` (listArtistLocations) query params. */
export const ArtistLocationsParamsSchema = ArtistsBaseParamsSchema.extend({
    haslocation: z.boolean().optional(),
    location_country: z.array(z.string().min(3).max(3)).optional(),
    location_city: z.string().optional(),
    location_coords: z.string().optional(),
    location_radius: z.number().int().optional(),
});

/** `/artists/musicinfo` (listArtistsMusicinfo) query params. */
export const ArtistsMusicinfoParamsSchema = ArtistsBaseParamsSchema.extend({
    tag: z.string().optional(),
});

export type ArtistsListParams = z.infer<typeof ArtistsListParamsSchema>;
export type ArtistTracksParams = z.infer<typeof ArtistTracksParamsSchema>;
export type ArtistAlbumsParams = z.infer<typeof ArtistAlbumsParamsSchema>;
export type ArtistLocationsParams = z.infer<typeof ArtistLocationsParamsSchema>;
export type ArtistsMusicinfoParams = z.infer<typeof ArtistsMusicinfoParamsSchema>;
