import { z } from 'zod';

/**
 * Shared resource-level zod schemas reused across albums/artists/feeds.
 * Hand-written from openapi-3.1.yaml `components/schemas`. Strip mode.
 */

/**
 * Localized descriptive text. Jamendo returns whichever languages a resource
 * has translations for; every field is optional and the set of keys is fixed
 * to the languages the API documents. Used by album/artist `musicinfo`
 * descriptions and feed `title`/`text`.
 */
export const LocalizedTextSchema = z.object({
    en: z.string().optional(),
    fr: z.string().optional(),
    es: z.string().optional(),
    de: z.string().optional(),
    pl: z.string().optional(),
    it: z.string().optional(),
    ru: z.string().optional(),
    pt: z.string().optional(),
    ja: z.string().optional(),
});

export type LocalizedText = z.infer<typeof LocalizedTextSchema>;
