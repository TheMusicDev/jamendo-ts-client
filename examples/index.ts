/**
 * Example consumer for @themusicdev/jamendo-ts-client — imports directly
 * from ../dist (run `bun run build` first) rather than through the package
 * name, so it always exercises the current local build.
 *
 * Run from the repo root so Bun auto-loads the root .env:
 *   bun examples/index.ts
 * Or from inside examples/ — the script falls back to ../.env.
 */
import { createJamendoClient, JamendoError, JamendoRateLimit, JamendoSchemaError } from '../dist/index.js';

// ponytail: Bun auto-loads .env from cwd only; fall back to repo root .env
// so this example works whether run from examples/ or the repo root.
if (!process.env.JAMENDO_CLIENT_ID) {
    const text = await Bun.file('../.env')
        .text()
        .catch(() => '');
    for (const line of text.split('\n')) {
        const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!m) continue;
        const [, key, rawValue] = m;
        if (key && rawValue !== undefined && !process.env[key]) {
            process.env[key] = rawValue.replace(/^["']|["']$/g, '');
        }
    }
}

const clientId = process.env.JAMENDO_CLIENT_ID;
if (!clientId) {
    console.error('JAMENDO_CLIENT_ID missing. Run from repo root or fill examples/.env.');
    process.exit(1);
}

const client = createJamendoClient({ clientId });

console.log('=== tracks.list ===');
const tracks = await client.tracks.list({
    limit: 3,
    namesearch: 'rock',
    include: ['musicinfo', 'stats'],
});
console.log(`results: ${tracks.resultsCount} / full ${tracks.resultsFullcount}`);
for (const t of tracks.results) {
    console.log(`  ${t.id}  ${t.name}  audio=${t.audio ?? '(none)'}`);
}
if (tracks.warnings?.length) console.log('  warnings:', tracks.warnings);

console.log('\n=== artists.list ===');
const artists = await client.artists.list({ limit: 3, namesearch: 'rock' });
for (const a of artists.results) {
    console.log(`  ${a.id}  ${a.name}  ${a.website ?? ''}`);
}

console.log('\n=== albums.list ===');
const albums = await client.albums.list({ limit: 3, namesearch: 'rock' });
for (const al of albums.results) {
    console.log(`  ${al.id}  ${al.name}  by ${al.artist_name ?? '?'}`);
}

console.log('\n=== error path (invalid client) ===');
const bad = createJamendoClient({ clientId: 'bogus-client-id' });
try {
    await bad.tracks.list({ limit: 1 });
} catch (err) {
    if (err instanceof JamendoRateLimit) {
        console.log('  rate-limited:', err.message);
    } else if (err instanceof JamendoSchemaError) {
        console.log('  schema drift:', err.message);
    } else if (err instanceof JamendoError) {
        console.log(`  JamendoError code=${err.code} type=${err.type}: ${err.message}`);
    } else {
        console.log('  unexpected:', err);
    }
}

console.log('\ndone.');
