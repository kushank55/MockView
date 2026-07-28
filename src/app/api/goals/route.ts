import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { GOAL_METRICS, type GoalMetric } from '@/lib/goals';

const MAX_GOALS_PER_USER = 6;

async function requireUserId() {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    return userId ?? null;
}

// GET /api/goals — the user's goals (raw records, progress is computed in /api/dashboard)
export async function GET() {
    try {
        const userId = await requireUserId();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const goals = await db.goal.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' },
        });

        return NextResponse.json({ goals, metrics: GOAL_METRICS });
    } catch (error) {
        console.error('GET /api/goals error:', error);
        return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 });
    }
}

// POST /api/goals — create a goal
export async function POST(req: NextRequest) {
    try {
        const userId = await requireUserId();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const label = typeof body.label === 'string' ? body.label.trim() : '';
        const metric = body.metric as GoalMetric;
        const target = Number(body.target);

        if (!label || label.length > 60) {
            return NextResponse.json(
                { error: 'Label is required and must be 60 characters or fewer' },
                { status: 400 }
            );
        }
        if (!GOAL_METRICS.some((m) => m.id === metric)) {
            return NextResponse.json({ error: 'Unknown goal metric' }, { status: 400 });
        }
        if (!Number.isFinite(target) || target < 1) {
            return NextResponse.json({ error: 'Target must be a positive number' }, { status: 400 });
        }

        const existingCount = await db.goal.count({ where: { userId } });
        if (existingCount >= MAX_GOALS_PER_USER) {
            return NextResponse.json(
                { error: `You can track up to ${MAX_GOALS_PER_USER} goals at a time` },
                { status: 400 }
            );
        }

        const goal = await db.goal.create({
            data: { userId, label, metric, target: Math.round(target) },
        });

        return NextResponse.json(goal, { status: 201 });
    } catch (error) {
        console.error('POST /api/goals error:', error);
        return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 });
    }
}

// DELETE /api/goals?id=<goalId> — remove a goal
export async function DELETE(req: NextRequest) {
    try {
        const userId = await requireUserId();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const id = new URL(req.url).searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'Goal id is required' }, { status: 400 });

        // Scope the delete to the session user so one user can't remove another's goal.
        const { count } = await db.goal.deleteMany({ where: { id, userId } });
        if (count === 0) {
            return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/goals error:', error);
        return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 });
    }
}
