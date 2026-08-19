import { z } from 'zod';

/**
 * Envelope zod schemas. Every Jamendo response wraps its payload in
 * `{ headers, results }`. These schemas validate that shape (strip mode —
 * unknown envelope fields are dropped). `results` is `z.unknown()` here:
 * nearly every endpoint returns an array (validated element-by-element in
 * `core/validate.ts`), but `/autocomplete` returns an object keyed by entity.
 * The per-endpoint path decides which shape to enforce.
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
    results: z.unknown(),
});

export type Envelope = z.infer<typeof EnvelopeSchema>;
