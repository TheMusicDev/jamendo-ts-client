import { z } from 'zod';

/**
 * Envelope zod schemas. Every Jamendo response wraps its payload in
 * `{ headers, results }`. These schemas validate that shape (strip mode —
 * unknown envelope fields are dropped). The `results` array is `z.unknown()`
 * here; per-endpoint schemas validate the elements in `core/validate.ts`.
 *
 * Note: `headers.status` is typed loosely as a string. The OpenAPI spec
 * documents `success` but the live API returns `succeed`; success is decided
 * by `headers.code === 0`, not by the status string.
 */
export const HeadersSchema = z.object({
    status: z.string(),
    code: z.number().int(),
    error_message: z.string(),
    warnings: z.string(),
    results_count: z.number().int().optional(),
    results_fullcount: z.number().int().optional(),
});

export type Headers = z.infer<typeof HeadersSchema>;

export const EnvelopeSchema = z.object({
    headers: HeadersSchema,
    results: z.array(z.unknown()),
});

export type Envelope = z.infer<typeof EnvelopeSchema>;
