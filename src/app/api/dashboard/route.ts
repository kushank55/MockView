import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/dashboard — Aggregated dashboard data
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !(session.user as { id?: string }).id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = (session.user as { id: string }).id;

        // Fetch all data in parallel
        const [interviews, goals, streak, latestResume] = await Promise.all([
            db.interview.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            }),
            db.goal.findMany({
                where: { userId },
            }),
            db.streak.findFirst({
                where: { userId },
            }),
            db.resumeAnalysis.findFirst({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        // Compute stats
        const totalInterviews = interviews.length;
        const avgScore =
            totalInterviews > 0
                ? Math.round(interviews.reduce((sum, i) => sum + i.score, 0) / totalInterviews)
                : 0;

        // Recent activity (last 5)
        const recentActivity = interviews.slice(0, 5).map((interview) => ({
            type: 'interview',
            title: `${interview.type.charAt(0).toUpperCase() + interview.type.slice(1)} Interview`,
            subtitle: interview.topic,
            score: interview.score,
            time: interview.createdAt,
        }));

        // Weekly performance — last 7 interviews
        const weeklyScores = interviews.slice(0, 7).map((i) => i.score);

        // Score breakdown (average from feedback JSON)
        const scoreBreakdown = {
            communication: 0,
            technical: 0,
            problemSolving: 0,
            confidence: 0,
        };

        let feedbackCount = 0;
        for (const interview of interviews) {
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

        return NextResponse.json({
            stats: {
                totalInterviews,
                avgScore,
                streak: streak?.currentStreak || 0,
                xp: totalInterviews * 100 + avgScore * 10,
            },
            recentActivity,
            weeklyScores,
            scoreBreakdown,
            goals: goals.map((g) => ({
                label: g.label,
                target: g.target,
                current: g.current,
                progress: Math.round((g.current / g.target) * 100),
            })),
            streak: streak
                ? {
                    current: streak.currentStreak,
                    best: streak.bestStreak,
                    lastActive: streak.lastActiveAt,
                }
                : { current: 0, best: 0, lastActive: null },
            resumeScore: latestResume?.atsScore || null,
        });
    } catch (error) {
        console.error('GET /api/dashboard error:', error);
        return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
    }
}
