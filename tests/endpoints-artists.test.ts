import { expect, test } from 'bun:test';
import type { ApiResult, RequestFn, RequestOptions } from '../src/core/request';
import { artists } from '../src/endpoints/artists';
import type {
    Artist,
    ArtistMusicInfo,
    ArtistWithAlbums,
    ArtistWithLocations,
    ArtistWithTracks,
} from '../src/schemas/artists';

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
            results: [{ id: '1', name: 'a' }],
            warnings: '',
        }) as Promise<ApiResult<unknown>>;
    }) as unknown as RequestFn;
    return { request, calls };
}

test('artists.list: defaults to empty params, GET /artists, cacheable, opId listArtists', async () => {
    const { request, calls } = mockRequest();
    const api = artists(request);
    await api.list();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe('GET');
    expect(calls[0]?.path).toBe('/artists');
    expect(calls[0]?.options.opId).toBe('listArtists');
    expect(calls[0]?.options.cache).toBe(true);
    expect(calls[0]?.params).toEqual({});
});

test('artists.list: validates and strips unknown keys', async () => {
    const { request, calls } = mockRequest();
    const api = artists(request);
    await api.list({ limit: 5, namesearch: 'rock', bogus: 'x' } as unknown as Parameters<typeof api.list>[0]);
    expect(calls[0]?.params).toEqual({ limit: 5, namesearch: 'rock' });
});

test('artists.list: rejects invalid hasimage enum', async () => {
    const { request } = mockRequest();
    const api = artists(request);
    await expect(api.list({ hasimage: 'nope' } as unknown as Parameters<typeof api.list>[0])).rejects.toThrow();
});

test('artists.tracks: GET /artists/tracks, opId listArtistTracks, schema ArtistWithTracks', async () => {
    const { request, calls } = mockRequest();
    const api = artists(request);
    await api.tracks({ track_type: ['single'] });
    expect(calls[0]?.path).toBe('/artists/tracks');
    expect(calls[0]?.options.opId).toBe('listArtistTracks');
    expect(calls[0]?.params).toEqual({ track_type: ['single'] });
});

test('artists.albums: GET /artists/albums, opId listArtistAlbums', async () => {
    const { request, calls } = mockRequest();
    const api = artists(request);
    await api.albums({ id: [42] });
    expect(calls[0]?.path).toBe('/artists/albums');
    expect(calls[0]?.options.opId).toBe('listArtistAlbums');
    expect(calls[0]?.params).toEqual({ id: [42] });
});

test('artists.locations: omits location_radius when not passed (API default applies)', async () => {
    const { request, calls } = mockRequest();
    const api = artists(request);
    await api.locations({ location_country: ['USA'] });
    expect(calls[0]?.path).toBe('/artists/locations');
    expect(calls[0]?.options.opId).toBe('listArtistLocations');
    expect(calls[0]?.params).toEqual({ location_country: ['USA'] });
});

test('artists.locations: explicit location_radius preserved', async () => {
    const { request, calls } = mockRequest();
    const api = artists(request);
    await api.locations({ location_radius: 50 });
    expect(calls[0]?.params).toEqual({ location_radius: 50 });
});

test('artists.musicinfo: GET /artists/musicinfo, opId listArtistsMusicinfo, accepts tag', async () => {
    const { request, calls } = mockRequest();
    const api = artists(request);
    await api.musicinfo({ tag: 'jazz' });
    expect(calls[0]?.path).toBe('/artists/musicinfo');
    expect(calls[0]?.options.opId).toBe('listArtistsMusicinfo');
    expect(calls[0]?.params).toEqual({ tag: 'jazz' });
});

test('artists.list: returns ApiResult<Artist> shape', async () => {
    const { request } = mockRequest();
    const api = artists(request);
    const res = await api.list();
    expect(res.results).toEqual([{ id: '1', name: 'a' }]);
    expect(res.warnings).toBe('');
});

test('artists.tracks: typed as ArtistWithTracks results', async () => {
    const { request, calls } = mockRequest();
    const api = artists(request);
    const res = (await api.tracks()) as { results: ArtistWithTracks[] };
    expect(calls[0]?.options.schema).toBeDefined();
    const a = res.results[0] as Artist;
    expect(a.id).toBe('1');
});

test('artists.albums: typed as ArtistWithAlbums results', async () => {
    const { request, calls } = mockRequest();
    const api = artists(request);
    const res = (await api.albums()) as { results: ArtistWithAlbums[] };
    expect(calls[0]?.options.schema).toBeDefined();
    expect(res.results[0] as Artist).toBeDefined();
});

test('artists.locations: typed as ArtistWithLocations results', async () => {
    const { request, calls } = mockRequest();
    const api = artists(request);
    const res = (await api.locations()) as { results: ArtistWithLocations[] };
    expect(calls[0]?.options.schema).toBeDefined();
    expect(res.results[0] as Artist).toBeDefined();
});

test('artists.musicinfo: typed as ArtistMusicInfo results', async () => {
    const { request, calls } = mockRequest();
    const api = artists(request);
    const res = (await api.musicinfo()) as { results: ArtistMusicInfo[] };
    expect(calls[0]?.options.schema).toBeDefined();
    const a = res.results[0] as Artist;
    expect(a.name).toBe('a');
});
