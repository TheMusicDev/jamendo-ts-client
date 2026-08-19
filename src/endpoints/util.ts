import type { z } from 'zod';

/**
 * Validate caller-supplied params against an endpoint's zod schema and
 * return the stripped, plain object the fetcher expects. Strip mode drops
 * unknown keys and applies defaults, so callers can pass a partial subset.
 */
export function parseParams<T>(schema: z.ZodType<T>, input: unknown): Record<string, unknown> {
    const parsed = schema.parse(input);
    // Schemas are z.object shapes; emit a plain record for query serialization.
    return parsed as unknown as Record<string, unknown>;
}
