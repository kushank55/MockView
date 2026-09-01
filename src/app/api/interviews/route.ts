import { NextRequest } from 'next/server';
import { databaseUnreachableResponse, db } from '@/lib/db';
import { cacheDel, dashboardCacheKey } from '@/lib/cache';
import { jsonError, parsePageLimit, paginationMeta } from '@/lib/http';
import { getSessionUser } from '@/lib/session';
import { recordActivity } from '@/lib/progress';

interface FeedbackData {
    communication: number;
    technical: number;
    problemSolving: number;
    confidence: number;
}

const ANALYTICS_SAMPLE = 200;

const listSelect = {
    id: true,
    type: true,
    topic: true,
    score: true,
    duration: true,
    questions: true,
    createdAt: true,
} as const;

function computeAnalytics(interviews: Array<{ score: number; type: string; feedback: unknown; createdAt: Date }>) {
    const withFeedback = interviews.filter(
        (i) => i.feedback && typeof i.feedback === 'object' && !Array.isArray(i.feedback)
    );

    const radarSkills = withFeedback.length > 0
        ? [
            { label: 'Communication', value: Math.round(withFeedback.reduce((s, i) => s + ((i.feedback as FeedbackData).communication || 0), 0) / withFeedback.length) },
            { label: 'Technical Depth', value: Math.round(withFeedback.reduce((s, i) => s + ((i.feedback as FeedbackData).technical || 0), 0) / withFeedback.length) },
            { label: 'Problem Solving', value: Math.round(withFeedback.reduce((s, i) => s + ((i.feedback as FeedbackData).problemSolving || 0), 0) / withFeedback.length) },
            { label: 'Confidence', value: Math.round(withFeedback.reduce((s, i) => s + ((i.feedback as FeedbackData).confidence || 0), 0) / withFeedback.length) },
        ]
        : [
            { label: 'Communication', value: 0 },
            { label: 'Technical Depth', value: 0 },
            { label: 'Problem Solving', value: 0 },
            { label: 'Confidence', value: 0 },
        ];

    const types = ['behavioral', 'technical', 'system-design'];
    const heatmapData = types.map((type) => {
        const typeInterviews = withFeedback.filter((i) => i.type === type);
        if (typeInterviews.length === 0) {
            return {
                category: type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' '),
                skills: [
                    { name: 'Communication', score: 0 },
                    { name: 'Technical', score: 0 },
                    { name: 'Problem Solving', score: 0 },
                    { name: 'Confidence', score: 0 },
                ],
            };
        }
        return {
            category: type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' '),
            skills: [
                { name: 'Communication', score: Math.round(typeInterviews.reduce((s, i) => s + ((i.feedback as FeedbackData).communication || 0), 0) / typeInterviews.length) },
                { name: 'Technical', score: Math.round(typeInterviews.reduce((s, i) => s + ((i.feedback as FeedbackData).technical || 0), 0) / typeInterviews.length) },
                { name: 'Problem Solving', score: Math.round(typeInterviews.reduce((s, i) => s + ((i.feedback as FeedbackData).problemSolving || 0), 0) / typeInterviews.length) },
                { name: 'Confidence', score: Math.round(typeInterviews.reduce((s, i) => s + ((i.feedback as FeedbackData).confidence || 0), 0) / typeInterviews.length) },
            ],
        };
    });

    const scoreTrend = [...interviews]
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((i) => ({
            date: i.createdAt,
            score: i.score,
            type: i.type,
        }));

    return { radarSkills, heatmapData, scoreTrend };
}

export async function GET(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user) return jsonError(401, 'UNAUTHORIZED', 'Unauthorized');

        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type');
        const { page, limit, skip } = parsePageLimit(searchParams);

        const where: { userId: string; type?: string } = { userId: user.id };
        if (type && type !== 'all') where.type = type;

        const includeAnalytics = page === 1;

        const [interviews, total, analyticsRows, aggregates] = await Promise.all([
            db.interview.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                select: listSelect,
            }),
            db.interview.count({ where }),
            includeAnalytics
                ? db.interview.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    take: ANALYTICS_SAMPLE,
                    select: { score: true, type: true, feedback: true, createdAt: true },
                })
                : Promise.resolve([] as Array<{ score: number; type: string; feedback: unknown; createdAt: Date }>),
            includeAnalytics
                ? db.interview.aggregate({
                    where,
                    _avg: { score: true },
                    _count: true,
                })
                : Promise.resolve({ _avg: { score: null as number | null }, _count: 0 }),
        ]);

        const totalInterviews = aggregates._count;
        const avgScore = totalInterviews > 0 ? Math.round(aggregates._avg.score || 0) : 0;

        return Response.json({
            success: true,
            interviews,
            stats: includeAnalytics ? { totalInterviews, avgScore } : undefined,
            analytics: includeAnalytics ? computeAnalytics(analyticsRows) : undefined,
            pagination: paginationMeta(page, limit, total),
        });
    } catch (error) {
        console.error('GET /api/interviews error:', error);
        return (
            databaseUnreachableResponse(error) ??
            jsonError(500, 'INTERNAL_ERROR', 'Failed to fetch interviews')
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user) return jsonError(401, 'UNAUTHORIZED', 'Unauthorized');

        const body = await req.json();
        if (!body.type || !body.topic || typeof body.score !== 'number') {
            return jsonError(400, 'VALIDATION_ERROR', 'type, topic, and score are required');
        }

        const interview = await db.interview.create({
            data: {
                userId: user.id,
                type: body.type,
                topic: body.topic,
                score: body.score,
                duration: body.duration,
                questions: body.questions || 5,
                transcript: body.transcript || null,
                feedback: body.feedback || null,
                coachTips: body.coachTips || null,
            },
        });

        try {
            await recordActivity(user.id);
        } catch (streakError) {
            console.error('Failed to update streak:', streakError);
        }

        await cacheDel(dashboardCacheKey(user.id));

        return Response.json({ success: true, ...interview }, { status: 201 });
    } catch (error) {
        console.error('POST /api/interviews error:', error);
        return (
            databaseUnreachableResponse(error) ??
            jsonError(500, 'INTERNAL_ERROR', 'Failed to create interview')
        );
    }
}
