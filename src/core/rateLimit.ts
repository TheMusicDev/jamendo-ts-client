import pRetry from 'p-retry';

import type { ResolvedConfig } from '../config';
import { JamendoRateLimit } from '../errors';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Preemptive throttle (optional, off by default). Spaces out dispatches and/or
 * caps concurrency before the p-retry chain runs.
 */
interface Throttle {
    acquire(): Promise<void>;
    release(): void;
}

function createThrottle(config: ResolvedConfig): Throttle | null {
    const { minIntervalMs, maxConcurrent } = config.rateLimit;
    if (minIntervalMs <= 0 && !Number.isFinite(maxConcurrent)) {
        return null;
    }

    let lastDispatch = 0;
    let inFlight = 0;
    const waiters: Array<() => void> = [];

    return {
        async acquire() {
            if (Number.isFinite(maxConcurrent)) {
                while (inFlight >= maxConcurrent) {
                    await new Promise<void>((resolve) => waiters.push(resolve));
                }
                inFlight++;
            }
            if (minIntervalMs > 0) {
                // Claim the next dispatch slot synchronously before awaiting,
                // so concurrent acquires each compute against an updated
                // lastDispatch instead of racing on the same value and
                // dispatching as a burst.
                const now = Date.now();
                const target = Math.max(now, lastDispatch + minIntervalMs);
                lastDispatch = target;
                const wait = target - now;
                if (wait > 0) {
                    await sleep(wait);
                }
            }
        },
        release() {
            if (Number.isFinite(maxConcurrent)) {
                inFlight--;
                const next = waiters.shift();
                next?.();
            }
        },
    };
}

/**
 * Reactive rate-limit handling. Wraps an envelope-aware call in `p-retry`:
 * only {@link JamendoRateLimit} (envelope code 6) is retried, with exponential
 * backoff + jitter. Every other error is rethrown from `onFailedAttempt` so it
 * aborts immediately instead of consuming attempts. Jamendo sends no
 * `Retry-After`, so backoff is self-computed.
 */
export type RetryFn<T> = (attempt: number) => Promise<T>;

export function createRateLimiter(config: ResolvedConfig) {
    const rl = config.rateLimit;
    const throttle = createThrottle(config);

    async function run<T>(fn: RetryFn<T>): Promise<T> {
        const exec = () =>
            pRetry<T>(fn, {
                retries: rl.maxRetries,
                minTimeout: rl.backoffBaseMs,
                maxTimeout: rl.backoffMaxMs,
                randomize: rl.jitter,
                onFailedAttempt: (ctx) => {
                    // p-retry v8 passes a context object; the thrown error is ctx.error.
                    const err = ctx.error;
                    if (!(err instanceof JamendoRateLimit)) {
                        throw err; // non-retryable — abort the retry loop
                    }
                    rl.onRateLimit({
                        attempt: ctx.attemptNumber,
                        maxRetries: rl.maxRetries,
                        warnings: err.warnings,
                    });
                },
            });

        if (!throttle) {
            return exec();
        }
        await throttle.acquire();
        try {
            return await exec();
        } finally {
            throttle.release();
        }
    }

    return { run };
}
