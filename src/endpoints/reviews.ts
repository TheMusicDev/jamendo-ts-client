import type { ApiResult, RequestFn } from '../core/request';
import {
    type AlbumReview,
    AlbumReviewSchema,
    type AlbumReviewsParams,
    AlbumReviewsParamsSchema,
    type TrackReview,
    TrackReviewSchema,
    type TrackReviewsParams,
    TrackReviewsParamsSchema,
} from '../schemas/reviews';
import { parseParams } from './util';

export interface ReviewsApi {
    /** List album reviews (`GET /reviews/albums`). Cacheable. */
    albums(params?: AlbumReviewsParams): Promise<ApiResult<AlbumReview>>;
    /** List track reviews (`GET /reviews/tracks`). Cacheable. */
    tracks(params?: TrackReviewsParams): Promise<ApiResult<TrackReview>>;
}

export function reviews(request: RequestFn): ReviewsApi {
    return {
        albums: async (params = {}) =>
            request<AlbumReview>('GET', '/reviews/albums', parseParams(AlbumReviewsParamsSchema, params), {
                opId: 'listAlbumReviews',
                schema: AlbumReviewSchema,
                cache: true,
            }),
        tracks: async (params = {}) =>
            request<TrackReview>('GET', '/reviews/tracks', parseParams(TrackReviewsParamsSchema, params), {
                opId: 'listTrackReviews',
                schema: TrackReviewSchema,
                cache: true,
            }),
    };
}
