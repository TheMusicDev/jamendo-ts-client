import { expect, mock, test } from 'bun:test';

import { resolveConfig } from '../src/config';
import { createFetcher } from '../src/core/fetcher';

type Call = { url: string; opts: Record<string, unknown> };

function makeFetchMock() {
    const calls: Call[] = [];
    const fn = mock((_url: string, _opts?: Record<string, unknown>) => {
        calls.push({ url: _url, opts: _opts ?? {} });
        return Promise.resolve(
            new Response(
                JSON.stringify({
                    headers: { status: 'success', code: 0, error_message: '', warnings: '' },
                    results: [],
                }),
                { headers: { 'content-type': 'application/json' } }
            )
        );
    });
    return { fn, calls };
}

/** Assert exactly one call was made and return it (typed, no non-null assertions at call sites). */
function takeCall(calls: Call[]): Call {
    expect(calls).toHaveLength(1);
    // biome-ignore lint/style/noNonNullAssertion: length asserted above
    return calls[0]!;
}

test('fetcher: injects client_id, format=json, and calls baseURL+path', async () => {
    const { fn, calls } = makeFetchMock();
    const config = resolveConfig({ clientId: 'cid', fetch: fn as unknown as typeof fetch });
    const fetcher = createFetcher(config);
    await fetcher('GET', '/tracks', { limit: 5, namesearch: 'rock' });
    const url = new URL(takeCall(calls).url);
    expect(url.pathname).toBe('/v3.0/tracks');
    expect(url.searchParams.get('client_id')).toBe('cid');
    expect(url.searchParams.get('format')).toBe('json');
    expect(url.searchParams.get('limit')).toBe('5');
    expect(url.searchParams.get('namesearch')).toBe('rock');
    expect(url.searchParams.has('access_token')).toBe(false);
});

test('fetcher: injects access_token when configured', async () => {
    const { fn, calls } = makeFetchMock();
    const config = resolveConfig({ clientId: 'cid', accessToken: 'tok', fetch: fn as unknown as typeof fetch });
    const fetcher = createFetcher(config);
    await fetcher('GET', '/tracks');
    const url = new URL(takeCall(calls).url);
    expect(url.searchParams.get('access_token')).toBe('tok');
});

test('fetcher: serializes array params as repeated keys', async () => {
    const { fn, calls } = makeFetchMock();
    const config = resolveConfig({ clientId: 'cid', fetch: fn as unknown as typeof fetch });
    const fetcher = createFetcher(config);
    await fetcher('GET', '/tracks', { id: [1, 2, 3] });
    const url = new URL(takeCall(calls).url);
    expect(url.searchParams.getAll('id')).toEqual(['1', '2', '3']);
});

test('fetcher: POST method passed through (Jamendo writes use query)', async () => {
    const { fn, calls } = makeFetchMock();
    const config = resolveConfig({ clientId: 'cid', fetch: fn as unknown as typeof fetch });
    const fetcher = createFetcher(config);
    await fetcher('POST', '/setuser/favorite', { track_id: 10 });
    const call = takeCall(calls);
    expect(call.opts.method).toBe('POST');
    expect(new URL(call.url).searchParams.get('track_id')).toBe('10');
});

test('fetcher: wires an AbortSignal (timeout) into the request init', async () => {
    const { fn, calls } = makeFetchMock();
    const config = resolveConfig({ clientId: 'cid', timeoutMs: 5000, fetch: fn as unknown as typeof fetch });
    const fetcher = createFetcher(config);
    await fetcher('GET', '/tracks');
    expect(takeCall(calls).opts.signal).toBeInstanceOf(AbortSignal);
});
