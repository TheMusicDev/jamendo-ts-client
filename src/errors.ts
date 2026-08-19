/**
 * Jamendo API error types.
 *
 * Jamendo returns errors inside the response envelope (`headers.code`), not via
 * HTTP status. {@link JamendoError} carries that code so callers can switch on it.
 * Two specializations exist because the client needs to detect them by shape:
 *   - {@link JamendoRateLimit}  (code 6) — drives the p-retry backoff loop.
 *   - {@link JamendoSchemaError}          — zod validation mismatch (API drift).
 * Every other code is thrown as a plain {@link JamendoError}; switch on `err.code`.
 */

/** Jamendo envelope error codes. See docs/02-response-codes.md. */
export const JamendoErrorCode = {
    Success: 0,
    Exception: 1,
    HttpMethod: 2,
    Type: 3,
    RequiredParameter: 4,
    InvalidClientId: 5,
    RateLimitExceeded: 6,
    MethodNotFound: 7,
    NeededParameter: 8,
    Format: 9,
    EntryPoint: 10,
    SuspendedApplication: 11,
    AccessToken: 12,
    InsufficientScope: 13,
    InvalidUser: 21,
    EmailAlreadyExist: 22,
    DuplicateValue: 23,
    InvalidPlaylist: 24,
    AccessCode: 101,
} as const;

export type JamendoErrorCode = (typeof JamendoErrorCode)[keyof typeof JamendoErrorCode];

/** Human-readable type name for each code, surfaced as `error.type`. */
const CODE_TYPE: Record<number, string> = {
    1: 'Exception',
    2: 'HttpMethod',
    3: 'Type',
    4: 'RequiredParameter',
    5: 'InvalidClientId',
    6: 'RateLimitExceeded',
    7: 'MethodNotFound',
    8: 'NeededParameter',
    9: 'Format',
    10: 'EntryPoint',
    11: 'SuspendedApplication',
    12: 'AccessToken',
    13: 'InsufficientScope',
    21: 'InvalidUser',
    22: 'EmailAlreadyExist',
    23: 'DuplicateValue',
    24: 'InvalidPlaylist',
    101: 'AccessCode',
};

export interface JamendoErrorOptions {
    code: number;
    message: string;
    warnings?: string;
    /** Operation id that produced the error, for debugging. */
    opId?: string;
}

/** Base error for every Jamendo envelope failure. */
export class JamendoError extends Error {
    readonly code: number;
    readonly type: string;
    readonly warnings: string;
    readonly opId?: string;

    constructor(opts: JamendoErrorOptions) {
        super(opts.message);
        this.name = 'JamendoError';
        this.code = opts.code;
        this.type = CODE_TYPE[opts.code] ?? 'Unknown';
        this.warnings = opts.warnings ?? '';
        this.opId = opts.opId;
    }
}

/** Code 6 — rate limit hit. p-retry retries on this; rethrown when exhausted. */
export class JamendoRateLimit extends JamendoError {
    constructor(message: string, warnings = '', opId?: string) {
        super({ code: JamendoErrorCode.RateLimitExceeded, message, warnings, opId });
        this.name = 'JamendoRateLimit';
    }
}

/** zod validation mismatch — `results` didn't match the endpoint schema (API drift). */
export class JamendoSchemaError extends JamendoError {
    readonly issues: unknown;

    constructor(issues: unknown, opId?: string) {
        super({
            code: -1,
            message: `Schema validation failed for ${opId ?? '<unknown op>'}; API response did not match the expected shape.`,
            opId,
        });
        this.name = 'JamendoSchemaError';
        this.issues = issues;
    }
}

/** Map an envelope error code to the right thrown error. Code 6 → JamendoRateLimit. */
export function errorForCode(code: number, message: string, warnings = '', opId?: string): JamendoError {
    if (code === JamendoErrorCode.RateLimitExceeded) {
        return new JamendoRateLimit(message || 'Rate limit exceeded', warnings, opId);
    }
    return new JamendoError({ code, message: message || `Jamendo error ${code}`, warnings, opId });
}
