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

export const AutocompleteMatchSchema = z.object({
    match: z.string(),
    /** Only present when `matchcount=true` is passed. */
    count: z.number().int().optional(),
});

export const AutocompleteResultsSchema = z.object({
    tags: z.array(AutocompleteMatchSchema).optional(),
    artists: z.array(AutocompleteMatchSchema).optional(),
    tracks: z.array(AutocompleteMatchSchema).optional(),
    albums: z.array(AutocompleteMatchSchema).optional(),
});

export type AutocompleteMatch = z.infer<typeof AutocompleteMatchSchema>;
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
