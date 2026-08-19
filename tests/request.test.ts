import { expect, test } from 'bun:test';

import { resolveConfig } from '../src/config';
import { createCache } from '../src/core/cache';
import type { Fetcher } from '../src/core/fetcher';
import { createRateLimiter } from '../src/core/rateLimit';
import { createRequest } from '../src/core/request';
import { JamendoError, JamendoRateLimit, JamendoSchemaError } from '../src/errors';
import { TrackSchema } from '../src/schemas/tracks';

type RawEnv = {
    headers: { status: string; code: number; error_message: string; warnings: string };
    results: unknown[];
};

function okEnv(results: unknown[]): RawEnv {
    return { headers: { status: 'success', code: 0, error_message: '', warnings: '' }, results };
}

const opts = { opId: 'listTracks', schema: TrackSchema, cache: true } as const;

/** Pass-through runner: no retry, just invoke the wrapped fn once. */
function passRun<T>(fn: (attempt: number) => Promise<T>): Promise<T> {
    return fn(1);
}

test('request: cache miss fetches then second call hits cache (fetcher once)', async () => {
    const config = resolveConfig({ clientId: 'c' });
    const cache = createCache(config);
    expect(cache).not.toBeNull();
    let calls = 0;
    const fetcher: Fetcher = async () => {
        calls++;
        return okEnv([{ id: '1', name: 't1' }]);
    };
    const request = createRequest(fetcher, cache, passRun);

    const r1 = await request('GET', '/tracks', { limit: 5 }, opts);
    expect(r1.results).toEqual([{ id: '1', name: 't1' }]);
    expect(calls).toBe(1);

    const r2 = await request('GET', '/tracks', { limit: 5 }, opts);
    expect(calls).toBe(1); // served from cache
    expect(r2.results).toEqual([{ id: '1', name: 't1' }]);
});

test('request: cache disabled dispatches every call', async () => {
    let calls = 0;
    const fetcher: Fetcher = async () => {
        calls++;
        return okEnv([{ id: '1', name: 't1' }]);
    };
    const request = createRequest(fetcher, null, passRun);

    await request('GET', '/tracks', { limit: 5 }, { ...opts, cache: false });
    await request('GET', '/tracks', { limit: 5 }, { ...opts, cache: false });
    expect(calls).toBe(2);
});

test('request: rate-limited envelope retries then succeeds', async () => {
    const config = resolveConfig({
        clientId: 'c',
        rateLimit: { maxRetries: 1, backoffBaseMs: 1, backoffMaxMs: 2, jitter: false },
    });
    const { run } = createRateLimiter(config);
    let calls = 0;
    const fetcher: Fetcher = async () => {
        calls++;
        if (calls === 1) {
            return { headers: { status: 'failed', code: 6, error_message: 'rate', warnings: 'w' }, results: [] };
        }
        return okEnv([{ id: '1', name: 't1' }]);
    };
    const request = createRequest(fetcher, null, run);

    const r = await request('GET', '/tracks', {}, opts);
    expect(calls).toBe(2);
    expect(r.results).toEqual([{ id: '1', name: 't1' }]);
});

test('request: non-retryable envelope code aborts without retry', async () => {
    const config = resolveConfig({
        clientId: 'c',
        rateLimit: { maxRetries: 2, backoffBaseMs: 1, backoffMaxMs: 2, jitter: false },
    });
    const { run } = createRateLimiter(config);
    let calls = 0;
    const fetcher: Fetcher = async () => {
        calls++;
        return { headers: { status: 'failed', code: 5, error_message: 'bad', warnings: '' }, results: [] };
    };
    const request = createRequest(fetcher, null, run);

    await expect(request('GET', '/tracks', {}, opts)).rejects.toThrow(JamendoError);
    expect(calls).toBe(1);
});

test('request: schema mismatch throws JamendoSchemaError', async () => {
    const fetcher: Fetcher = async () => okEnv([{ foo: 1 }]); // missing id+name
    const request = createRequest(fetcher, null, passRun);

    await expect(request('GET', '/tracks', {}, opts)).rejects.toBeInstanceOf(JamendoSchemaError);
});

test('request: rate-limit error surfaces when retries exhaust', async () => {
    const config = resolveConfig({
        clientId: 'c',
        rateLimit: { maxRetries: 1, backoffBaseMs: 1, backoffMaxMs: 2, jitter: false },
    });
    const { run } = createRateLimiter(config);
    const fetcher: Fetcher = async () => ({
        headers: { status: 'failed', code: 6, error_message: 'rate', warnings: 'w' },
        results: [],
    });
    const request = createRequest(fetcher, null, run);

    await expect(request('GET', '/tracks', {}, opts)).rejects.toThrow(JamendoRateLimit);
});

test('request: carries envelope metadata (resultsCount, warnings)', async () => {
    const fetcher: Fetcher = async () => ({
        headers: {
            status: 'success',
            code: 0,
            error_message: '',
            warnings: 'quota soon',
            results_count: 1,
            results_fullcount: 42,
        },
        results: [{ id: '1', name: 't1' }],
    });
    const request = createRequest(fetcher, null, passRun);

    const r = await request('GET', '/tracks', {}, opts);
    expect(r.resultsCount).toBe(1);
    expect(r.resultsFullcount).toBe(42);
    expect(r.warnings).toBe('quota soon');
});
