import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/interviews/[id] — Fetch a single interview by ID
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !(session.user as { id?: string }).id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = (session.user as { id: string }).id;
        const { id } = await params;

        const interview = await db.interview.findUnique({
            where: { id },
        });

        if (!interview) {
            return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
        }

        // Ensure the interview belongs to the requesting user
        if (interview.userId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        return NextResponse.json(interview);
    } catch (error) {
        console.error('GET /api/interviews/[id] error:', error);
        return NextResponse.json({ error: 'Failed to fetch interview' }, { status: 500 });
    }
}
