import { NextRequest } from 'next/server';
import { databaseUnreachableResponse, db } from '@/lib/db';
import { jsonError } from '@/lib/http';
import { getSessionUser } from '@/lib/session';

// GET /api/user — Get user profile
export async function GET() {
    try {
        const sessionUser = await getSessionUser();
        if (!sessionUser) return jsonError(401, 'UNAUTHORIZED', 'Unauthorized');
        const userId = sessionUser.id;

        const user = await db.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                location: true,
                company: true,
                website: true,
                bio: true,
                theme: true,
                notifyEmail: true,
                notifyInterviewTip: true,
                notifyWeeklyReport: true,
                createdAt: true,
            },
        });

        if (!user) {
            return jsonError(404, 'NOT_FOUND', 'User not found');
        }

        return Response.json({ success: true, ...user });
    } catch (error) {
        console.error('GET /api/user error:', error);
        return (
            databaseUnreachableResponse(error) ??
            jsonError(500, 'INTERNAL_ERROR', 'Failed to fetch user')
        );
    }
}

// PATCH /api/user — Update user profile or settings
export async function PATCH(req: NextRequest) {
    try {
        const sessionUser = await getSessionUser();
        if (!sessionUser) return jsonError(401, 'UNAUTHORIZED', 'Unauthorized');
        const userId = sessionUser.id;

        const body = await req.json();

        const allowedFields = [
            'name',
            'email',
            'image',
            'location',
            'company',
            'website',
            'bio',
            'theme',
            'notifyEmail',
            'notifyInterviewTip',
            'notifyWeeklyReport',
        ];

        const data: Record<string, unknown> = {};
        for (const field of allowedFields) {
            if (field in body) {
                data[field] = body[field];
            }
        }

        const user = await db.user.update({
            where: { id: userId },
            data,
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                location: true,
                company: true,
                website: true,
                bio: true,
                theme: true,
                notifyEmail: true,
                notifyInterviewTip: true,
                notifyWeeklyReport: true,
                updatedAt: true,
            },
        });

        return Response.json({ success: true, ...user });
    } catch (error) {
        console.error('PATCH /api/user error:', error);
        return (
            databaseUnreachableResponse(error) ??
            jsonError(500, 'INTERNAL_ERROR', 'Failed to update user')
        );
    }
}
