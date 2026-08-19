import type { ApiResult, RequestFn } from '../core/request';
import {
    type SimilarTracksParams,
    SimilarTracksParamsSchema,
    type Track,
    TrackSchema,
    type TracksListParams,
    TracksListParamsSchema,
    type TrackWithScore,
    TrackWithScoreSchema,
} from '../schemas/tracks';
import { parseParams } from './util';

export interface TracksApi {
    /** List tracks (`GET /tracks`). Cacheable. */
    list(params?: TracksListParams): Promise<ApiResult<Track>>;
    /** Find tracks similar to a track (`GET /tracks/similar`). Cacheable. */
    similar(params: SimilarTracksParams): Promise<ApiResult<TrackWithScore>>;
}

export function tracks(request: RequestFn): TracksApi {
    return {
        list: async (params = {}) =>
            request<Track>('GET', '/tracks', parseParams(TracksListParamsSchema, params), {
                opId: 'listTracks',
                schema: TrackSchema,
                cache: true,
            }),
        similar: async (params) =>
            request<TrackWithScore>('GET', '/tracks/similar', parseParams(SimilarTracksParamsSchema, params), {
                opId: 'listSimilarTracks',
                schema: TrackWithScoreSchema,
                cache: true,
            }),
    };
}
