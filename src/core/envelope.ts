import { errorForCode, JamendoSchemaError } from '../errors';
import { type Envelope, EnvelopeSchema, type Headers } from '../schemas/envelope';

/** Parsed success envelope — the raw `results` blob plus envelope metadata. */
export interface ParsedEnvelope<T> {
    results: T;
    warnings: string;
    resultsCount?: number;
    resultsFullcount?: number;
    headers: Headers;
}

/**
 * Parse a raw Jamendo response document.
 *
 * Validates the envelope shape (strip mode), then normalizes Jamendo's
 * non-HTTP error model: `headers.code === 0` is success, anything else is
 * thrown as a typed {@link JamendoError} (code 6 → {@link JamendoRateLimit}).
 * The `results` array is returned untyped here; endpoint-level validation
 * happens in `core/validate.ts`.
 *
 * @throws {JamendoSchemaError} envelope shape doesn't match.
 * @throws {JamendoError} envelope `code` is non-zero.
 */
export function parseEnvelope(raw: unknown, opId?: string): ParsedEnvelope<unknown> {
    let env: Envelope;
    try {
        env = EnvelopeSchema.parse(raw);
    } catch (err) {
        throw new JamendoSchemaError((err as { issues?: unknown }).issues ?? err, opId);
    }

    const { headers, results } = env;
    if (headers.code === 0) {
        return {
            results,
            warnings: headers.warnings,
            resultsCount: headers.results_count,
            resultsFullcount: headers.results_fullcount,
            headers,
        };
    }

    throw errorForCode(headers.code, headers.error_message, headers.warnings, opId);
}
