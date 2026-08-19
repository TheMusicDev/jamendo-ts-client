import { z } from 'zod';

import { JamendoSchemaError } from '../errors';

/**
 * Validate envelope `results` against a per-endpoint element zod schema.
 *
 * Runs in strip mode (default `z.object()`): unknown fields are dropped,
 * typed fields are enforced. On zod failure throws {@link JamendoSchemaError}
 * carrying the zod issues — that signals API drift (response shape changed →
 * client version bump per the locked decision).
 *
 * @returns the validated, stripped results as `T[]`.
 */
export function validateResults<T>(results: unknown[], schema: z.ZodType<T>, opId?: string): T[] {
    const arraySchema = z.array(schema);
    try {
        return arraySchema.parse(results);
    } catch (err) {
        if (err instanceof z.ZodError) {
            throw new JamendoSchemaError(err.issues, opId);
        }
        throw new JamendoSchemaError(err, opId);
    }
}
