import { z } from 'zod';

import { AudioDLFormatSchema, AudioFormatSchema, ListParamsSchema } from './params';

/**
 * Review resource zod schemas (hand-written from openapi-3.1.yaml
 * `AlbumReview`, `TrackReview`). Strip mode: unknown fields dropped, typed
 * fields enforced. Almost every field is a string (the API does not coerce
 * `score`, `agreecnt`, ids to numbers); `id` + `title` + `text` are the only
 * always-present fields.
 *
 * `user_name` is typed as a plain string — it may resemble an email address
 * (PII), so callers should treat it as untrusted and avoid logging it raw.
 */

const ReviewBaseSchema = z.object({
    id: z.string(),
    title: z.string(),
    text: z.string(),
    dateadded: z.string().optional(),
    agreecnt: z.string().optional(),
    lang: z.string().optional(),
    user_id: z.string().optional(),
    user_name: z.string().optional(),
    user_dispname: z.string().optional(),
    score: z.string().optional(),
});

export const AlbumReviewSchema = ReviewBaseSchema.extend({
    album_id: z.string().optional(),
    album_name: z.string().optional(),
    artist_id: z.string().optional(),
});

export const TrackReviewSchema = ReviewBaseSchema.extend({
    track_id: z.string().optional(),
    track_name: z.string().optional(),
    album_id: z.string().optional(),
    artist_id: z.string().optional(),
    track_audiodownload_allowed: z.boolean().optional(),
    track_license_ccurl: z.string().url().optional(),
    track_audio: z.string().url().optional(),
    track_audiodownload: z.string().url().optional(),
});

export type AlbumReview = z.infer<typeof AlbumReviewSchema>;
export type TrackReview = z.infer<typeof TrackReviewSchema>;

/** Shared base for `/reviews/*` list params. `access_token` omitted (fetcher). */
const ReviewsBaseParamsSchema = ListParamsSchema.extend({
    order: z.array(z.enum(['addeddate', 'score', 'id'])).optional(),
    id: z.array(z.number().int()).optional(),
    lang: z.string().optional(),
    datebetween: z.string().optional(),
    user_id: z.number().int().optional(),
    hasscore: z.boolean().optional(),
});

/** `/reviews/albums` (listAlbumReviews) query params. */
export const AlbumReviewsParamsSchema = ReviewsBaseParamsSchema.extend({
    album_id: z.array(z.number().int()).optional(),
    artist_id: z.number().int().optional(),
});

/** `/reviews/tracks` (listTrackReviews) query params. */
export const TrackReviewsParamsSchema = ReviewsBaseParamsSchema.extend({
    track_id: z.array(z.number().int()).optional(),
    album_id: z.number().int().optional(),
    artist_id: z.number().int().optional(),
    audioformat: AudioFormatSchema.optional(),
    audiodlformat: AudioDLFormatSchema.optional(),
});

export type AlbumReviewsParams = z.infer<typeof AlbumReviewsParamsSchema>;
export type TrackReviewsParams = z.infer<typeof TrackReviewsParamsSchema>;
