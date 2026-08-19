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
