import { databaseUnreachableResponse, db } from '@/lib/db';
import { cacheGet, cacheSet, DASHBOARD_CACHE_TTL_SECONDS, dashboardCacheKey } from '@/lib/cache';
import { jsonError } from '@/lib/http';
import { getSessionUser } from '@/lib/session';
import { resolveGoal } from '@/lib/goals';

interface PracticePlan {
    type: string;
    difficulty: string;
    topic: string;
}

const PRACTICE_PLANS: Record<string, PracticePlan> = {
    communication: {
        type: 'behavioral',
        difficulty: 'medium',
        topic: 'Explaining complex work clearly and structuring answers with STAR',
    },
    technical: {
        type: 'technical',
        difficulty: 'hard',
        topic: 'Core technical fundamentals with precise, specific answers',
    },
    problemSolving: {
        type: 'system-design',
        difficulty: 'medium',
        topic: 'Breaking down ambiguous problems and reasoning through trade-offs',
    },
    confidence: {
        type: 'behavioral',
        difficulty: 'easy',
        topic: 'Speaking with conviction about your accomplishments and impact',
    },
};

function buildInterviewLink(plan: PracticePlan): string {
    const params = new URLSearchParams({
        type: plan.type,
        difficulty: plan.difficulty,
        topic: plan.topic,
    });
    return `/interview?${params.toString()}`;
}

async function loadDashboard(userId: string) {
    const [aggregates, recentInterviews, feedbackSample, goals, streak, latestResumes] = await Promise.all([
        db.interview.aggregate({
            where: { userId },
            _count: true,
            _avg: { score: true },
        }),
        db.interview.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 7,
            select: { id: true, type: true, topic: true, score: true, createdAt: true },
        }),
        db.interview.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: { feedback: true },
        }),
        db.goal.findMany({
            where: { userId },
            select: { id: true, label: true, target: true, metric: true },
        }),
        db.streak.findUnique({
            where: { userId },
            select: { currentStreak: true, bestStreak: true, lastActiveAt: true },
        }),
        db.resumeAnalysis.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: { id: true, targetRole: true, atsScore: true, createdAt: true },
        }),
    ]);

    const latestResume = latestResumes[0] || null;
    const totalInterviews = aggregates._count;
    const avgScore = totalInterviews > 0 ? Math.round(aggregates._avg.score || 0) : 0;

    const activityItems = [
        ...recentInterviews.map((i) => ({
            type: 'interview',
            title: `${i.type.charAt(0).toUpperCase() + i.type.slice(1)} Interview`,
            subtitle: i.topic,
            score: i.score,
            time: i.createdAt,
        })),
        ...latestResumes.map((r) => ({
            type: 'resume',
            title: 'Resume ATS Analysis',
            subtitle: r.targetRole || 'General',
            score: r.atsScore,
            time: r.createdAt,
        })),
    ];

    const recentActivity = activityItems
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 5);

    const weeklyScores = recentInterviews.slice(0, 7).map((i) => i.score);

    const scoreBreakdown = {
        communication: 0,
        technical: 0,
        problemSolving: 0,
        confidence: 0,
    };

    let feedbackCount = 0;
    for (const interview of feedbackSample) {
        if (interview.feedback && typeof interview.feedback === 'object') {
            const fb = interview.feedback as Record<string, number>;
            scoreBreakdown.communication += fb.communication || 0;
            scoreBreakdown.technical += fb.technical || 0;
            scoreBreakdown.problemSolving += fb.problemSolving || 0;
            scoreBreakdown.confidence += fb.confidence || 0;
            feedbackCount++;
        }
    }

    if (feedbackCount > 0) {
        scoreBreakdown.communication = Math.round(scoreBreakdown.communication / feedbackCount);
        scoreBreakdown.technical = Math.round(scoreBreakdown.technical / feedbackCount);
        scoreBreakdown.problemSolving = Math.round(scoreBreakdown.problemSolving / feedbackCount);
        scoreBreakdown.confidence = Math.round(scoreBreakdown.confidence / feedbackCount);
    }

    const insights: { title: string; subtitle: string; action: string; link: string }[] = [];

    if (latestResume) {
        if (latestResume.atsScore < 65) {
            insights.push({
                title: 'Resume Optimization Needed',
                subtitle: `Your ATS match for ${latestResume.targetRole || 'roles'} is low. Focus on missing keywords.`,
                action: 'View Analysis',
                link: '/resume',
            });
        } else if (latestResume.atsScore > 85) {
            insights.push({
                title: 'Resume is ATS Ready',
                subtitle: 'Your resume passes ATS checks strongly. Time to practice interviews!',
                action: 'Start Interview',
                link: '/interview',
            });
        }
    } else {
        insights.push({
            title: 'Upload Your Resume',
            subtitle: 'Get AI insights on how well your resume matches target roles.',
            action: 'Analyze Now',
            link: '/resume',
        });
    }

    if (feedbackCount > 0) {
        const weaknesses = Object.entries(scoreBreakdown)
            .sort(([, a], [, b]) => a - b)
            .filter(([, score]) => score < 75);

        if (weaknesses.length > 0) {
            const [weakestSkill] = weaknesses[0];
            const formattedSkill = weakestSkill.charAt(0).toUpperCase() + weakestSkill.slice(1).replace(/([A-Z])/g, ' $1');
            const plan = PRACTICE_PLANS[weakestSkill] ?? PRACTICE_PLANS.communication;

            insights.push({
                title: `Improve ${formattedSkill}`,
                subtitle: `Your average is lower here. Let's do a targeted mock interview.`,
                action: 'Practice Topic',
                link: buildInterviewLink(plan),
            });
        }
    }

    if (insights.length < 2) {
        insights.push({
            title: 'System Design Practice',
            subtitle: 'Deepen your architectural knowledge.',
            action: 'Practice Now',
            link: buildInterviewLink({
                type: 'system-design',
                difficulty: 'medium',
                topic: 'Scalable system architecture and trade-offs',
            }),
        });
    }

    return {
        stats: {
            totalInterviews,
            avgScore,
            streak: streak?.currentStreak || 0,
            xp: totalInterviews * 100 + avgScore * 10,
        },
        recentActivity,
        weeklyScores,
        scoreBreakdown,
        insights: insights.slice(0, 2),
        goals: goals.map((g) =>
            resolveGoal(g, {
                totalInterviews,
                avgScore,
                currentStreak: streak?.currentStreak || 0,
                resumeScore: latestResume?.atsScore || 0,
            })
        ),
        streak: streak
            ? {
                current: streak.currentStreak,
                best: streak.bestStreak,
                lastActive: streak.lastActiveAt,
            }
            : { current: 0, best: 0, lastActive: null },
        resumeScore: latestResume?.atsScore || null,
    };
}

export async function GET() {
    try {
        const user = await getSessionUser();
        if (!user) return jsonError(401, 'UNAUTHORIZED', 'Unauthorized');

        const cacheKey = dashboardCacheKey(user.id);
        const cached = await cacheGet<Awaited<ReturnType<typeof loadDashboard>>>(cacheKey);
        if (cached) {
            return Response.json({ success: true, cached: true, ...cached });
        }

        const payload = await loadDashboard(user.id);
        await cacheSet(cacheKey, payload, DASHBOARD_CACHE_TTL_SECONDS);
        return Response.json({ success: true, cached: false, ...payload });
    } catch (error) {
        console.error('GET /api/dashboard error:', error);
        return (
            databaseUnreachableResponse(error) ??
            jsonError(500, 'INTERNAL_ERROR', 'Failed to fetch dashboard data')
        );
    }
}
