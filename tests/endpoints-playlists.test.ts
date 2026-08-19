import { expect, test } from 'bun:test';
import type { ApiResult, RequestFn, RequestOptions } from '../src/core/request';
import { playlists } from '../src/endpoints/playlists';
import type { Playlist, PlaylistWithTracks } from '../src/schemas/playlists';

type Call = {
    method: 'GET' | 'POST';
    path: string;
    params: Record<string, unknown>;
    options: RequestOptions<unknown>;
};

function mockRequest(): { request: RequestFn; calls: Call[] } {
    const calls: Call[] = [];
    const request = ((
        method: 'GET' | 'POST',
        path: string,
        params: Record<string, unknown>,
        options: RequestOptions<unknown>
    ) => {
        calls.push({ method, path, params, options });
        return Promise.resolve({
            results: [{ id: '1', name: 'p' }],
            warnings: '',
        }) as Promise<ApiResult<unknown>>;
    }) as unknown as RequestFn;
    return { request, calls };
}

test('playlists.list: defaults to empty params, GET /playlists, cacheable, opId listPlaylists', async () => {
    const { request, calls } = mockRequest();
    const api = playlists(request);
    await api.list();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe('GET');
    expect(calls[0]?.path).toBe('/playlists');
    expect(calls[0]?.options.opId).toBe('listPlaylists');
    expect(calls[0]?.options.cache).toBe(true);
    expect(calls[0]?.params).toEqual({});
});

test('playlists.list: validates and strips unknown keys', async () => {
    const { request, calls } = mockRequest();
    const api = playlists(request);
    await api.list({ limit: 5, namesearch: 'rock', bogus: 'x' } as unknown as Parameters<typeof api.list>[0]);
    expect(calls[0]?.params).toEqual({ limit: 5, namesearch: 'rock' });
});

test('playlists.list: rejects non-mp32 audioformat', async () => {
    const { request } = mockRequest();
    const api = playlists(request);
    await expect(api.list({ audioformat: 'ogg' } as unknown as Parameters<typeof api.list>[0])).rejects.toThrow();
});

test('playlists.list: does not accept access_token (fetcher injects it)', async () => {
    const { request, calls } = mockRequest();
    const api = playlists(request);
    await api.list({ access_token: 'tok' } as unknown as Parameters<typeof api.list>[0]);
    expect(calls[0]?.params).toEqual({});
});

test('playlists.tracks: GET /playlists/tracks, opId listPlaylistTracks, accepts positionbetween', async () => {
    const { request, calls } = mockRequest();
    const api = playlists(request);
    await api.tracks({ id: [42], positionbetween: '1_5' });
    expect(calls[0]?.path).toBe('/playlists/tracks');
    expect(calls[0]?.options.opId).toBe('listPlaylistTracks');
    expect(calls[0]?.params).toEqual({ id: [42], positionbetween: '1_5' });
});

test('playlists.tracks: accepts full audioformat (ogg)', async () => {
    const { request, calls } = mockRequest();
    const api = playlists(request);
    await api.tracks({ audioformat: 'ogg' } as unknown as Parameters<typeof api.tracks>[0]);
    expect(calls[0]?.params).toEqual({ audioformat: 'ogg' });
});

test('playlists.list: returns ApiResult<Playlist> shape', async () => {
    const { request } = mockRequest();
    const api = playlists(request);
    const res = await api.list();
    expect(res.results).toEqual([{ id: '1', name: 'p' }]);
    expect(res.warnings).toBe('');
});

test('playlists.tracks: typed as PlaylistWithTracks results', async () => {
    const { request, calls } = mockRequest();
    const api = playlists(request);
    const res = (await api.tracks()) as { results: PlaylistWithTracks[] };
    expect(calls[0]?.options.schema).toBeDefined();
    const p = res.results[0] as Playlist;
    expect(p.id).toBe('1');
});
