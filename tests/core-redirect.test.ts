import { expect, mock, test } from 'bun:test';

import { resolveConfig } from '../src/config';
import { createRedirectFetcher } from '../src/core/redirect';
import { JamendoHttpError } from '../src/errors';

type Call = { url: string; opts: Record<string, unknown> };

/**
 * Build a fetch mock that creates a fresh `Response` (via `factory`) on each
 * call — a Response body can only be consumed once, so reusing a single
 * instance across calls would throw.
 */
function makeFetchMock(factory: () => Response) {
    const calls: Call[] = [];
    const fn = mock((_url: string, _opts?: Record<string, unknown>) => {
        calls.push({ url: _url, opts: _opts ?? {} });
        return Promise.resolve(factory());
    });
    return { fn, calls };
}

/** Assert exactly one call was made and return it (typed, no non-null assertions at call sites). */
function takeCall(calls: Call[]): Call {
    expect(calls).toHaveLength(1);
    // biome-ignore lint/style/noNonNullAssertion: length asserted above
    return calls[0]!;
}

test('redirect: 302 with Location returns { url }', async () => {
    const { fn, calls } = makeFetchMock(
        () => new Response(null, { status: 302, headers: { location: 'https://cdn.jamendo.com/track.mp3' } })
    );
    const config = resolveConfig({ clientId: 'cid', fetch: fn as unknown as typeof fetch });
    const redirect = createRedirectFetcher(config);

    const result = await redirect('GET', '/tracks/file', { id: 42, audioformat: 'mp32' });

    expect(result).toEqual({ url: 'https://cdn.jamendo.com/track.mp3' });
    const call = takeCall(calls);
    const url = new URL(call.url);
    expect(url.pathname).toBe('/v3.0/tracks/file');
    expect(url.searchParams.get('client_id')).toBe('cid');
    expect(url.searchParams.get('format')).toBe('json');
    expect(url.searchParams.get('id')).toBe('42');
    expect(url.searchParams.get('audioformat')).toBe('mp32');
});

test('redirect: injects access_token when configured', async () => {
    const { fn, calls } = makeFetchMock(
        () => new Response(null, { status: 302, headers: { location: 'https://cdn.jamendo.com/a.zip' } })
    );
    const config = resolveConfig({ clientId: 'cid', accessToken: 'tok', fetch: fn as unknown as typeof fetch });
    const redirect = createRedirectFetcher(config);

    await redirect('GET', '/albums/file', { id: 7 });

    expect(new URL(takeCall(calls).url).searchParams.get('access_token')).toBe('tok');
});

test('redirect: passes redirect:manual to fetch so the 302 is not followed', async () => {
    const { fn, calls } = makeFetchMock(
        () => new Response(null, { status: 302, headers: { location: 'https://cdn.jamendo.com/p.zip' } })
    );
    const config = resolveConfig({ clientId: 'cid', fetch: fn as unknown as typeof fetch });
    const redirect = createRedirectFetcher(config);

    await redirect('GET', '/playlists/file', { id: 3 });

    expect(takeCall(calls).opts.redirect).toBe('manual');
});

test('redirect: 404 throws JamendoHttpError with status 404', async () => {
    const { fn } = makeFetchMock(() => new Response('Not Found', { status: 404 }));
    const config = resolveConfig({ clientId: 'cid', fetch: fn as unknown as typeof fetch });
    const redirect = createRedirectFetcher(config);

    const err = await redirect('GET', '/tracks/file', { id: 99 }).catch((e) => e);
    expect(err).toBeInstanceOf(JamendoHttpError);
    expect((err as JamendoHttpError).status).toBe(404);
});

test('redirect: 500 throws JamendoHttpError with status 500', async () => {
    const { fn } = makeFetchMock(() => new Response('Internal Server Error', { status: 500 }));
    const config = resolveConfig({ clientId: 'cid', fetch: fn as unknown as typeof fetch });
    const redirect = createRedirectFetcher(config);

    const err = await redirect('GET', '/tracks/file', { id: 1 }).catch((e) => e);
    expect(err).toBeInstanceOf(JamendoHttpError);
    expect((err as JamendoHttpError).status).toBe(500);
});

test('redirect: 302 without Location header throws JamendoHttpError', async () => {
    const { fn } = makeFetchMock(() => new Response(null, { status: 302 }));
    const config = resolveConfig({ clientId: 'cid', fetch: fn as unknown as typeof fetch });
    const redirect = createRedirectFetcher(config);

    const err = await redirect('GET', '/tracks/file', { id: 1 }).catch((e) => e);
    expect(err).toBeInstanceOf(JamendoHttpError);
});
