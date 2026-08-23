import { z } from 'zod';

/**
 * Autocomplete resource zod schemas (hand-written from openapi-3.1.yaml
 * `AutocompleteMatch`, `AutocompleteResults`). Strip mode: unknown fields
 * dropped, typed fields enforced.
 *
 * Unlike every other list endpoint, `/autocomplete` does NOT return the
 * standard array envelope. `results` is an object keyed by entity
 * (`tags?`/`artists?`/`tracks?`/`albums?`), each an array of matches. This is
 * the one endpoint that uses the `resultsSchema` (whole-results) path in
 * `core/request.ts` instead of the element-schema array path.
 */

/**
 * Without `matchcount=true` each entry is a bare match string; with it, an
 * object carrying the match count. The API switches shape per-request, not
 * per-entity, so every bucket accepts either.
 */
export const AutocompleteMatchSchema = z.union([
    z.string(),
    z.object({
        match: z.string(),
        count: z.number().int().optional(),
    }),
]);

/**
 * The API intermittently sends `results: []` (an empty array) instead of the
 * keyed object when there are no matches in any bucket — an empty-results
 * sentinel, not a documented alternate shape. Normalized to `{}` before
 * validating, so callers only ever see the object shape below and never the
 * raw `[]`; a bare `[]` carries no bucket data either way, so nothing is
 * lost by collapsing it.
 */
export const AutocompleteResultsSchema = z.preprocess(
    (val) => (Array.isArray(val) ? {} : val),
    z.object({
        tags: z.array(AutocompleteMatchSchema).optional(),
        artists: z.array(AutocompleteMatchSchema).optional(),
        tracks: z.array(AutocompleteMatchSchema).optional(),
        albums: z.array(AutocompleteMatchSchema).optional(),
    })
);

export type AutocompleteMatch = z.infer<typeof AutocompleteMatchSchema>;

/**
 * Always the keyed-bucket shape — `AutocompleteResultsSchema` normalizes the
 * API's occasional `results: []` sentinel to `{}` at parse time, so this
 * type never reflects a raw array.
 */
export type AutocompleteResults = z.infer<typeof AutocompleteResultsSchema>;

/**
 * `/autocomplete` (autocomplete) query params. Does NOT extend `ListParamsSchema`
 * — `limit` is a string here (results per entity, not the standard number/`all`
 * union) and there is no `offset`. `prefix` is required (min length 2).
 */
export const AutocompleteParamsSchema = z.object({
    prefix: z.string().min(2),
    limit: z.string().optional(),
    fullcount: z.boolean().optional(),
    entity: z.array(z.enum(['artists', 'albums', 'tracks', 'tags'])).optional(),
    matchcount: z.boolean().optional(),
});

export type AutocompleteParams = z.infer<typeof AutocompleteParamsSchema>;
