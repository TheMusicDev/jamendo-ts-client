import type { ApiResult, RequestFn } from '../core/request';
import {
    type Radio,
    RadioSchema,
    type RadioStream,
    type RadioStreamParams,
    RadioStreamParamsSchema,
    RadioStreamSchema,
    type RadiosListParams,
    RadiosListParamsSchema,
} from '../schemas/radios';
import { parseParams } from './util';

export interface RadiosApi {
    /** List radios (`GET /radios`). Cacheable. */
    list(params?: RadiosListParams): Promise<ApiResult<Radio>>;
    /**
     * Get a radio's stream URL and currently playing track (`GET /radios/stream`).
     * Cacheable. One of `id` or `name` is required by the API.
     *
     * **Documented as unreliable by Jamendo** — the returned stream link "is
     * not more working, and it could be never fixed". Confirm against the
     * live API before depending on it; tolerate live failure.
     */
    stream(params: RadioStreamParams): Promise<ApiResult<RadioStream>>;
}

export function radios(request: RequestFn): RadiosApi {
    return {
        list: async (params = {}) =>
            request<Radio>('GET', '/radios', parseParams(RadiosListParamsSchema, params), {
                opId: 'listRadios',
                schema: RadioSchema,
                cache: true,
            }),
        stream: async (params) =>
            request<RadioStream>('GET', '/radios/stream', parseParams(RadioStreamParamsSchema, params), {
                opId: 'getRadioStream',
                schema: RadioStreamSchema,
                cache: true,
            }),
    };
}
