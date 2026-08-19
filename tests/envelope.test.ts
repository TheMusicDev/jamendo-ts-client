import { expect, test } from 'bun:test';
import { parseEnvelope } from '../src/core/envelope';
import { errorForCode, JamendoError, JamendoErrorCode, JamendoRateLimit, JamendoSchemaError } from '../src/errors';

test('parseEnvelope: code 0 returns results + warnings + metadata', () => {
    const raw = {
        headers: {
            status: 'success',
            code: 0,
            error_message: '',
            warnings: 'quota near',
            results_count: 2,
            results_fullcount: 42,
        },
        results: [{ id: '1' }, { id: '2' }],
    };
    const parsed = parseEnvelope(raw, 'tracksList');
    expect(parsed.results).toEqual([{ id: '1' }, { id: '2' }]);
    expect(parsed.warnings).toBe('quota near');
    expect(parsed.resultsCount).toBe(2);
    expect(parsed.resultsFullcount).toBe(42);
});

test('parseEnvelope: code 6 throws JamendoRateLimit', () => {
    const raw = {
        headers: { status: 'failed', code: 6, error_message: 'Rate Limit Exceeded', warnings: '' },
        results: [],
    };
    expect(() => parseEnvelope(raw, 'tracksList')).toThrow(JamendoRateLimit);
    try {
        parseEnvelope(raw, 'tracksList');
    } catch (err) {
        expect(err).toBeInstanceOf(JamendoRateLimit);
        expect((err as JamendoRateLimit).code).toBe(JamendoErrorCode.RateLimitExceeded);
        expect((err as JamendoRateLimit).opId).toBe('tracksList');
    }
});

test('parseEnvelope: non-retryable code throws JamendoError with mapped type', () => {
    const raw = {
        headers: { status: 'failed', code: 5, error_message: 'invalid client id', warnings: 'w' },
        results: [],
    };
    expect(() => parseEnvelope(raw)).toThrow(JamendoError);
    try {
        parseEnvelope(raw);
    } catch (err) {
        expect(err).toBeInstanceOf(JamendoError);
        expect(err).not.toBeInstanceOf(JamendoRateLimit);
        expect((err as JamendoError).code).toBe(5);
        expect((err as JamendoError).type).toBe('InvalidClientId');
        expect((err as JamendoError).warnings).toBe('w');
    }
});

test('parseEnvelope: malformed envelope throws JamendoSchemaError', () => {
    expect(() => parseEnvelope({ nope: true })).toThrow(JamendoSchemaError);
    expect(() => parseEnvelope({ headers: 'bad', results: [] })).toThrow(JamendoSchemaError);
});

test('parseEnvelope: status string "succeed" (live API) still works via code 0', () => {
    const raw = {
        headers: { status: 'succeed', code: 0, error_message: '', warnings: '' },
        results: [1, 2, 3],
    };
    expect(parseEnvelope(raw).results).toEqual([1, 2, 3]);
});

test('parseEnvelope: strips unknown envelope fields', () => {
    const raw = {
        headers: { status: 'success', code: 0, error_message: '', warnings: '', extra: 'drop' },
        results: [],
        unexpected: 'drop',
    };
    const parsed = parseEnvelope(raw);
    expect(parsed.headers).not.toHaveProperty('extra');
});

test('errorForCode: code 6 → JamendoRateLimit, else JamendoError', () => {
    expect(errorForCode(6, 'msg')).toBeInstanceOf(JamendoRateLimit);
    expect(errorForCode(1, 'boom')).toBeInstanceOf(JamendoError);
    expect(errorForCode(1, 'boom')).not.toBeInstanceOf(JamendoRateLimit);
});

test('JamendoError: unknown code gets type "Unknown"', () => {
    const err = errorForCode(999, 'x') as JamendoError;
    expect(err.type).toBe('Unknown');
});
