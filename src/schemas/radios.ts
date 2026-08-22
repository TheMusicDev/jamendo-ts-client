import { z } from 'zod';

import { ImageSizeSchema, ListParamsSchema } from './params';

/**
 * Radio resource zod schemas (hand-written from openapi-3.1.yaml `Radio`).
 * Strip mode: unknown fields dropped, typed fields enforced. Unlike most
 * resources, `id` is an integer here (not a string); `name` is the other
 * always-present field.
 */

export const RadioSchema = z.object({
    id: z.number().int(),
    name: z.string(),
    dispname: z.string().optional(),
    type: z.enum(['www', 'pro']).optional(),
    image: z.string().url().optional(),
});

export type Radio = z.infer<typeof RadioSchema>;

/**
 * `/radios` (listRadios) query params. `type` defaults to `www` server-side;
 * we leave it optional rather than duplicate the default (see
 * `location_radius` in artists for the same reason). `imagesize` accepts any
 * int (spec enumerates radio-specific sizes).
 */
export const RadiosListParamsSchema = ListParamsSchema.extend({
    order: z.array(z.enum(['id', 'name', 'dispname'])).optional(),
    id: z.number().int().optional(),
    type: z.enum(['www', 'pro']).optional(),
    name: z.string().optional(),
    imagesize: ImageSizeSchema.optional(),
});

export type RadiosListParams = z.infer<typeof RadiosListParamsSchema>;

/**
 * `playingnow` object returned by `/radios/stream` — describes the currently
 * streamed track. `track_id` is 0 when nothing is currently playing.
 * Hand-written from openapi-3.1.yaml `RadioPlayingNow`.
 */
export const RadioPlayingNowSchema = z.object({
    track_id: z.number().int(),
    artist_id: z.number().int().optional(),
    album_id: z.number().int().optional(),
    album_name: z.string().optional(),
    track_name: z.string().optional(),
    track_image: z.string().url().optional(),
    artist_name: z.string().optional(),
});

export type RadioPlayingNow = z.infer<typeof RadioPlayingNowSchema>;

/**
 * `RadioStream` — `Radio` extended with the stream URL, `playingnow` track,
 * and `callmeback` ms. Hand-written from openapi-3.1.yaml `RadioStream`
 * (allOf `Radio`). The `stream` link is documented by Jamendo as broken and
 * possibly never fixed — treat as unreliable.
 */
export const RadioStreamSchema = RadioSchema.extend({
    stream: z.string().url().optional(),
    playingnow: RadioPlayingNowSchema.optional(),
    callmeback: z.string().optional(),
});

export type RadioStream = z.infer<typeof RadioStreamSchema>;

/**
 * `/radios/stream` (getRadioStream) query params. Standalone schema (does NOT
 * extend `ListParamsSchema`) — this endpoint has no `offset`, `limit`, or
 * `order`; `id` is a single integer (not the usual string array). One of
 * `id` or `name` is required by the API (enforced server-side). `type` defaults
 * to `www` server-side; left optional to avoid a required output type (same
 * pattern as `RadiosListParamsSchema`). `fullcount` is included; `format` and
 * `callback` are injected/omitted per the established convention.
 *
 * **Jamendo documents this endpoint as broken** — confirm against the live
 * API before depending on it.
 */
export const RadioStreamParamsSchema = z.object({
    id: z.number().int().optional(),
    name: z.string().optional(),
    type: z.enum(['www', 'pro']).optional(),
    fullcount: z.boolean().optional(),
    imagesize: ImageSizeSchema.optional(),
    track_imagesize: ImageSizeSchema.optional(),
});

export type RadioStreamParams = z.infer<typeof RadioStreamParamsSchema>;
