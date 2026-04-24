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
        const [interviews, goals, streak, resumeAnalyses] = await Promise.all([
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
            db.resumeAnalysis.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        const latestResume = resumeAnalyses[0] || null;

        // Compute stats
        const totalInterviews = interviews.length;
        const avgScore =
            totalInterviews > 0
                ? Math.round(interviews.reduce((sum, i) => sum + i.score, 0) / totalInterviews)
                : 0;

        // ── Unified Recent Activity ──
        const activityItems = [
            ...interviews.map(i => ({
                type: 'interview',
                title: `${i.type.charAt(0).toUpperCase() + i.type.slice(1)} Interview`,
                subtitle: i.topic,
                score: i.score,
                time: i.createdAt,
            })),
            ...resumeAnalyses.map(r => ({
                type: 'resume',
                title: 'Resume ATS Analysis',
                subtitle: (r as any).targetRole || 'General',
                score: r.atsScore,
                time: r.createdAt,
            }))
        ];

        // Sort chronologically (newest first) and take the top 5
        const recentActivity = activityItems
            .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
            .slice(0, 5);

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

        // ── Dynamic Skill Insights ──
        const insights: { title: string; subtitle: string; action: string; link: string }[] = [];

        // Check ATS Score
        if (latestResume) {
            if (latestResume.atsScore < 65) {
                insights.push({
                    title: "Resume Optimization Needed",
                    subtitle: `Your ATS match for ${(latestResume as any).targetRole || 'roles'} is low. Focus on missing keywords.`,
                    action: "View Analysis",
                    link: "/resume"
                });
            } else if (latestResume.atsScore > 85) {
                insights.push({
                    title: "Resume is ATS Ready",
                    subtitle: "Your resume passes ATS checks strongly. Time to practice interviews!",
                    action: "Start Interview",
                    link: "/interview"
                });
            }
        } else {
            insights.push({
                title: "Upload Your Resume",
                subtitle: "Get AI insights on how well your resume matches target roles.",
                action: "Analyze Now",
                link: "/resume"
            });
        }

        // Check Interview Breakdown Weaknesses
        if (feedbackCount > 0) {
            const weaknesses = Object.entries(scoreBreakdown)
                .sort(([, a], [, b]) => a - b)
                .filter(([, score]) => score < 75); // find low scores

            if (weaknesses.length > 0) {
                const [weakestSkill] = weaknesses[0];
                const formattedSkill = weakestSkill.charAt(0).toUpperCase() + weakestSkill.slice(1).replace(/([A-Z])/g, ' $1');

                insights.push({
                    title: `Improve ${formattedSkill}`,
                    subtitle: `Your average is lower here. Let's do a targeted mock interview.`,
                    action: "Practice Topic",
                    link: "/interview"
                });
            }
        }

        // Ensure at least two insights populated
        if (insights.length < 2) {
            insights.push({
                title: "System Design Practice",
                subtitle: "Deepen your architectural knowledge.",
                action: "Practice Now",
                link: "/interview"
            });
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
            insights: insights.slice(0, 2), // Keep exactly 2 insights
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
