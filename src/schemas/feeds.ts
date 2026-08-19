import { z } from 'zod';

import { LocalizedTextSchema } from './common';
import { ListParamsSchema } from './params';

/**
 * Feed resource zod schemas (hand-written from openapi-3.1.yaml `Feed`,
 * `FeedImages`). Strip mode: unknown fields dropped, typed fields enforced.
 * Feeds are editorial/content entries (news, interviews, contests, etc.);
 * `id` is the only always-present field.
 */

export const FeedImagesSchema = z.object({
    size996_350: z.string().url().optional(),
    size315_111: z.string().url().optional(),
    size600_211: z.string().url().optional(),
    size470_165: z.string().url().optional(),
});

export const FeedSchema = z.object({
    id: z.string(),
    title: LocalizedTextSchema.optional(),
    link: z.string().url().optional(),
    position: z.string().optional(),
    lang: z.array(z.string()).optional(),
    date_start: z.string().optional(),
    date_end: z.string().optional(),
    text: LocalizedTextSchema.optional(),
    type: z
        .enum(['album', 'artist', 'playlist', 'track', 'news', 'interview', 'contest', 'video', 'update'])
        .optional(),
    joinid: z.string().optional(),
    subtitle: z.array(z.string()).optional(),
    target: z.enum(['all', 'logged', 'notlogged']).optional(),
    images: FeedImagesSchema.optional(),
});

export type FeedImages = z.infer<typeof FeedImagesSchema>;
export type Feed = z.infer<typeof FeedSchema>;

/**
 * `/feeds` (listFeeds) query params. `order` defaults to `position_asc`
 * server-side; `target` defaults to `all` server-side — both left optional
 * rather than duplicate the defaults. `lang` is a single-value enum here
 * (not an array, unlike `/tracks`).
 */
export const FeedsListParamsSchema = ListParamsSchema.extend({
    order: z.array(z.enum(['id', 'date_start', 'date_end', 'position'])).optional(),
    id: z.number().int().optional(),
    lang: z.enum(['en', 'fr', 'es', 'de', 'pl', 'it', 'ru', 'pt']).optional(),
    target: z.enum(['all', 'logged', 'notlogged']).optional(),
    type: z
        .array(z.enum(['album', 'artist', 'playlist', 'track', 'news', 'interview', 'contest', 'video', 'update']))
        .optional(),
});

export type FeedsListParams = z.infer<typeof FeedsListParamsSchema>;
