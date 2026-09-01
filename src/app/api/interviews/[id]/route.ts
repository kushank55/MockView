import { NextRequest } from 'next/server';
import { databaseUnreachableResponse, db } from '@/lib/db';
import { cacheDel, dashboardCacheKey } from '@/lib/cache';
import { jsonError } from '@/lib/http';
import { getSessionUser } from '@/lib/session';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getSessionUser();
        if (!user) return jsonError(401, 'UNAUTHORIZED', 'Unauthorized');
        const { id } = await params;

        const interview = await db.interview.findFirst({
            where: { id, userId: user.id },
        });

        if (!interview) {
            return jsonError(404, 'NOT_FOUND', 'Interview not found');
        }

        return Response.json({ success: true, ...interview });
    } catch (error) {
        console.error('GET /api/interviews/[id] error:', error);
        return (
            databaseUnreachableResponse(error) ??
            jsonError(500, 'INTERNAL_ERROR', 'Failed to fetch interview')
        );
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getSessionUser();
        if (!user) return jsonError(401, 'UNAUTHORIZED', 'Unauthorized');
        const { id } = await params;

        const { count } = await db.interview.deleteMany({
            where: { id, userId: user.id },
        });

        if (count === 0) {
            return jsonError(404, 'NOT_FOUND', 'Interview not found');
        }

        await cacheDel(dashboardCacheKey(user.id));

        return Response.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/interviews/[id] error:', error);
        return (
            databaseUnreachableResponse(error) ??
            jsonError(500, 'INTERNAL_ERROR', 'Failed to delete interview')
        );
    }
}
