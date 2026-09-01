import { NextRequest } from 'next/server';
import { databaseUnreachableResponse, db } from '@/lib/db';
import { cacheDel, dashboardCacheKey } from '@/lib/cache';
import { jsonError } from '@/lib/http';
import { getSessionUser } from '@/lib/session';
import { GOAL_METRICS, type GoalMetric } from '@/lib/goals';

const MAX_GOALS_PER_USER = 6;

async function requireUserId() {
    const user = await getSessionUser();
    return user?.id ?? null;
}

export async function GET() {
    try {
        const userId = await requireUserId();
        if (!userId) return jsonError(401, 'UNAUTHORIZED', 'Unauthorized');

        const goals = await db.goal.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' },
        });

        return Response.json({ success: true, goals, metrics: GOAL_METRICS });
    } catch (error) {
        console.error('GET /api/goals error:', error);
        return (
            databaseUnreachableResponse(error) ??
            jsonError(500, 'INTERNAL_ERROR', 'Failed to fetch goals')
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const userId = await requireUserId();
        if (!userId) return jsonError(401, 'UNAUTHORIZED', 'Unauthorized');

        const body = await req.json();
        const label = typeof body.label === 'string' ? body.label.trim() : '';
        const metric = body.metric as GoalMetric;
        const target = Number(body.target);

        if (!label || label.length > 60) {
            return jsonError(400, 'VALIDATION_ERROR', 'Label is required and must be 60 characters or fewer');
        }
        if (!GOAL_METRICS.some((m) => m.id === metric)) {
            return jsonError(400, 'VALIDATION_ERROR', 'Unknown goal metric');
        }
        if (!Number.isFinite(target) || target < 1) {
            return jsonError(400, 'VALIDATION_ERROR', 'Target must be a positive number');
        }

        const existingCount = await db.goal.count({ where: { userId } });
        if (existingCount >= MAX_GOALS_PER_USER) {
            return jsonError(400, 'VALIDATION_ERROR', `You can track up to ${MAX_GOALS_PER_USER} goals at a time`);
        }

        const goal = await db.goal.create({
            data: { userId, label, metric, target: Math.round(target) },
        });

        await cacheDel(dashboardCacheKey(userId));
        return Response.json({ success: true, ...goal }, { status: 201 });
    } catch (error) {
        console.error('POST /api/goals error:', error);
        return (
            databaseUnreachableResponse(error) ??
            jsonError(500, 'INTERNAL_ERROR', 'Failed to create goal')
        );
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const userId = await requireUserId();
        if (!userId) return jsonError(401, 'UNAUTHORIZED', 'Unauthorized');

        const id = new URL(req.url).searchParams.get('id');
        if (!id) return jsonError(400, 'VALIDATION_ERROR', 'Goal id is required');

        const { count } = await db.goal.deleteMany({ where: { id, userId } });
        if (count === 0) {
            return jsonError(404, 'NOT_FOUND', 'Goal not found');
        }

        await cacheDel(dashboardCacheKey(userId));
        return Response.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/goals error:', error);
        return (
            databaseUnreachableResponse(error) ??
            jsonError(500, 'INTERNAL_ERROR', 'Failed to delete goal')
        );
    }
}
