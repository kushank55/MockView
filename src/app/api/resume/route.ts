import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/resume — Fetch resume analyses for a user
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !(session.user as { id?: string }).id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = (session.user as { id: string }).id;

        const analyses = await db.resumeAnalysis.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ analyses });
    } catch (error) {
        console.error('GET /api/resume error:', error);
        return NextResponse.json({ error: 'Failed to fetch resume analyses' }, { status: 500 });
    }
}

// POST /api/resume — Create a new resume analysis
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !(session.user as { id?: string }).id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = (session.user as { id: string }).id;

        const body = await req.json();

        const analysis = await db.resumeAnalysis.create({
            data: {
                userId,
                fileName: body.fileName,
                fileUrl: body.fileUrl || null,
                atsScore: body.atsScore,
                keywordData: body.keywordData,
                sectionScores: body.sectionScores,
                improvements: body.improvements,
            },
        });

        return NextResponse.json(analysis, { status: 201 });
    } catch (error) {
        console.error('POST /api/resume error:', error);
        return NextResponse.json({ error: 'Failed to create resume analysis' }, { status: 500 });
    }
}
