import { expect, test } from 'bun:test';
import type { ApiResult, RequestFn, RequestOptions } from '../src/core/request';
import { radios } from '../src/endpoints/radios';
import type { RadioStream, RadioStreamParams } from '../src/schemas/radios';

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
            results: [
                {
                    id: 5,
                    name: 'jazz',
                    stream: 'https://stream.example.com/jazz',
                    playingnow: {
                        track_id: 42,
                        artist_name: 'Artist',
                        track_name: 'Track',
                    },
                    callmeback: '5000',
                },
            ],
            warnings: '',
        }) as Promise<ApiResult<unknown>>;
    }) as unknown as RequestFn;
    return { request, calls };
}

test('radios.stream: GET /radios/stream, opId getRadioStream, not cached (real-time)', async () => {
    const { request, calls } = mockRequest();
    const api = radios(request);
    await api.stream({ id: 5 });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe('GET');
    expect(calls[0]?.path).toBe('/radios/stream');
    expect(calls[0]?.options.opId).toBe('getRadioStream');
    expect(calls[0]?.options.cache).toBe(false);
});

test('radios.stream: passes id through', async () => {
    const { request, calls } = mockRequest();
    const api = radios(request);
    await api.stream({ id: 5 });
    expect(calls[0]?.params).toEqual({ id: 5 });
});

test('radios.stream: accepts name instead of id', async () => {
    const { request, calls } = mockRequest();
    const api = radios(request);
    await api.stream({ name: 'jazz' });
    expect(calls[0]?.params).toEqual({ name: 'jazz' });
});

test('radios.stream: strips unknown keys', async () => {
    const { request, calls } = mockRequest();
    const api = radios(request);
    await api.stream({ id: 5, bogus: 'x' } as unknown as RadioStreamParams);
    expect(calls[0]?.params).toEqual({ id: 5 });
});

test('radios.stream: accepts type www or pro', async () => {
    const { request, calls } = mockRequest();
    const api = radios(request);
    await api.stream({ id: 5, type: 'pro' });
    expect(calls[0]?.params).toEqual({ id: 5, type: 'pro' });
});

test('radios.stream: rejects invalid type enum', async () => {
    const { request } = mockRequest();
    const api = radios(request);
    await expect(api.stream({ id: 5, type: 'nope' } as unknown as RadioStreamParams)).rejects.toThrow();
});

test('radios.stream: accepts fullcount, imagesize, track_imagesize', async () => {
    const { request, calls } = mockRequest();
    const api = radios(request);
    await api.stream({ id: 5, fullcount: true, imagesize: 150, track_imagesize: 300 });
    expect(calls[0]?.params).toEqual({ id: 5, fullcount: true, imagesize: 150, track_imagesize: 300 });
});

test('radios.stream: drops offset/limit (not accepted by this endpoint)', async () => {
    const { request, calls } = mockRequest();
    const api = radios(request);
    await api.stream({ id: 5, offset: 0, limit: 10 } as unknown as RadioStreamParams);
    expect(calls[0]?.params).toEqual({ id: 5 });
});

test('radios.stream: returns ApiResult<RadioStream> shape', async () => {
    const { request } = mockRequest();
    const api = radios(request);
    const res = await api.stream({ id: 5 });
    expect(res.results).toHaveLength(1);
    const r = res.results[0] as RadioStream;
    expect(r.id).toBe(5);
    expect(r.name).toBe('jazz');
    expect(r.stream).toBe('https://stream.example.com/jazz');
    expect(r.playingnow?.track_id).toBe(42);
    expect(r.callmeback).toBe('5000');
});

test('radios.stream: schema is RadioStreamSchema (defined)', async () => {
    const { request, calls } = mockRequest();
    const api = radios(request);
    await api.stream({ id: 5 });
    expect(calls[0]?.options.schema).toBeDefined();
});
