'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Mic,
    FileText,
    TrendingUp,
    Flame,
    Zap,
    Clock,
    ArrowRight,
    ChevronRight,
    Trophy,
    Target,
    Star,
    CalendarDays,
    Plus,
    Trash2,
    Check,
    X,
} from 'lucide-react';
import Link from 'next/link';
import { GOAL_METRICS } from '@/lib/goals';
import Header from '@/components/layout/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import ProgressRing from '@/components/ui/ProgressRing';
import styles from './dashboard.module.css';

// ── Types for API response ──
interface DashboardData {
    stats: {
        totalInterviews: number;
        avgScore: number;
        streak: number;
        xp: number;
    };
    recentActivity: {
        type: string;
        title: string;
        subtitle: string;
        score: number;
        time: string;
    }[];
    weeklyScores: number[];
    scoreBreakdown: {
        communication: number;
        technical: number;
        problemSolving: number;
        confidence: number;
    };
    goals: {
        id: string;
        label: string;
        metric: string;
        target: number;
        current: number;
        progress: number;
        complete: boolean;
    }[];
    streak: {
        current: number;
        best: number;
        lastActive: string | null;
    };
    insights: {
        title: string;
        subtitle: string;
        action: string;
        link: string;
    }[];
    resumeScore: number | null;
}

// ── Animation variants ──
const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0 },
};

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ── Helper to format time ago ──
function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
}

export default function DashboardPage() {
    // ── State: data from API, loading flag ──
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    // ── Goal editor state ──
    const [isAddingGoal, setIsAddingGoal] = useState(false);
    const [goalLabel, setGoalLabel] = useState('');
    const [goalMetric, setGoalMetric] = useState<string>(GOAL_METRICS[0].id);
    const [goalTarget, setGoalTarget] = useState<string>(String(GOAL_METRICS[0].defaultTarget));
    const [goalError, setGoalError] = useState('');
    const [savingGoal, setSavingGoal] = useState(false);

    const loadDashboard = React.useCallback(() => {
        return fetch('/api/dashboard')
            .then((res) => res.json())
            .then((apiData) => {
                if (apiData && apiData.stats) {
                    setData(apiData);
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error('Failed to load dashboard:', err);
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    // Picking a metric pre-fills a sensible target and label for that metric.
    const selectMetric = (metricId: string) => {
        const metric = GOAL_METRICS.find((m) => m.id === metricId) ?? GOAL_METRICS[0];
        setGoalMetric(metric.id);
        setGoalTarget(String(metric.defaultTarget));
        if (!goalLabel.trim()) setGoalLabel(metric.label);
    };

    const resetGoalForm = () => {
        setIsAddingGoal(false);
        setGoalLabel('');
        setGoalMetric(GOAL_METRICS[0].id);
        setGoalTarget(String(GOAL_METRICS[0].defaultTarget));
        setGoalError('');
    };

    const createGoal = async () => {
        setGoalError('');
        setSavingGoal(true);
        try {
            const res = await fetch('/api/goals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    label: goalLabel.trim() || GOAL_METRICS.find((m) => m.id === goalMetric)?.label,
                    metric: goalMetric,
                    target: Number(goalTarget),
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Could not create goal');
            }
            resetGoalForm();
            await loadDashboard();
        } catch (err) {
            setGoalError(err instanceof Error ? err.message : 'Could not create goal');
        } finally {
            setSavingGoal(false);
        }
    };

    const deleteGoal = async (id: string) => {
        // Drop it locally right away so the list feels responsive, then resync.
        setData((prev) => (prev ? { ...prev, goals: prev.goals.filter((g) => g.id !== id) } : prev));
        try {
            await fetch(`/api/goals?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
        } catch (err) {
            console.error('Failed to delete goal:', err);
        }
        await loadDashboard();
    };

    // ── Loading state ──
    if (loading) {
        return (
            <div className={styles.page}>
                <Header title="Dashboard" subtitle="Loading your progress..." />
                <div className={styles.loadingGrid}>
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={styles.skeleton} />
                    ))}
                </div>
            </div>
        );
    }

    // ── Error / no data state ──
    if (!data) {
        return (
            <div className={styles.page}>
                <Header title="Dashboard" subtitle="Something went wrong" />
                <Card>
                    <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        Unable to load dashboard data. Please check your database connection.
                    </p>
                </Card>
            </div>
        );
    }

    // ── Build stats cards from API data ──
    const statsData = [
        {
            label: 'Interviews',
            value: String(data.stats.totalInterviews),
            change: `${data.stats.totalInterviews} completed`,
            icon: Mic,
            color: 'var(--accent-blue)',
            bgColor: 'rgba(59, 130, 246, 0.12)',
        },
        {
            label: 'Avg Score',
            value: `${data.stats.avgScore}%`,
            change: data.stats.avgScore >= 80 ? 'Great performance!' : 'Keep improving!',
            icon: TrendingUp,
            color: 'var(--accent-emerald)',
            bgColor: 'rgba(16, 185, 129, 0.12)',
        },
        {
            label: 'Day Streak',
            value: String(data.streak.current),
            change: data.streak.current >= data.streak.best ? 'Personal best!' : `Best: ${data.streak.best}`,
            icon: Flame,
            color: 'var(--accent-amber)',
            bgColor: 'rgba(245, 158, 11, 0.12)',
        },
        {
            label: 'XP Points',
            value: data.stats.xp.toLocaleString(),
            change: `Level ${Math.floor(data.stats.xp / 300) + 1}`,
            icon: Zap,
            color: 'var(--accent-purple)',
            bgColor: 'rgba(139, 92, 246, 0.12)',
        },
    ];

    // ── Map recent activity to include icons ──
    const recentActivity = data.recentActivity.map((activity) => ({
        ...activity,
        icon: activity.type === 'interview' ? Mic : activity.type === 'resume' ? FileText : Trophy,
        time: timeAgo(activity.time),
    }));

    // ── Weekly scores (pad to 7 if needed) ──
    const weeklyData = [...data.weeklyScores];
    while (weeklyData.length < 7) weeklyData.push(0);
    const weeklySlice = weeklyData.slice(0, 7);
    const maxScore = Math.max(...weeklySlice, 1);

    // ── Streak data ──
    const streakDays = data.streak.current;
    const streakBest = data.streak.best;
    const daysToRecord = streakBest - streakDays;

    return (
        <div className={styles.page}>
            <Header title="Dashboard" subtitle="Welcome back! Here's your progress overview." />

            {/* Stats Grid */}
            <motion.div
                className={styles.statsGrid}
                variants={container}
                initial="hidden"
                animate="show"
            >
                {statsData.map((stat) => (
                    <motion.div key={stat.label} variants={item}>
                        <Card className={styles.statCard}>
                            <div className={styles.statIcon} style={{ background: stat.bgColor, color: stat.color }}>
                                <stat.icon size={20} />
                            </div>
                            <div className={styles.statInfo}>
                                <span className={styles.statValue}>{stat.value}</span>
                                <span className={styles.statLabel}>{stat.label}</span>
                                <span className={styles.statChange} style={{ color: stat.color }}>
                                    {stat.change}
                                </span>
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </motion.div>

            <div className={styles.mainGrid}>
                {/* Left Column */}
                <div className={styles.leftCol}>
                    {/* Quick Start */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Card className={styles.quickStart} glow="blue">
                            <div className={styles.quickStartContent}>
                                <div>
                                    <h3 className={styles.quickStartTitle}>Ready for Practice?</h3>
                                    <p className={styles.quickStartDesc}>
                                        Start a voice interview session and get real-time AI coaching
                                    </p>
                                </div>
                                <Link href="/interview">
                                    <Button icon={<Mic size={16} />}>
                                        Start Interview <ArrowRight size={14} />
                                    </Button>
                                </Link>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Weekly Performance Chart */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <Card>
                            <div className={styles.chartHeader}>
                                <div>
                                    <h3 className={styles.cardTitle}>Weekly Performance</h3>
                                    <p className={styles.cardSubtitle}>Your interview scores this week</p>
                                </div>
                                <Badge variant="emerald" dot>Scores from DB</Badge>
                            </div>
                            <div className={styles.chart}>
                                {weeklySlice.map((score, i) => (
                                    <div key={i} className={styles.chartCol}>
                                        <div className={styles.chartBarWrap}>
                                            <motion.div
                                                className={styles.chartBar}
                                                initial={{ height: 0 }}
                                                animate={{ height: `${(score / maxScore) * 100}%` }}
                                                transition={{ delay: 0.5 + i * 0.1, duration: 0.6 }}
                                                style={{
                                                    background:
                                                        score >= 80
                                                            ? 'var(--gradient-accent)'
                                                            : 'var(--bg-tertiary)',
                                                }}
                                            />
                                        </div>
                                        <span className={styles.chartLabel}>{weekDays[i]}</span>
                                        <span className={styles.chartValue}>{score}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>

                    {/* Recent Activity */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <Card>
                            <div className={styles.chartHeader}>
                                <h3 className={styles.cardTitle}>Recent Activity</h3>
                                <Link href="/history" className={styles.viewAll}>
                                    View All <ChevronRight size={14} />
                                </Link>
                            </div>
                            <div className={styles.activityList}>
                                {recentActivity.length > 0 ? (
                                    recentActivity.map((activity, i) => (
                                        <div key={i} className={styles.activityItem}>
                                            <div
                                                className={styles.activityIcon}
                                                style={{
                                                    background:
                                                        activity.type === 'interview'
                                                            ? 'rgba(59, 130, 246, 0.12)'
                                                            : activity.type === 'resume'
                                                                ? 'rgba(6, 182, 212, 0.12)'
                                                                : 'rgba(245, 158, 11, 0.12)',
                                                    color:
                                                        activity.type === 'interview'
                                                            ? 'var(--accent-blue)'
                                                            : activity.type === 'resume'
                                                                ? 'var(--accent-cyan)'
                                                                : 'var(--accent-amber)',
                                                }}
                                            >
                                                <activity.icon size={16} />
                                            </div>
                                            <div className={styles.activityInfo}>
                                                <span className={styles.activityTitle}>{activity.title}</span>
                                                <span className={styles.activitySub}>{activity.subtitle}</span>
                                            </div>
                                            <div className={styles.activityMeta}>
                                                {activity.score > 0 && (
                                                    <Badge
                                                        variant={
                                                            activity.score >= 80
                                                                ? 'emerald'
                                                                : activity.score >= 60
                                                                    ? 'amber'
                                                                    : 'rose'
                                                        }
                                                    >
                                                        {activity.score}%
                                                    </Badge>
                                                )}
                                                <span className={styles.activityTime}>
                                                    <Clock size={12} /> {activity.time}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '1rem' }}>
                                        No recent activity yet. Start an interview!
                                    </p>
                                )}
                            </div>
                        </Card>
                    </motion.div>
                </div>

                {/* Right Column */}
                <div className={styles.rightCol}>
                    {/* Overall Score */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                    >
                        <Card className={styles.overallScore}>
                            <h3 className={styles.cardTitle}>Overall Score</h3>
                            <div className={styles.scoreCenter}>
                                <ProgressRing progress={data.stats.avgScore} size={140} strokeWidth={10} color="var(--accent-blue)">
                                    <span className={styles.scoreValue}>{data.stats.avgScore}</span>
                                    <span className={styles.scoreLabel}>/ 100</span>
                                </ProgressRing>
                            </div>
                            <div className={styles.scoreBreakdown}>
                                <div className={styles.scoreItem}>
                                    <span className={styles.scoreDot} style={{ background: 'var(--accent-blue)' }} />
                                    <span>Communication</span>
                                    <span className={styles.scoreItemVal}>{data.scoreBreakdown.communication}%</span>
                                </div>
                                <div className={styles.scoreItem}>
                                    <span className={styles.scoreDot} style={{ background: 'var(--accent-purple)' }} />
                                    <span>Technical</span>
                                    <span className={styles.scoreItemVal}>{data.scoreBreakdown.technical}%</span>
                                </div>
                                <div className={styles.scoreItem}>
                                    <span className={styles.scoreDot} style={{ background: 'var(--accent-emerald)' }} />
                                    <span>Problem Solving</span>
                                    <span className={styles.scoreItemVal}>{data.scoreBreakdown.problemSolving}%</span>
                                </div>
                                <div className={styles.scoreItem}>
                                    <span className={styles.scoreDot} style={{ background: 'var(--accent-cyan)' }} />
                                    <span>Confidence</span>
                                    <span className={styles.scoreItemVal}>{data.scoreBreakdown.confidence}%</span>
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Resume Score Widget */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <Card className={styles.overallScore}>
                            <h3 className={styles.cardTitle}>Resume ATS Match</h3>
                            <div className={styles.scoreCenter}>
                                {data.resumeScore !== null ? (
                                    <ProgressRing progress={data.resumeScore} size={140} strokeWidth={10} color="var(--accent-cyan)">
                                        <span className={styles.scoreValue}>{data.resumeScore}</span>
                                        <span className={styles.scoreLabel}>/ 100</span>
                                    </ProgressRing>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: 'var(--space-xl) 0', color: 'var(--text-tertiary)' }}>
                                        <FileText size={48} style={{ opacity: 0.3, margin: '0 auto var(--space-sm)' }} />
                                        <p style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-md)' }}>No resume uploaded yet.</p>
                                        <Link href="/resume">
                                            <Button size="sm" variant="secondary">Analyze Resume</Button>
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </motion.div>

                    {/* Streak Tracker */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 }}
                    >
                        <Card>
                            <div className={styles.streakHeader}>
                                <Flame size={20} color="var(--accent-amber)" />
                                <h3 className={styles.cardTitle}>{streakDays} Day Streak</h3>
                            </div>
                            <div className={styles.streakCalendar}>
                                {Array.from({ length: 14 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className={styles.streakDay}
                                        style={{
                                            background:
                                                i < streakDays
                                                    ? `rgba(245, 158, 11, ${0.3 + (i / 14) * 0.7})`
                                                    : 'var(--bg-tertiary)',
                                        }}
                                    >
                                        {i < streakDays ? <Star size={10} /> : null}
                                    </div>
                                ))}
                            </div>
                            <p className={styles.streakText}>
                                {daysToRecord > 0 ? (
                                    <>Keep going! Only <strong>{daysToRecord} more days</strong> to beat your best streak.</>
                                ) : (
                                    <>🔥 You&apos;re on your <strong>best streak ever</strong>! Keep it up!</>
                                )}
                            </p>
                        </Card>
                    </motion.div>

                    {/* Goals */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.55 }}
                    >
                        <Card>
                            <div className={styles.chartHeader}>
                                <h3 className={styles.cardTitle}>Goals</h3>
                                {isAddingGoal ? (
                                    <Target size={18} color="var(--text-tertiary)" />
                                ) : (
                                    <button
                                        className={styles.goalAddBtn}
                                        onClick={() => setIsAddingGoal(true)}
                                        aria-label="Add a goal"
                                    >
                                        <Plus size={16} />
                                    </button>
                                )}
                            </div>

                            {data.goals.length === 0 && !isAddingGoal ? (
                                <div className={styles.goalsEmpty}>
                                    <Target size={28} color="var(--text-tertiary)" />
                                    <p className={styles.goalsEmptyText}>
                                        No goals yet. Set one to track your progress automatically.
                                    </p>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        icon={<Plus size={14} />}
                                        onClick={() => setIsAddingGoal(true)}
                                    >
                                        Add a goal
                                    </Button>
                                </div>
                            ) : (
                                <div className={styles.goalsList}>
                                    {data.goals.map((goal, i) => (
                                        <div key={goal.id} className={styles.goalItem}>
                                            <div className={styles.goalInfo}>
                                                <span className={styles.goalLabel}>
                                                    {goal.complete && (
                                                        <Check size={13} color="var(--accent-emerald)" />
                                                    )}
                                                    {goal.label}
                                                </span>
                                                <span className={styles.goalProgress}>
                                                    {goal.current}/{goal.target}
                                                </span>
                                                <button
                                                    className={styles.goalDeleteBtn}
                                                    onClick={() => deleteGoal(goal.id)}
                                                    aria-label={`Delete goal ${goal.label}`}
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                            <div className={styles.goalBar}>
                                                <motion.div
                                                    className={styles.goalFill}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${goal.progress}%` }}
                                                    transition={{ delay: 0.6 + i * 0.15, duration: 0.8 }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {isAddingGoal && (
                                <div className={styles.goalForm}>
                                    <input
                                        className={styles.goalInput}
                                        placeholder="Goal name"
                                        maxLength={60}
                                        value={goalLabel}
                                        onChange={(e) => setGoalLabel(e.target.value)}
                                    />
                                    <div className={styles.goalFormRow}>
                                        <select
                                            className={styles.goalSelect}
                                            value={goalMetric}
                                            onChange={(e) => selectMetric(e.target.value)}
                                        >
                                            {GOAL_METRICS.map((m) => (
                                                <option key={m.id} value={m.id}>
                                                    {m.label}
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            className={styles.goalTargetInput}
                                            type="number"
                                            min={1}
                                            value={goalTarget}
                                            onChange={(e) => setGoalTarget(e.target.value)}
                                            aria-label="Target value"
                                        />
                                    </div>
                                    {goalError && <p className={styles.goalErrorMsg}>{goalError}</p>}
                                    <div className={styles.goalFormActions}>
                                        <Button size="sm" loading={savingGoal} onClick={createGoal}>
                                            Save goal
                                        </Button>
                                        <button className={styles.goalCancelBtn} onClick={resetGoalForm}>
                                            <X size={14} /> Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </motion.div>

                    {/* AI Insights replacing Scheduled */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                    >
                        <Card>
                            <div className={styles.chartHeader}>
                                <h3 className={styles.cardTitle}>Skill Insights</h3>
                                <Zap size={18} color="var(--accent-purple)" />
                            </div>
                            {data.insights && data.insights.map((insight, idx) => (
                                <div key={idx} className={styles.scheduleItem}>
                                    <div className={styles.scheduleDate} style={{ background: 'var(--bg-tertiary)' }}>
                                        <Target size={20} color="var(--text-secondary)" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p className={styles.scheduleTitle}>{insight.title}</p>
                                        <p className={styles.scheduleSub}>{insight.subtitle}</p>
                                        <Link href={insight.link} style={{ display: 'inline-block', marginTop: '6px', fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 600 }}>
                                            {insight.action} <ArrowRight size={10} style={{ display: 'inline', verticalAlign: 'middle' }} />
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </Card>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
