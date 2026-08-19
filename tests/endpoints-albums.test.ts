import { expect, test } from 'bun:test';
import type { ApiResult, RequestFn, RequestOptions } from '../src/core/request';
import { albums } from '../src/endpoints/albums';
import type { Album, AlbumMusicInfo, AlbumWithTracks } from '../src/schemas/albums';

type Call = {
    method: 'GET' | 'POST';
    path: string;
    params: Record<string, unknown>;
    options: RequestOptions<unknown>;
};

/** Capture request calls; return a canned success for each. */
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
            results: [{ id: '1', name: 'a' }],
            warnings: '',
        }) as Promise<ApiResult<unknown>>;
    }) as unknown as RequestFn;
    return { request, calls };
}

test('albums.list: defaults to empty params, GET /albums, cacheable, opId listAlbums', async () => {
    const { request, calls } = mockRequest();
    const api = albums(request);
    await api.list();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe('GET');
    expect(calls[0]?.path).toBe('/albums');
    expect(calls[0]?.options.opId).toBe('listAlbums');
    expect(calls[0]?.options.cache).toBe(true);
    expect(calls[0]?.params).toEqual({});
});

test('albums.list: validates and strips unknown keys', async () => {
    const { request, calls } = mockRequest();
    const api = albums(request);
    await api.list({ limit: 5, namesearch: 'rock', bogus: 'x' } as unknown as Parameters<typeof api.list>[0]);
    expect(calls[0]?.params).toEqual({ limit: 5, namesearch: 'rock' });
});

test('albums.list: rejects invalid order enum', async () => {
    const { request } = mockRequest();
    const api = albums(request);
    await expect(api.list({ order: ['nope'] } as unknown as Parameters<typeof api.list>[0])).rejects.toThrow();
});

test('albums.list: rejects non-mp32 audioformat', async () => {
    const { request } = mockRequest();
    const api = albums(request);
    await expect(api.list({ audioformat: 'ogg' } as unknown as Parameters<typeof api.list>[0])).rejects.toThrow();
});

test('albums.tracks: GET /albums/tracks, opId listAlbumTracks, schema AlbumWithTracks', async () => {
    const { request, calls } = mockRequest();
    const api = albums(request);
    await api.tracks({ id: [42] });
    expect(calls[0]?.path).toBe('/albums/tracks');
    expect(calls[0]?.options.opId).toBe('listAlbumTracks');
    expect(calls[0]?.params).toEqual({ id: [42] });
});

test('albums.tracks: accepts full audioformat (mp31/ogg/flac)', async () => {
    const { request, calls } = mockRequest();
    const api = albums(request);
    await api.tracks({ audioformat: 'ogg' } as unknown as Parameters<typeof api.tracks>[0]);
    expect(calls[0]?.params).toEqual({ audioformat: 'ogg' });
});

test('albums.musicinfo: GET /albums/musicinfo, opId listAlbumsMusicinfo, accepts tag', async () => {
    const { request, calls } = mockRequest();
    const api = albums(request);
    await api.musicinfo({ tag: 'jazz' });
    expect(calls[0]?.path).toBe('/albums/musicinfo');
    expect(calls[0]?.options.opId).toBe('listAlbumsMusicinfo');
    expect(calls[0]?.params).toEqual({ tag: 'jazz' });
});

test('albums.list: returns ApiResult<Album> shape', async () => {
    const { request } = mockRequest();
    const api = albums(request);
    const res = await api.list();
    expect(res.results).toEqual([{ id: '1', name: 'a' }]);
    expect(res.warnings).toBe('');
});

test('albums.tracks: typed as AlbumWithTracks results', async () => {
    const { request, calls } = mockRequest();
    const api = albums(request);
    const res = (await api.tracks()) as { results: AlbumWithTracks[] };
    expect(calls[0]?.options.schema).toBeDefined();
    const a = res.results[0] as Album;
    expect(a.id).toBe('1');
});

test('albums.musicinfo: typed as AlbumMusicInfo results', async () => {
    const { request, calls } = mockRequest();
    const api = albums(request);
    const res = (await api.musicinfo()) as { results: AlbumMusicInfo[] };
    expect(calls[0]?.options.schema).toBeDefined();
    const a = res.results[0] as Album;
    expect(a.name).toBe('a');
});
