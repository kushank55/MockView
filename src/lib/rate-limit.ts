import { cacheIncr } from './cache';
import { jsonError } from './http';

function envInt(name: string, fallback: number): number {
    const n = Number.parseInt(process.env[name] || '', 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function aiRateLimits() {
    return {
        perMinute: envInt('AI_RATE_LIMIT_PER_MINUTE', 20),
        perHour: envInt('AI_RATE_LIMIT_PER_HOUR', 80),
        ipPerMinute: envInt('AI_RATE_LIMIT_IP_PER_MINUTE', 40),
    };
}

export function clientIp(req: Request): string {
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
    return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

/**
 * Sliding fixed-window counters. User limits stop a single account from
 * burning Gemini quota; IP limits catch unauthenticated bursts / shared NATs
 * slightly more loosely.
 *
 * Store failures fall through to the in-memory counter inside cacheIncr.
 */
export async function enforceAiRateLimit(userId: string, ip: string) {
    const limits = aiRateLimits();
    const [userMinute, userHour, ipMinute] = await Promise.all([
        cacheIncr(`rl:ai:m:${userId}`, 60),
        cacheIncr(`rl:ai:h:${userId}`, 3600),
        cacheIncr(`rl:ai:ip:${ip}`, 60),
    ]);

    if (userMinute > limits.perMinute) {
        return {
            allowed: false as const,
            retryAfterSec: 60,
            reason: 'per-minute user limit',
        };
    }
    if (userHour > limits.perHour) {
        return {
            allowed: false as const,
            retryAfterSec: 3600,
            reason: 'per-hour user limit',
        };
    }
    if (ipMinute > limits.ipPerMinute) {
        return {
            allowed: false as const,
            retryAfterSec: 60,
            reason: 'per-minute IP limit',
        };
    }
    return { allowed: true as const };
}

export function rateLimitResponse(retryAfterSec: number) {
    const res = jsonError(
        429,
        'RATE_LIMIT_EXCEEDED',
        'Too many AI requests. Please try again later.'
    );
    res.headers.set('Retry-After', String(retryAfterSec));
    return res;
}
