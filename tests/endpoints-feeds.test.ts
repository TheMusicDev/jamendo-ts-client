import { expect, test } from 'bun:test';
import type { ApiResult, RequestFn, RequestOptions } from '../src/core/request';
import { feeds } from '../src/endpoints/feeds';
import type { Feed } from '../src/schemas/feeds';

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
            results: [{ id: '1' }],
            warnings: '',
        }) as Promise<ApiResult<unknown>>;
    }) as unknown as RequestFn;
    return { request, calls };
}

test('feeds.list: defaults to empty params, GET /feeds, cacheable, opId listFeeds', async () => {
    const { request, calls } = mockRequest();
    const api = feeds(request);
    await api.list();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe('GET');
    expect(calls[0]?.path).toBe('/feeds');
    expect(calls[0]?.options.opId).toBe('listFeeds');
    expect(calls[0]?.options.cache).toBe(true);
    expect(calls[0]?.params).toEqual({});
});

test('feeds.list: validates and strips unknown keys', async () => {
    const { request, calls } = mockRequest();
    const api = feeds(request);
    await api.list({ limit: 5, lang: 'fr', bogus: 'x' } as unknown as Parameters<typeof api.list>[0]);
    expect(calls[0]?.params).toEqual({ limit: 5, lang: 'fr' });
});

test('feeds.list: rejects invalid lang enum', async () => {
    const { request } = mockRequest();
    const api = feeds(request);
    await expect(api.list({ lang: 'xx' } as unknown as Parameters<typeof api.list>[0])).rejects.toThrow();
});

test('feeds.list: rejects invalid target enum', async () => {
    const { request } = mockRequest();
    const api = feeds(request);
    await expect(api.list({ target: 'nope' } as unknown as Parameters<typeof api.list>[0])).rejects.toThrow();
});

test('feeds.list: accepts type array', async () => {
    const { request, calls } = mockRequest();
    const api = feeds(request);
    await api.list({ type: ['news', 'interview'] });
    expect(calls[0]?.params).toEqual({ type: ['news', 'interview'] });
});

test('feeds.list: returns ApiResult<Feed> shape', async () => {
    const { request } = mockRequest();
    const api = feeds(request);
    const res = await api.list();
    expect(res.results).toEqual([{ id: '1' }]);
    expect(res.warnings).toBe('');
});

test('feeds.list: typed as Feed results', async () => {
    const { request, calls } = mockRequest();
    const api = feeds(request);
    const res = (await api.list()) as { results: Feed[] };
    expect(calls[0]?.options.schema).toBeDefined();
    expect(res.results[0]?.id).toBe('1');
});
