import { z } from 'zod';

/**
 * Shared query-param schemas reused across list endpoints. Hand-written
 * from openapi-3.1.yaml `components/parameters`. Strip mode: callers pass
 * a subset; unknown keys are dropped at validation time.
 *
 * `format`, `client_id`, and `access_token` are intentionally absent —
 * the fetcher injects them, so they are never part of an endpoint's params.
 */

export const AudioFormatSchema = z.enum(['mp31', 'mp32', 'ogg', 'flac']);
export const AudioDLFormatSchema = z.enum(['mp31', 'mp32', 'ogg', 'flac']);

/** Cover image pixel size. Spec lists 17 int values; we accept any int. */
export const ImageSizeSchema = z.number().int();

/** Pagination + fullcount, common to every list endpoint. */
export const ListParamsSchema = z.object({
    offset: z.number().int().min(0).optional(),
    limit: z.union([z.number().int().min(1), z.literal('all')]).optional(),
    fullcount: z.boolean().optional(),
});
