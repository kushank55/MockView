import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// ── Analytics helpers ──
interface FeedbackData {
    communication: number;
    technical: number;
    problemSolving: number;
    confidence: number;
}

function computeAnalytics(interviews: Array<{ score: number; type: string; feedback: any; createdAt: Date }>) {
    const withFeedback = interviews.filter(
        (i) => i.feedback && typeof i.feedback === 'object' && !Array.isArray(i.feedback)
    );

    // Average feedback scores for radar chart
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

    // Per-type breakdown for heatmap
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

    // Score trend over time (chronological order, most recent last)
    const scoreTrend = [...interviews]
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((i) => ({
            date: i.createdAt,
            score: i.score,
            type: i.type,
        }));

    return { radarSkills, heatmapData, scoreTrend };
}

// GET /api/interviews — Fetch interviews (with optional type filter)
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !(session.user as { id?: string }).id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = (session.user as { id: string }).id;

        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type');

        const where: { userId: string; type?: string } = { userId };
        if (type && type !== 'all') {
            where.type = type;
        }

        const interviews = await db.interview.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });

        const totalInterviews = interviews.length;
        const avgScore =
            totalInterviews > 0
                ? Math.round(interviews.reduce((sum, i) => sum + i.score, 0) / totalInterviews)
                : 0;

        // Compute real analytics from feedback data
        const analytics = computeAnalytics(interviews);

        return NextResponse.json({
            interviews,
            stats: { totalInterviews, avgScore },
            analytics,
        });
    } catch (error) {
        console.error('GET /api/interviews error:', error);
        return NextResponse.json({ error: 'Failed to fetch interviews' }, { status: 500 });
    }
}

// POST /api/interviews — Create a new interview record
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !(session.user as { id?: string }).id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = (session.user as { id: string }).id;

        const body = await req.json();

        const interview = await db.interview.create({
            data: {
                userId,
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

        return NextResponse.json(interview, { status: 201 });
    } catch (error) {
        console.error('POST /api/interviews error:', error);
        return NextResponse.json({ error: 'Failed to create interview' }, { status: 500 });
    }
}
