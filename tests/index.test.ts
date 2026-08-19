import { expect, test } from 'bun:test';

import { JAMENDO_CLIENT_VERSION } from '../src/index';

test('exports client version', () => {
    expect(JAMENDO_CLIENT_VERSION).toBe('0.1.0');
});
