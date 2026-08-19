import type { KeyvStoreAdapter } from 'keyv';

/** Cache configuration. Default store is in-memory (Keyv default). */
export interface CacheConfig {
    enabled?: boolean;
    /** Keyv-compatible store or a store URI (e.g. `redis://`, `sqlite://`). */
    store?: KeyvStoreAdapter | string;
    defaultTtlMs?: number;
    /** Per-endpoint TTL override, keyed by operationId. */
    ttlByEndpoint?: Record<string, number>;
}

export interface RateLimitInfo {
    attempt: number;
    maxRetries: number;
    warnings: string;
}

/** Rate-limit / retry configuration (reactive backoff on envelope code 6). */
export interface RateLimitConfig {
    maxRetries?: number;
    backoffBaseMs?: number;
    backoffMaxMs?: number;
    jitter?: boolean;
    /** Preemptive throttle: min gap between dispatched requests. 0 = off. */
    minIntervalMs?: number;
    /** Max concurrent in-flight requests. Infinity = no limit. */
    maxConcurrent?: number;
    onRateLimit?: (info: RateLimitInfo) => void;
}

export interface ClientConfig {
    /** Jamendo API key (required). Sent as `client_id`. */
    clientId: string;
    /** OAuth2 access token for user-scoped endpoints. */
    accessToken?: string;
    baseUrl?: string;
    timeoutMs?: number;
    cache?: CacheConfig;
    rateLimit?: RateLimitConfig;
    /** Injectable fetch (passed to ofetch); primarily for tests. */
    fetch?: typeof fetch;
}

/** Resolved config with all defaults filled. */
export interface ResolvedConfig {
    clientId: string;
    accessToken: string;
    baseUrl: string;
    timeoutMs: number;
    fetch: typeof fetch;
    cache: {
        enabled: boolean;
        store?: KeyvStoreAdapter | string;
        defaultTtlMs: number;
        ttlByEndpoint: Record<string, number>;
    };
    rateLimit: {
        maxRetries: number;
        backoffBaseMs: number;
        backoffMaxMs: number;
        jitter: boolean;
        minIntervalMs: number;
        maxConcurrent: number;
        onRateLimit: (info: RateLimitInfo) => void;
    };
}

const DEFAULTS = {
    baseUrl: 'https://api.jamendo.com/v3.0',
    timeoutMs: 30_000,
    cache: { enabled: true, defaultTtlMs: 60_000, ttlByEndpoint: {} },
    rateLimit: {
        maxRetries: 3,
        backoffBaseMs: 500,
        backoffMaxMs: 8_000,
        jitter: true,
        minIntervalMs: 0,
        maxConcurrent: Number.POSITIVE_INFINITY,
        onRateLimit: () => {},
    },
} as const;

/** Merge user config with defaults into a fully-resolved config. */
export function resolveConfig(config: ClientConfig): ResolvedConfig {
    if (!config.clientId) {
        throw new TypeError('createJamendoClient: clientId is required');
    }
    const resolved: ResolvedConfig = {
        clientId: config.clientId,
        accessToken: config.accessToken ?? '',
        baseUrl: config.baseUrl ?? DEFAULTS.baseUrl,
        timeoutMs: config.timeoutMs ?? DEFAULTS.timeoutMs,
        fetch: config.fetch ?? fetch,
        cache: {
            enabled: config.cache?.enabled ?? DEFAULTS.cache.enabled,
            store: config.cache?.store,
            defaultTtlMs: config.cache?.defaultTtlMs ?? DEFAULTS.cache.defaultTtlMs,
            ttlByEndpoint: config.cache?.ttlByEndpoint ?? DEFAULTS.cache.ttlByEndpoint,
        },
        rateLimit: {
            maxRetries: config.rateLimit?.maxRetries ?? DEFAULTS.rateLimit.maxRetries,
            backoffBaseMs: config.rateLimit?.backoffBaseMs ?? DEFAULTS.rateLimit.backoffBaseMs,
            backoffMaxMs: config.rateLimit?.backoffMaxMs ?? DEFAULTS.rateLimit.backoffMaxMs,
            jitter: config.rateLimit?.jitter ?? DEFAULTS.rateLimit.jitter,
            minIntervalMs: config.rateLimit?.minIntervalMs ?? DEFAULTS.rateLimit.minIntervalMs,
            maxConcurrent: config.rateLimit?.maxConcurrent ?? DEFAULTS.rateLimit.maxConcurrent,
            onRateLimit: config.rateLimit?.onRateLimit ?? DEFAULTS.rateLimit.onRateLimit,
        },
    };
    // A nonpositive concurrency cap deadlocks: the first acquire waits for a
    // slot that can never free (nothing ever runs to call release), so every
    // request hangs. Fail loud on misconfiguration instead.
    if (Number.isFinite(resolved.rateLimit.maxConcurrent) && resolved.rateLimit.maxConcurrent <= 0) {
        throw new RangeError('createJamendoClient: rateLimit.maxConcurrent must be a positive number (or Infinity)');
    }
    return resolved;
}
