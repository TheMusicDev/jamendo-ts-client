import { z } from 'zod';

import { JamendoSchemaError } from '../errors';

/**
 * Validate envelope `results` (an array) element-by-element against a
 * per-endpoint element zod schema. The standard path for every list endpoint.
 *
 * Runs in strip mode (default `z.object()`): unknown fields are dropped,
 * typed fields are enforced. On zod failure throws {@link JamendoSchemaError}
 * carrying the zod issues — that signals API drift (response shape changed →
 * client version bump per the locked decision).
 *
 * @returns the validated, stripped results as `T[]`.
 */
export function validateResults<T>(results: unknown, schema: z.ZodType<T>, opId?: string): T[] {
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

/**
 * Validate the whole `results` blob against a single zod schema. Used by
 * endpoints whose response is not the standard array envelope — currently
 * only `/autocomplete`, which returns an object keyed by entity. Same strip
 * mode + {@link JamendoSchemaError} on mismatch.
 */
export function validateResultsAs<R>(results: unknown, resultsSchema: z.ZodType<R>, opId?: string): R {
    try {
        return resultsSchema.parse(results);
    } catch (err) {
        if (err instanceof z.ZodError) {
            throw new JamendoSchemaError(err.issues, opId);
        }
        throw new JamendoSchemaError(err, opId);
    }
}
