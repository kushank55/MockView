import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/user — Get user profile
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !(session.user as { id?: string }).id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = (session.user as { id: string }).id;

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
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error('GET /api/user error:', error);
        return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
    }
}

// PATCH /api/user — Update user profile or settings
export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !(session.user as { id?: string }).id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = (session.user as { id: string }).id;

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

        return NextResponse.json(user);
    } catch (error) {
        console.error('PATCH /api/user error:', error);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}
