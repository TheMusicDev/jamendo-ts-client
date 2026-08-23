import { z } from 'zod';

import { UrlOrEmptySchema } from './common';
import { AudioDLFormatSchema, AudioFormatSchema, ImageSizeSchema, ListParamsSchema } from './params';

/**
 * Track resource zod schemas (hand-written from openapi-3.1.yaml `Track`).
 * Strip mode (default `z.object()`): unknown fields dropped, typed fields
 * enforced. Fields depend on the `include` query param, so most are optional;
 * `id` + `name` are the only always-present fields.
 */

const MusicInfoTagsSchema = z.object({
    genres: z.array(z.string()).optional(),
    instruments: z.array(z.string()).optional(),
    vartags: z.array(z.string()).optional(),
});

const MusicInfoSchema = z.object({
    vocalinstrumental: z.string().optional(),
    lang: z.string().optional(),
    gender: z.string().optional(),
    acousticelectric: z.string().optional(),
    speed: z.string().optional(),
    tags: MusicInfoTagsSchema.optional(),
});

// ponytail: Jamendo returns waveform as a JSON-encoded string (e.g.
// '{"peaks": [23, 19, ...]}'), not an object. Schema previously declared it an
// object, which rejected every real tracks.list response. If a typed peaks
// shape is wanted later, wrap with z.preprocess(JSON.parse, WaveformSchema).
const WaveformSchema = z.string();

export const TrackSchema = z.object({
    id: z.string(),
    name: z.string(),
    duration: z.number().int().optional(),
    artist_id: z.string().optional(),
    artist_name: z.string().optional(),
    artist_idstr: z.string().optional(),
    album_name: z.string().optional(),
    album_id: z.string().optional(),
    license_ccurl: UrlOrEmptySchema.optional(),
    position: z.number().int().optional(),
    releasedate: z.string().optional(),
    album_image: UrlOrEmptySchema.optional(),
    audio: UrlOrEmptySchema.optional(),
    audiodownload: UrlOrEmptySchema.optional(),
    prourl: z.string().optional(),
    shorturl: UrlOrEmptySchema.optional(),
    shareurl: UrlOrEmptySchema.optional(),
    waveform: WaveformSchema.optional(),
    image: UrlOrEmptySchema.optional(),
    audiodownload_allowed: z.boolean().optional(),
    content_id_free: z.boolean().optional(),
    musicinfo: MusicInfoSchema.optional(),
});

/** Track with a similarity `score` (0..1), returned by `/tracks/similar`. */
export const TrackWithScoreSchema = TrackSchema.extend({
    score: z.number().min(0).max(1).optional(),
});

export type Track = z.infer<typeof TrackSchema>;
export type TrackWithScore = z.infer<typeof TrackWithScoreSchema>;
export type MusicInfo = z.infer<typeof MusicInfoSchema>;
export type Waveform = z.infer<typeof WaveformSchema>;

/**
 * `/tracks` (listTracks) query params. Every field optional. `order` and
 * array params accept multiple values (serialized as repeated keys).
 */
export const TracksListParamsSchema = ListParamsSchema.extend({
    order: z
        .array(
            z.enum([
                'relevance',
                'buzzrate',
                'downloads_week',
                'downloads_month',
                'downloads_total',
                'listens_week',
                'listens_month',
                'listens_total',
                'popularity_week',
                'popularity_month',
                'popularity_total',
                'name',
                'album_name',
                'artist_name',
                'releasedate',
                'duration',
                'id',
                'relevance_asc',
                'relevance_desc',
                'buzzrate_asc',
                'buzzrate_desc',
                'name_asc',
                'name_desc',
                'releasedate_asc',
                'releasedate_desc',
                'duration_asc',
                'duration_desc',
                'id_asc',
                'id_desc',
            ])
        )
        .optional(),
    id: z.array(z.number().int()).optional(),
    name: z.string().optional(),
    namesearch: z.string().optional(),
    type: z.array(z.enum(['single', 'albumtrack'])).optional(),
    album_id: z.array(z.number().int()).optional(),
    album_name: z.string().optional(),
    artist_id: z.array(z.number().int()).optional(),
    artist_name: z.string().optional(),
    content_id_free: z.boolean().optional(),
    datebetween: z.string().optional(),
    featured: z.enum(['true', '1']).optional(),
    imagesize: ImageSizeSchema.optional(),
    audioformat: AudioFormatSchema.optional(),
    audiodlformat: AudioDLFormatSchema.optional(),
    tags: z.array(z.string()).optional(),
    fuzzytags: z.array(z.string()).optional(),
    acousticelectric: z.enum(['acoustic', 'electric']).optional(),
    vocalinstrumental: z.enum(['vocal', 'instrumental']).optional(),
    gender: z.enum(['male', 'female']).optional(),
    speed: z.array(z.enum(['verylow', 'low', 'medium', 'high', 'veryhigh'])).optional(),
    lang: z.array(z.string().min(2).max(2)).optional(),
    durationbetween: z.string().optional(),
    xartist: z.string().optional(),
    search: z.string().optional(),
    prolicensing: z.boolean().optional(),
    probackground: z.boolean().optional(),
    ccsa: z.boolean().optional(),
    ccnd: z.boolean().optional(),
    ccnc: z.boolean().optional(),
    include: z.array(z.enum(['licenses', 'musicinfo', 'stats', 'lyrics'])).optional(),
    groupby: z.enum(['artist_id', 'album_id']).optional(),
    boost: z
        .enum([
            'buzzrate',
            'downloads_week',
            'downloads_month',
            'downloads_total',
            'listens_week',
            'listens_month',
            'listens_total',
            'popularity_week',
            'popularity_month',
            'popularity_total',
        ])
        .optional(),
});

/** `/tracks/similar` (listSimilarTracks) — `id` required. */
export const SimilarTracksParamsSchema = ListParamsSchema.extend({
    id: z.number().int(),
    no_artist: z.number().int().optional(),
    no_album: z.number().int().optional(),
    imagesize: ImageSizeSchema.optional(),
    audioformat: AudioFormatSchema.optional(),
    audiodlformat: AudioDLFormatSchema.optional(),
    include: z.array(z.enum(['licenses', 'musicinfo', 'stats', 'lyrics'])).optional(),
});

export type TracksListParams = z.infer<typeof TracksListParamsSchema>;
export type SimilarTracksParams = z.infer<typeof SimilarTracksParamsSchema>;
