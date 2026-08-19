import type { ApiResult, RequestFn } from '../core/request';
import { type Feed, FeedSchema, type FeedsListParams, FeedsListParamsSchema } from '../schemas/feeds';
import { parseParams } from './util';

export interface FeedsApi {
    /** List editorial feeds (`GET /feeds`). Cacheable. */
    list(params?: FeedsListParams): Promise<ApiResult<Feed>>;
}

export function feeds(request: RequestFn): FeedsApi {
    return {
        list: async (params = {}) =>
            request<Feed>('GET', '/feeds', parseParams(FeedsListParamsSchema, params), {
                opId: 'listFeeds',
                schema: FeedSchema,
                cache: true,
            }),
    };
}
