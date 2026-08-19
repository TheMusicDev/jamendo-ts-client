import { expect, test } from 'bun:test';
import type { ApiResult, RequestFn, RequestOptions } from '../src/core/request';
import { tracks } from '../src/endpoints/tracks';
import type { Track, TrackWithScore } from '../src/schemas/tracks';

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
            results: [{ id: '1', name: 't' }],
            warnings: '',
        }) as Promise<ApiResult<unknown>>;
    }) as unknown as RequestFn;
    return { request, calls };
}

test('tracks.list: defaults to empty params, GET /tracks, cacheable, opId listTracks', async () => {
    const { request, calls } = mockRequest();
    const api = tracks(request);
    await api.list();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe('GET');
    expect(calls[0]?.path).toBe('/tracks');
    expect(calls[0]?.options.opId).toBe('listTracks');
    expect(calls[0]?.options.cache).toBe(true);
    expect(calls[0]?.params).toEqual({});
});

test('tracks.list: validates and strips unknown keys', async () => {
    const { request, calls } = mockRequest();
    const api = tracks(request);
    await api.list({ limit: 5, namesearch: 'rock', bogus: 'x' } as unknown as Parameters<typeof api.list>[0]);
    expect(calls[0]?.params).toEqual({ limit: 5, namesearch: 'rock' });
});

test('tracks.list: rejects invalid enum param', async () => {
    const { request } = mockRequest();
    const api = tracks(request);
    await expect(
        api.list({ vocalinstrumental: 'nope' } as unknown as Parameters<typeof api.list>[0])
    ).rejects.toThrow();
});

test('tracks.similar: requires id, GET /tracks/similar, opId listSimilarTracks', async () => {
    const { request, calls } = mockRequest();
    const api = tracks(request);
    await api.similar({ id: 42 });
    expect(calls[0]?.path).toBe('/tracks/similar');
    expect(calls[0]?.options.opId).toBe('listSimilarTracks');
    expect(calls[0]?.params).toEqual({ id: 42 });
});

test('tracks.similar: missing required id throws', async () => {
    const { request } = mockRequest();
    const api = tracks(request);
    await expect(api.similar({} as unknown as Parameters<typeof api.similar>[0])).rejects.toThrow();
});

test('tracks.list: returns ApiResult<Track> shape', async () => {
    const { request } = mockRequest();
    const api = tracks(request);
    const res = await api.list();
    expect(res.results).toEqual([{ id: '1', name: 't' }]);
    expect(res.warnings).toBe('');
});

test('tracks.similar: typed as TrackWithScore results', async () => {
    const { request, calls } = mockRequest();
    const api = tracks(request);
    const res = (await api.similar({ id: 1 })) as { results: TrackWithScore[] };
    // schema wired is TrackWithScoreSchema
    expect(calls[0]?.options.schema).toBeDefined();
    const t = res.results[0] as Track;
    expect(t.id).toBe('1');
});
