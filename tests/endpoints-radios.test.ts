import { expect, test } from 'bun:test';
import type { ApiResult, RequestFn, RequestOptions } from '../src/core/request';
import { radios } from '../src/endpoints/radios';
import type { Radio } from '../src/schemas/radios';

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
            results: [{ id: 1, name: 'r' }],
            warnings: '',
        }) as Promise<ApiResult<unknown>>;
    }) as unknown as RequestFn;
    return { request, calls };
}

test('radios.list: defaults to empty params, GET /radios, cacheable, opId listRadios', async () => {
    const { request, calls } = mockRequest();
    const api = radios(request);
    await api.list();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe('GET');
    expect(calls[0]?.path).toBe('/radios');
    expect(calls[0]?.options.opId).toBe('listRadios');
    expect(calls[0]?.options.cache).toBe(true);
    expect(calls[0]?.params).toEqual({});
});

test('radios.list: validates and strips unknown keys', async () => {
    const { request, calls } = mockRequest();
    const api = radios(request);
    await api.list({ limit: 5, name: 'jazz', bogus: 'x' } as unknown as Parameters<typeof api.list>[0]);
    expect(calls[0]?.params).toEqual({ limit: 5, name: 'jazz' });
});

test('radios.list: rejects invalid type enum', async () => {
    const { request } = mockRequest();
    const api = radios(request);
    await expect(api.list({ type: 'nope' } as unknown as Parameters<typeof api.list>[0])).rejects.toThrow();
});

test('radios.list: accepts type www or pro', async () => {
    const { request, calls } = mockRequest();
    const api = radios(request);
    await api.list({ type: 'pro' });
    expect(calls[0]?.params).toEqual({ type: 'pro' });
});

test('radios.list: returns ApiResult<Radio> shape', async () => {
    const { request } = mockRequest();
    const api = radios(request);
    const res = await api.list();
    expect(res.results).toEqual([{ id: 1, name: 'r' }]);
    expect(res.warnings).toBe('');
});

test('radios.list: typed as Radio results (integer id)', async () => {
    const { request, calls } = mockRequest();
    const api = radios(request);
    const res = (await api.list()) as { results: Radio[] };
    expect(calls[0]?.options.schema).toBeDefined();
    const r = res.results[0] as Radio;
    expect(r.id).toBe(1);
    expect(typeof r.id).toBe('number');
});
