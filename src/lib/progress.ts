import { db } from '@/lib/db';

// Streaks are counted in whole days. We normalize both "now" and the stored
// lastActiveAt to UTC midnight so two sessions on the same calendar day never
// double-count, and a session the next day always increments by exactly one.
function toUtcDay(date: Date): number {
    return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000);
}

/**
 * Records practice activity for a user and advances their streak.
 *
 * Same day  → no change (streak already counted today)
 * Next day  → currentStreak + 1
 * Any gap   → streak resets to 1
 */
export async function recordActivity(userId: string) {
    const now = new Date();
    const today = toUtcDay(now);

    const existing = await db.streak.findUnique({ where: { userId } });

    if (!existing) {
        return db.streak.create({
            data: { userId, currentStreak: 1, bestStreak: 1, lastActiveAt: now },
        });
    }

    const lastDay = toUtcDay(new Date(existing.lastActiveAt));
    const dayGap = today - lastDay;

    // Already practiced today — keep the streak, just refresh the timestamp.
    if (dayGap === 0) {
        return db.streak.update({
            where: { userId },
            data: { lastActiveAt: now },
        });
    }

    const currentStreak = dayGap === 1 ? existing.currentStreak + 1 : 1;

    return db.streak.update({
        where: { userId },
        data: {
            currentStreak,
            bestStreak: Math.max(existing.bestStreak, currentStreak),
            lastActiveAt: now,
        },
    });
}
