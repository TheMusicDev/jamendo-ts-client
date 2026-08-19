import { expect, test } from 'bun:test';
import type { ApiResult, RequestFn, RequestOptions } from '../src/core/request';
import { autocomplete } from '../src/endpoints/autocomplete';
import type { AutocompleteResults } from '../src/schemas/autocomplete';

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
        // Canned shape matches AutocompleteResults (object keyed by entity).
        return Promise.resolve({
            results: { artists: [{ match: 'rock' }] },
            warnings: '',
        }) as Promise<ApiResult<unknown, unknown>>;
    }) as unknown as RequestFn;
    return { request, calls };
}

test('autocomplete: GET /autocomplete, opId autocomplete, cacheable', async () => {
    const { request, calls } = mockRequest();
    const api = autocomplete(request);
    await api.autocomplete({ prefix: 'ro' });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe('GET');
    expect(calls[0]?.path).toBe('/autocomplete');
    expect(calls[0]?.options.opId).toBe('autocomplete');
    expect(calls[0]?.options.cache).toBe(true);
});

test('autocomplete: wires resultsSchema (whole-results path), not array element path', async () => {
    const { request, calls } = mockRequest();
    const api = autocomplete(request);
    await api.autocomplete({ prefix: 'ro' });
    expect(calls[0]?.options.resultsSchema).toBeDefined();
    // schema (element) is still required by RequestOptions but ignored.
    expect(calls[0]?.options.schema).toBeDefined();
});

test('autocomplete: passes prefix + entity + matchcount through', async () => {
    const { request, calls } = mockRequest();
    const api = autocomplete(request);
    await api.autocomplete({ prefix: 'rock', entity: ['artists', 'tracks'], matchcount: true });
    expect(calls[0]?.params).toEqual({ prefix: 'rock', entity: ['artists', 'tracks'], matchcount: true });
});

test('autocomplete: strips unknown keys', async () => {
    const { request, calls } = mockRequest();
    const api = autocomplete(request);
    await api.autocomplete({ prefix: 'ro', bogus: 'x' } as unknown as Parameters<typeof api.autocomplete>[0]);
    expect(calls[0]?.params).toEqual({ prefix: 'ro' });
});

test('autocomplete: rejects missing required prefix', async () => {
    const { request } = mockRequest();
    const api = autocomplete(request);
    await expect(api.autocomplete({} as unknown as Parameters<typeof api.autocomplete>[0])).rejects.toThrow();
});

test('autocomplete: rejects prefix shorter than 2 chars', async () => {
    const { request } = mockRequest();
    const api = autocomplete(request);
    await expect(
        api.autocomplete({ prefix: 'a' } as unknown as Parameters<typeof api.autocomplete>[0])
    ).rejects.toThrow();
});

test('autocomplete: rejects invalid entity enum', async () => {
    const { request } = mockRequest();
    const api = autocomplete(request);
    await expect(
        api.autocomplete({ prefix: 'ro', entity: ['nope'] } as unknown as Parameters<typeof api.autocomplete>[0])
    ).rejects.toThrow();
});

test('autocomplete: returns ApiResult with AutocompleteResults (object, not array)', async () => {
    const { request } = mockRequest();
    const api = autocomplete(request);
    const res = await api.autocomplete({ prefix: 'ro' });
    expect(res.results).toEqual({ artists: [{ match: 'rock' }] } satisfies AutocompleteResults);
    expect(res.warnings).toBe('');
    // Keyed-by-entity object, not an array.
    expect(Array.isArray(res.results)).toBe(false);
});
