import type { ApiResult, RequestFn } from '../core/request';
import {
    type AutocompleteMatch,
    AutocompleteMatchSchema,
    type AutocompleteParams,
    AutocompleteParamsSchema,
    type AutocompleteResults,
    AutocompleteResultsSchema,
} from '../schemas/autocomplete';
import { parseParams } from './util';

export interface AutocompleteApi {
    /**
     * Autocomplete search (`GET /autocomplete`). Cacheable.
     *
     * Unlike other endpoints, `results` is an object keyed by entity
     * (`tags`/`artists`/`tracks`/`albums`), not an array. This is the one
     * caller that gets `ApiResult<AutocompleteMatch, AutocompleteResults>` —
     * `results` is the whole `AutocompleteResults` object.
     */
    autocomplete(params: AutocompleteParams): Promise<ApiResult<AutocompleteMatch, AutocompleteResults>>;
}

export function autocomplete(request: RequestFn): AutocompleteApi {
    return {
        autocomplete: async (params) =>
            request<AutocompleteMatch, AutocompleteResults>(
                'GET',
                '/autocomplete',
                parseParams(AutocompleteParamsSchema, params),
                {
                    opId: 'autocomplete',
                    // Element schema is required by RequestOptions but ignored
                    // when resultsSchema is set; resultsSchema drives validation.
                    schema: AutocompleteMatchSchema,
                    resultsSchema: AutocompleteResultsSchema,
                    cache: true,
                }
            ),
    };
}
