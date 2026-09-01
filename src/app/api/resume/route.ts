import { NextRequest } from 'next/server';
import { databaseUnreachableResponse, db } from '@/lib/db';
import { cacheDel, dashboardCacheKey } from '@/lib/cache';
import { jsonError, parsePageLimit, paginationMeta } from '@/lib/http';
import { getSessionUser } from '@/lib/session';

export async function GET(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user) return jsonError(401, 'UNAUTHORIZED', 'Unauthorized');

        const { page, limit, skip } = parsePageLimit(new URL(req.url).searchParams);

        const [analyses, total] = await Promise.all([
            db.resumeAnalysis.findMany({
                where: { userId: user.id },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                select: {
                    id: true,
                    fileName: true,
                    fileUrl: true,
                    targetRole: true,
                    atsScore: true,
                    keywordData: true,
                    sectionScores: true,
                    improvements: true,
                    createdAt: true,
                },
            }),
            db.resumeAnalysis.count({ where: { userId: user.id } }),
        ]);

        return Response.json({
            success: true,
            analyses,
            pagination: paginationMeta(page, limit, total),
        });
    } catch (error) {
        console.error('GET /api/resume error:', error);
        return (
            databaseUnreachableResponse(error) ??
            jsonError(500, 'INTERNAL_ERROR', 'Failed to fetch resume analyses')
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user) return jsonError(401, 'UNAUTHORIZED', 'Unauthorized');

        const body = await req.json();
        const analysis = await db.resumeAnalysis.create({
            data: {
                userId: user.id,
                fileName: body.fileName,
                fileUrl: body.fileUrl || null,
                atsScore: body.atsScore,
                keywordData: body.keywordData,
                sectionScores: body.sectionScores,
                improvements: body.improvements,
            },
        });

        await cacheDel(dashboardCacheKey(user.id));
        return Response.json({ success: true, ...analysis }, { status: 201 });
    } catch (error) {
        console.error('POST /api/resume error:', error);
        return jsonError(500, 'INTERNAL_ERROR', 'Failed to create resume analysis');
    }
}
