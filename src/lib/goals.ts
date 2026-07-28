// Goal metrics are derived from live user data rather than an incrementing
// counter, so progress is always correct even if an interview is deleted.

export const GOAL_METRICS = [
    { id: 'interviews', label: 'Interviews completed', unit: 'interviews', defaultTarget: 30 },
    { id: 'avgScore', label: 'Average interview score', unit: 'points', defaultTarget: 85 },
    { id: 'streak', label: 'Practice streak', unit: 'days', defaultTarget: 14 },
    { id: 'resumeScore', label: 'Resume ATS score', unit: 'points', defaultTarget: 90 },
] as const;

export type GoalMetric = (typeof GOAL_METRICS)[number]['id'];

export interface GoalStats {
    totalInterviews: number;
    avgScore: number;
    currentStreak: number;
    resumeScore: number;
}

/** Current value for a goal's metric, from the user's real stats. */
export function currentValueFor(metric: string, stats: GoalStats): number {
    switch (metric) {
        case 'avgScore':
            return stats.avgScore;
        case 'streak':
            return stats.currentStreak;
        case 'resumeScore':
            return stats.resumeScore;
        case 'interviews':
        default:
            return stats.totalInterviews;
    }
}

/** Resolves a stored goal into a display-ready record with live progress. */
export function resolveGoal(
    goal: { id: string; label: string; target: number; metric: string },
    stats: GoalStats
) {
    const current = currentValueFor(goal.metric, stats);
    const target = Math.max(1, goal.target);

    return {
        id: goal.id,
        label: goal.label,
        metric: goal.metric,
        target: goal.target,
        current,
        progress: Math.min(100, Math.round((current / target) * 100)),
        complete: current >= goal.target,
    };
}
