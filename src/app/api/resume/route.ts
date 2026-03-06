import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/resume — Fetch resume analyses for a user
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId') || 'demo-user';

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
        const body = await req.json();
        const userId = body.userId || 'demo-user';

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
