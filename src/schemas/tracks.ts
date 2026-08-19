import { z } from 'zod';

/**
 * Track resource zod schemas (hand-written from openapi-3.1.yaml `Track`).
 * Strip mode (default `z.object()`): unknown fields dropped, typed fields
 * enforced. Fields depend on the `include` query param, so most are optional;
 * `id` + `name` are the only always-present fields.
 */

export const MusicInfoTagsSchema = z.object({
    genres: z.array(z.string()).optional(),
    instruments: z.array(z.string()).optional(),
    vartags: z.array(z.string()).optional(),
});

export const MusicInfoSchema = z.object({
    vocalinstrumental: z.string().optional(),
    lang: z.string().optional(),
    gender: z.string().optional(),
    acousticelectric: z.string().optional(),
    speed: z.string().optional(),
    tags: MusicInfoTagsSchema.optional(),
});

export const WaveformSchema = z.object({
    peaks: z.array(z.number().int()).optional(),
});

export const TrackSchema = z.object({
    id: z.string(),
    name: z.string(),
    duration: z.number().int().optional(),
    artist_id: z.string().optional(),
    artist_name: z.string().optional(),
    artist_idstr: z.string().optional(),
    album_name: z.string().optional(),
    album_id: z.string().optional(),
    license_ccurl: z.string().url().optional(),
    position: z.number().int().optional(),
    releasedate: z.string().optional(),
    album_image: z.string().url().optional(),
    audio: z.string().url().optional(),
    audiodownload: z.string().url().optional(),
    prourl: z.string().optional(),
    shorturl: z.string().url().optional(),
    shareurl: z.string().url().optional(),
    waveform: WaveformSchema.optional(),
    image: z.string().url().optional(),
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
