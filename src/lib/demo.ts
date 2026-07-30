import { db } from '@/lib/db';

export const DEMO_EMAIL = 'demo@mockview.ai';
export const DEMO_NAME = 'Demo User';

/**
 * Returns the shared demo account, creating and populating it on first use.
 *
 * The account deliberately has no passwordHash: the normal credentials
 * provider rejects users without one, so this account is reachable only
 * through the dedicated "demo" provider and can never be password-guessed.
 *
 * Seeding runs only when the account has no interviews yet, so repeat demo
 * logins don't pile up duplicate history.
 */
export async function ensureDemoUser() {
    const user = await db.user.upsert({
        where: { email: DEMO_EMAIL },
        update: {},
        create: {
            email: DEMO_EMAIL,
            name: DEMO_NAME,
            location: 'San Francisco, CA',
            company: 'MockView Demo',
            bio: 'Exploring MockView AI with a pre-filled practice history.',
        },
    });

    const existingInterviews = await db.interview.count({ where: { userId: user.id } });
    if (existingInterviews === 0) {
        await seedDemoData(user.id);
    }

    return user;
}

// Realistic history so the dashboard, history list, and analytics charts all
// have something to show the moment a visitor lands on them.
async function seedDemoData(userId: string) {
    const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

    await db.interview.createMany({
        data: [
            {
                userId,
                type: 'behavioral',
                topic: 'Leadership & Teamwork',
                score: 88,
                duration: '26 min',
                questions: 5,
                feedback: { communication: 90, technical: 82, problemSolving: 86, confidence: 92 },
                coachTips: [
                    { type: 'strength', text: 'Strong use of the STAR structure with concrete metrics.', color: 'emerald' },
                    { type: 'improvement', text: 'Tighten the setup — you spent too long on context before the action.', color: 'amber' },
                    { type: 'tip', text: 'Close each answer by naming the measurable outcome.', color: 'blue' },
                ],
                createdAt: daysAgo(1),
            },
            {
                userId,
                type: 'technical',
                topic: 'React Performance',
                score: 91,
                duration: '31 min',
                questions: 6,
                feedback: { communication: 86, technical: 95, problemSolving: 90, confidence: 84 },
                coachTips: [
                    { type: 'strength', text: 'Excellent depth on memoization trade-offs.', color: 'emerald' },
                    { type: 'improvement', text: 'Say your assumptions out loud before optimizing.', color: 'amber' },
                ],
                createdAt: daysAgo(2),
            },
            {
                userId,
                type: 'system-design',
                topic: 'Distributed Cache',
                score: 74,
                duration: '38 min',
                questions: 4,
                feedback: { communication: 78, technical: 72, problemSolving: 68, confidence: 76 },
                coachTips: [
                    { type: 'improvement', text: 'Establish scale requirements before choosing components.', color: 'amber' },
                    { type: 'improvement', text: 'Address cache invalidation explicitly — you skipped it.', color: 'amber' },
                    { type: 'tip', text: 'Sketch the data flow first, then optimize a bottleneck.', color: 'blue' },
                ],
                createdAt: daysAgo(4),
            },
            {
                userId,
                type: 'behavioral',
                topic: 'Conflict Resolution',
                score: 83,
                duration: '22 min',
                questions: 5,
                feedback: { communication: 88, technical: 74, problemSolving: 80, confidence: 86 },
                createdAt: daysAgo(6),
            },
            {
                userId,
                type: 'technical',
                topic: 'API Design',
                score: 79,
                duration: '29 min',
                questions: 5,
                feedback: { communication: 80, technical: 82, problemSolving: 76, confidence: 78 },
                createdAt: daysAgo(9),
            },
        ],
    });

    await db.goal.createMany({
        data: [
            { userId, label: 'Complete 30 interviews', target: 30, metric: 'interviews' },
            { userId, label: 'Reach an 85 average', target: 85, metric: 'avgScore' },
            { userId, label: 'Hold a 14-day streak', target: 14, metric: 'streak' },
        ],
    });

    await db.streak.upsert({
        where: { userId },
        update: {},
        create: { userId, currentStreak: 3, bestStreak: 7, lastActiveAt: daysAgo(1) },
    });
}
