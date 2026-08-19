import { expect, test } from 'bun:test';

import { type ClientConfig, resolveConfig } from '../src/config';
import { createRateLimiter } from '../src/core/rateLimit';
import { JamendoError, JamendoRateLimit } from '../src/errors';

function makeRunner(extra: Partial<ClientConfig> = {}) {
    const { rateLimit, ...rest } = extra;
    return createRateLimiter(
        resolveConfig({
            clientId: 'c',
            rateLimit: { maxRetries: 2, backoffBaseMs: 1, backoffMaxMs: 2, jitter: false, ...rateLimit },
            ...rest,
        })
    );
}

test('rateLimit: retries JamendoRateLimit then succeeds', async () => {
    const { run } = makeRunner();
    let attempts = 0;
    const out = await run(async () => {
        attempts++;
        if (attempts < 3) throw new JamendoRateLimit('limited');
        return 'ok';
    });
    expect(out).toBe('ok');
    expect(attempts).toBe(3);
});

test('rateLimit: exhausts retries and rethrows JamendoRateLimit', async () => {
    const { run } = makeRunner();
    let attempts = 0;
    await expect(
        run(async () => {
            attempts++;
            throw new JamendoRateLimit('limited');
        })
    ).rejects.toThrow(JamendoRateLimit);
    // maxRetries=2 → initial + 2 retries = 3 attempts
    expect(attempts).toBe(3);
});

test('rateLimit: non-retryable error aborts immediately (no retries consumed)', async () => {
    const { run } = makeRunner();
    let attempts = 0;
    await expect(
        run(async () => {
            attempts++;
            throw new JamendoError({ code: 5, message: 'bad client id' });
        })
    ).rejects.toThrow(JamendoError);
    expect(attempts).toBe(1);
});

test('rateLimit: onRateLimit callback fires per code-6 attempt', async () => {
    const calls: number[] = [];
    const { run } = makeRunner({
        rateLimit: {
            maxRetries: 2,
            backoffBaseMs: 1,
            backoffMaxMs: 2,
            jitter: false,
            onRateLimit: (info) => calls.push(info.attempt),
        },
    });
    await expect(
        run(async () => {
            throw new JamendoRateLimit('limited', 'quota warn');
        })
    ).rejects.toThrow();
    expect(calls).toEqual([1, 2, 3]);
});

test('rateLimit: maxConcurrent=1 serializes calls', async () => {
    const { run } = makeRunner({ rateLimit: { maxRetries: 0, maxConcurrent: 1 } });
    let concurrent = 0;
    let maxSeen = 0;
    const task = async () => {
        concurrent++;
        maxSeen = Math.max(maxSeen, concurrent);
        await new Promise((r) => setTimeout(r, 10));
        concurrent--;
        return 'ok';
    };
    await Promise.all([run(task), run(task), run(task)]);
    expect(maxSeen).toBe(1);
});

test('rateLimit: minIntervalMs spaces concurrent dispatches (no burst)', async () => {
    const { run } = makeRunner({ rateLimit: { maxRetries: 0, minIntervalMs: 20 } });
    const times: number[] = [];
    const task = async () => {
        times.push(Date.now());
        return 'ok';
    };
    await Promise.all([run(task), run(task), run(task)]);
    times.sort((a, b) => a - b);
    for (let i = 1; i < times.length; i++) {
        // biome-ignore lint/style/noNonNullAssertion: loop starts at 1, both indices valid
        const gap = times[i]! - times[i - 1]!;
        // Spacing targets are minIntervalMs apart; the scheduler may wake ~1ms
        // early, so tolerate slack. The pre-fix burst gave gaps near 0.
        expect(gap).toBeGreaterThanOrEqual(15);
    }
});

test('rateLimit: nonpositive maxConcurrent is rejected (deadlock guard)', () => {
    expect(() => makeRunner({ rateLimit: { maxConcurrent: 0 } })).toThrow(RangeError);
    expect(() => makeRunner({ rateLimit: { maxConcurrent: -1 } })).toThrow(RangeError);
});

test('rateLimit: no throttle when both minInterval and concurrency are off', async () => {
    const { run } = makeRunner({ rateLimit: { maxRetries: 0 } });
    let concurrent = 0;
    let maxSeen = 0;
    const task = async () => {
        concurrent++;
        maxSeen = Math.max(maxSeen, concurrent);
        await new Promise((r) => setTimeout(r, 5));
        concurrent--;
        return 'ok';
    };
    await Promise.all([run(task), run(task)]);
    expect(maxSeen).toBe(2); // ran concurrently — no throttle
});
