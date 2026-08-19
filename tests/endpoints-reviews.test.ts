import { expect, test } from 'bun:test';
import type { ApiResult, RequestFn, RequestOptions } from '../src/core/request';
import { reviews } from '../src/endpoints/reviews';
import type { AlbumReview, TrackReview } from '../src/schemas/reviews';

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
            results: [{ id: '1', title: 't', text: 'body' }],
            warnings: '',
        }) as Promise<ApiResult<unknown>>;
    }) as unknown as RequestFn;
    return { request, calls };
}

test('reviews.albums: defaults to empty params, GET /reviews/albums, cacheable, opId listAlbumReviews', async () => {
    const { request, calls } = mockRequest();
    const api = reviews(request);
    await api.albums();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe('GET');
    expect(calls[0]?.path).toBe('/reviews/albums');
    expect(calls[0]?.options.opId).toBe('listAlbumReviews');
    expect(calls[0]?.options.cache).toBe(true);
    expect(calls[0]?.params).toEqual({});
});

test('reviews.albums: validates and strips unknown keys', async () => {
    const { request, calls } = mockRequest();
    const api = reviews(request);
    await api.albums({ limit: 5, album_id: [42], bogus: 'x' } as unknown as Parameters<typeof api.albums>[0]);
    expect(calls[0]?.params).toEqual({ limit: 5, album_id: [42] });
});

test('reviews.albums: rejects invalid order enum', async () => {
    const { request } = mockRequest();
    const api = reviews(request);
    await expect(api.albums({ order: ['nope'] } as unknown as Parameters<typeof api.albums>[0])).rejects.toThrow();
});

test('reviews.albums: does not accept access_token (fetcher injects it)', async () => {
    const { request, calls } = mockRequest();
    const api = reviews(request);
    await api.albums({ access_token: 'tok' } as unknown as Parameters<typeof api.albums>[0]);
    expect(calls[0]?.params).toEqual({});
});

test('reviews.tracks: GET /reviews/tracks, opId listTrackReviews, accepts track_id + audioformat', async () => {
    const { request, calls } = mockRequest();
    const api = reviews(request);
    await api.tracks({ track_id: [7], audioformat: 'ogg' });
    expect(calls[0]?.path).toBe('/reviews/tracks');
    expect(calls[0]?.options.opId).toBe('listTrackReviews');
    expect(calls[0]?.params).toEqual({ track_id: [7], audioformat: 'ogg' });
});

test('reviews.albums: returns ApiResult<AlbumReview> shape', async () => {
    const { request } = mockRequest();
    const api = reviews(request);
    const res = await api.albums();
    expect(res.results).toEqual([{ id: '1', title: 't', text: 'body' }]);
    expect(res.warnings).toBe('');
});

test('reviews.albums: typed as AlbumReview results', async () => {
    const { request, calls } = mockRequest();
    const api = reviews(request);
    const res = (await api.albums()) as { results: AlbumReview[] };
    expect(calls[0]?.options.schema).toBeDefined();
    const r = res.results[0] as AlbumReview;
    expect(r.id).toBe('1');
});

test('reviews.tracks: typed as TrackReview results', async () => {
    const { request, calls } = mockRequest();
    const api = reviews(request);
    const res = (await api.tracks()) as { results: TrackReview[] };
    expect(calls[0]?.options.schema).toBeDefined();
    const r = res.results[0] as TrackReview;
    expect(r.title).toBe('t');
});
