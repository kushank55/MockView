/**
 * Optional Redis cache with an in-process fallback.
 *
 * Redis is used when REDIS_URL is set (production / shared rate-limit state).
 * If Redis is missing or errors, callers still get a working TTL map so a
 * cache/Redis outage cannot take down interviews.
 */

import { createClient, type RedisClientType } from 'redis';

type MemoryEntry = { value: string; expiresAt: number };

const memory = new Map<string, MemoryEntry>();

let redis: RedisClientType | null = null;
let redisFailed = false;
let connecting: Promise<RedisClientType | null> | null = null;

function memoryGet(key: string): string | null {
    const row = memory.get(key);
    if (!row) return null;
    if (row.expiresAt <= Date.now()) {
        memory.delete(key);
        return null;
    }
    return row.value;
}

function memorySet(key: string, value: string, ttlSeconds: number) {
    memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

function memoryDel(key: string) {
    memory.delete(key);
}

function memoryIncr(key: string, ttlSeconds: number): number {
    const current = Number(memoryGet(key) || '0') + 1;
    const existing = memory.get(key);
    const ttl = existing && existing.expiresAt > Date.now()
        ? Math.max(1, Math.ceil((existing.expiresAt - Date.now()) / 1000))
        : ttlSeconds;
    memorySet(key, String(current), current === 1 ? ttlSeconds : ttl);
    return current;
}

async function getRedis(): Promise<RedisClientType | null> {
    const url = process.env.REDIS_URL?.trim();
    if (!url || redisFailed) return null;
    if (redis?.isOpen) return redis;
    if (connecting) return connecting;

    connecting = (async () => {
        try {
            const client = createClient({ url }) as RedisClientType;
            client.on('error', (err) => {
                console.error('Redis client error:', err);
                redisFailed = true;
            });
            await client.connect();
            redis = client;
            return client;
        } catch (error) {
            console.error('Redis connect failed, using in-memory fallback:', error);
            redisFailed = true;
            redis = null;
            return null;
        } finally {
            connecting = null;
        }
    })();

    return connecting;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
    try {
        const client = await getRedis();
        const raw = client ? await client.get(key) : memoryGet(key);
        if (!raw) return null;
        return JSON.parse(raw) as T;
    } catch (error) {
        console.error('cacheGet failed:', error);
        return null;
    }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const payload = JSON.stringify(value);
    try {
        const client = await getRedis();
        if (client) {
            await client.set(key, payload, { expiration: { type: 'EX', value: ttlSeconds } });
            return;
        }
    } catch (error) {
        console.error('cacheSet redis failed:', error);
    }
    memorySet(key, payload, ttlSeconds);
}

/** SET NX — used as a short exclusive lock so duplicate AI turns don't fire twice. */
export async function cacheSetNx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    try {
        const client = await getRedis();
        if (client) {
            const result = await client.set(key, value, {
                expiration: { type: 'EX', value: ttlSeconds },
                condition: 'NX',
            });
            return result === 'OK';
        }
    } catch (error) {
        console.error('cacheSetNx redis failed:', error);
    }
    if (memoryGet(key)) return false;
    memorySet(key, value, ttlSeconds);
    return true;
}

export async function cacheDel(key: string): Promise<void> {
    try {
        const client = await getRedis();
        if (client) {
            await client.del(key);
        }
    } catch (error) {
        console.error('cacheDel redis failed:', error);
    }
    memoryDel(key);
}

export async function cacheIncr(key: string, ttlSeconds: number): Promise<number> {
    try {
        const client = await getRedis();
        if (client) {
            const count = await client.incr(key);
            if (count === 1) await client.expire(key, ttlSeconds);
            return count;
        }
    } catch (error) {
        console.error('cacheIncr redis failed:', error);
    }
    return memoryIncr(key, ttlSeconds);
}

export const DASHBOARD_CACHE_TTL_SECONDS = 45;

export function dashboardCacheKey(userId: string) {
    return `dashboard:v1:${userId}`;
}
