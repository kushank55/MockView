import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/resume/latest — the user's most recent analyzed resume, so the
// interview setup can reuse it instead of asking for the same PDF again.
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const userId = (session?.user as { id?: string } | undefined)?.id;
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const latest = await db.resumeAnalysis.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                fileName: true,
                targetRole: true,
                atsScore: true,
                resumeText: true,
                createdAt: true,
            },
        });

        // Analyses saved before resumeText existed can't personalize an
        // interview, so treat them as "nothing reusable available".
        if (!latest?.resumeText) {
            return NextResponse.json({ resume: null });
        }

        return NextResponse.json({ resume: latest });
    } catch (error) {
        console.error('GET /api/resume/latest error:', error);
        return NextResponse.json({ error: 'Failed to fetch resume' }, { status: 500 });
    }
}
