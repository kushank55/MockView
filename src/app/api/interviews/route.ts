import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

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

        return NextResponse.json({
            interviews,
            stats: { totalInterviews, avgScore },
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
