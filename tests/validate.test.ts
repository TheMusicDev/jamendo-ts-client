import { expect, test } from 'bun:test';
import { validateResults } from '../src/core/validate';
import { JamendoSchemaError } from '../src/errors';
import { TrackSchema, TrackWithScoreSchema } from '../src/schemas/tracks';

const validTrack = {
    id: '10',
    name: 'Song',
    duration: 200,
    artist_id: '5',
    artist_name: 'Artist',
    audio: 'https://example.com/a.mp3',
    audiodownload_allowed: true,
    musicinfo: { vocalinstrumental: 'vocal', lang: 'en', tags: { genres: ['rock'] } },
};

test('validateResults: valid tracks pass through', () => {
    const out = validateResults([validTrack], TrackSchema, 'listTracks');
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe('10');
    expect(out[0]?.musicinfo?.tags?.genres).toEqual(['rock']);
});

test('validateResults: strips unknown fields', () => {
    const out = validateResults([{ ...validTrack, newField: 'drop', future: 123 }], TrackSchema, 'listTracks');
    expect(out[0]).not.toHaveProperty('newField');
    expect(out[0]).not.toHaveProperty('future');
});

test('validateResults: missing required id throws JamendoSchemaError', () => {
    expect(() => validateResults([{ name: 'no id' }], TrackSchema, 'listTracks')).toThrow(JamendoSchemaError);
});

test('validateResults: wrong type throws JamendoSchemaError with issues', () => {
    try {
        validateResults([{ id: '1', name: 'x', duration: 'not-int' }], TrackSchema, 'listTracks');
        expect.unreachable('should throw');
    } catch (err) {
        expect(err).toBeInstanceOf(JamendoSchemaError);
        expect((err as JamendoSchemaError).issues).toBeInstanceOf(Array);
    }
});

test('validateResults: empty array is valid', () => {
    expect(validateResults([], TrackSchema, 'listTracks')).toEqual([]);
});

test('validateResults: TrackWithScore accepts score', () => {
    const out = validateResults([{ ...validTrack, score: 0.87 }], TrackWithScoreSchema, 'tracksSimilar');
    expect(out[0]?.score).toBe(0.87);
});

test('validateResults: invalid url field throws', () => {
    expect(() => validateResults([{ ...validTrack, audio: 'not-a-url' }], TrackSchema, 'listTracks')).toThrow(
        JamendoSchemaError
    );
});
