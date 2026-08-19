import type { ApiResult, RequestFn } from '../core/request';
import { type Radio, RadioSchema, type RadiosListParams, RadiosListParamsSchema } from '../schemas/radios';
import { parseParams } from './util';

export interface RadiosApi {
    /** List radios (`GET /radios`). Cacheable. */
    list(params?: RadiosListParams): Promise<ApiResult<Radio>>;
}

export function radios(request: RequestFn): RadiosApi {
    return {
        list: async (params = {}) =>
            request<Radio>('GET', '/radios', parseParams(RadiosListParamsSchema, params), {
                opId: 'listRadios',
                schema: RadioSchema,
                cache: true,
            }),
    };
}
