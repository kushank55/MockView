'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Mic,
    Calendar,
    Clock,
    ChevronRight,
    Filter,
    BarChart3,
    TrendingUp,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { getScoreColor } from '@/lib/utils';
import styles from './history.module.css';

// ── Types ──
interface Interview {
    id: string;
    type: string;
    topic: string;
    score: number;
    createdAt: string;
    duration: string;
    questions: number;
}

interface RadarSkill {
    label: string;
    value: number;
}

interface HeatmapCategory {
    category: string;
    skills: Array<{ name: string; score: number }>;
}

interface ScoreTrendPoint {
    date: string;
    score: number;
    type: string;
}

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
};

// ── Helpers ──
function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

function getBadgeVariant(score: number): 'emerald' | 'amber' | 'rose' {
    if (score >= 80) return 'emerald';
    if (score >= 60) return 'amber';
    return 'rose';
}

export default function HistoryPage() {
    const [filter, setFilter] = useState('all');
    const [interviews, setInterviews] = useState<Interview[]>([]);
    const [loading, setLoading] = useState(true);

    // Real analytics from API
    const [radarSkills, setRadarSkills] = useState<RadarSkill[]>([]);
    const [heatmapData, setHeatmapData] = useState<HeatmapCategory[]>([]);
    const [scoreTrend, setScoreTrend] = useState<ScoreTrendPoint[]>([]);

    // ── Fetch interviews + analytics from API ──
    useEffect(() => {
        const params = new URLSearchParams();
        if (filter !== 'all') params.set('type', filter);

        fetch(`/api/interviews?${params.toString()}`)
            .then((res) => res.json())
            .then((data) => {
                setInterviews(data.interviews || []);
                if (data.analytics) {
                    setRadarSkills(data.analytics.radarSkills || []);
                    setHeatmapData(data.analytics.heatmapData || []);
                    setScoreTrend(data.analytics.scoreTrend || []);
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error('Failed to load interviews:', err);
                setLoading(false);
            });
    }, [filter]);

    // ── Score Trend SVG helpers ──
    const trendWidth = 280;
    const trendHeight = 100;
    const trendPadding = 20;

    function buildTrendPath(): string {
        if (scoreTrend.length < 2) return '';
        const maxScore = Math.max(...scoreTrend.map((p) => p.score), 100);
        const minScore = Math.min(...scoreTrend.map((p) => p.score), 0);
        const range = maxScore - minScore || 1;
        const stepX = (trendWidth - trendPadding * 2) / (scoreTrend.length - 1);

        return scoreTrend
            .map((point, i) => {
                const x = trendPadding + i * stepX;
                const y = trendHeight - trendPadding - ((point.score - minScore) / range) * (trendHeight - trendPadding * 2);
                return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
            })
            .join(' ');
    }

    function getTrendPoints(): Array<{ x: number; y: number; score: number; date: string }> {
        if (scoreTrend.length < 1) return [];
        const maxScore = Math.max(...scoreTrend.map((p) => p.score), 100);
        const minScore = Math.min(...scoreTrend.map((p) => p.score), 0);
        const range = maxScore - minScore || 1;
        const stepX = scoreTrend.length > 1 ? (trendWidth - trendPadding * 2) / (scoreTrend.length - 1) : 0;

        return scoreTrend.map((point, i) => ({
            x: trendPadding + i * stepX,
            y: trendHeight - trendPadding - ((point.score - minScore) / range) * (trendHeight - trendPadding * 2),
            score: point.score,
            date: formatDate(point.date),
        }));
    }

    const hasAnalytics = radarSkills.some((s) => s.value > 0);

    return (
        <div className={styles.page}>
            <Header title="Interview History" subtitle="Track your performance and growth over time" />

            <div className={styles.mainGrid}>
                {/* Left — Interview List */}
                <div className={styles.leftCol}>
                    {/* Filters */}
                    <div className={styles.filterBar}>
                        <div className={styles.filterGroup}>
                            {['all', 'behavioral', 'technical', 'system-design'].map((f) => (
                                <button
                                    key={f}
                                    className={`${styles.filterBtn} ${filter === f ? styles.filterActive : ''}`}
                                    onClick={() => setFilter(f)}
                                >
                                    {f === 'system-design' ? 'System Design' : f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>
                        <Button size="sm" variant="ghost" icon={<Filter size={14} />}>
                            More Filters
                        </Button>
                    </div>

                    {/* Interview Cards */}
                    {loading ? (
                        <div className={styles.interviewList}>
                            {[1, 2, 3].map((i) => (
                                <div key={i} className={styles.skeleton} />
                            ))}
                        </div>
                    ) : interviews.length === 0 ? (
                        <Card>
                            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                No interviews found. Start practicing!
                            </p>
                        </Card>
                    ) : (
                        <motion.div
                            className={styles.interviewList}
                            variants={container}
                            initial="hidden"
                            animate="show"
                        >
                            {interviews.map((interview) => (
                                <motion.div key={interview.id} variants={item}>
                                    <Card
                                        className={styles.interviewCard}
                                        hover
                                        onClick={() => window.location.href = `/history/${interview.id}`}
                                    >
                                        <div className={styles.interviewTop}>
                                            <div className={styles.interviewIcon}>
                                                <Mic size={18} />
                                            </div>
                                            <div className={styles.interviewInfo}>
                                                <h4 className={styles.interviewType}>
                                                    {interview.type.charAt(0).toUpperCase() + interview.type.slice(1).replace('-', ' ')}
                                                </h4>
                                                <p className={styles.interviewTopic}>{interview.topic}</p>
                                            </div>
                                            <div className={styles.interviewScore}>
                                                <span
                                                    className={styles.scoreNum}
                                                    style={{ color: getScoreColor(interview.score) }}
                                                >
                                                    {interview.score}
                                                </span>
                                                <span className={styles.scoreOf}>/100</span>
                                            </div>
                                        </div>
                                        <div className={styles.interviewBottom}>
                                            <span className={styles.interviewMeta}>
                                                <Calendar size={12} /> {formatDate(interview.createdAt)}
                                            </span>
                                            <span className={styles.interviewMeta}>
                                                <Clock size={12} /> {interview.duration}
                                            </span>
                                            <span className={styles.interviewMeta}>
                                                {interview.questions} questions
                                            </span>
                                            <Badge variant={getBadgeVariant(interview.score)} size="sm">
                                                {interview.score >= 80 ? 'Passed' : 'Needs Work'}
                                            </Badge>
                                            <ChevronRight size={14} style={{ marginLeft: 'auto', color: 'var(--text-tertiary)' }} />
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </div>

                {/* Right — Analytics */}
                <div className={styles.rightCol}>
                    {/* Score Trend Chart */}
                    {scoreTrend.length >= 2 && (
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <Card>
                                <h3 className={styles.cardTitle}>
                                    <TrendingUp size={16} /> Score Trend
                                </h3>
                                <svg
                                    viewBox={`0 0 ${trendWidth} ${trendHeight}`}
                                    className={styles.trendSvg}
                                >
                                    {/* Grid lines */}
                                    {[25, 50, 75, 100].map((v) => {
                                        const y = trendHeight - trendPadding - ((v) / 100) * (trendHeight - trendPadding * 2);
                                        return (
                                            <g key={v}>
                                                <line
                                                    x1={trendPadding}
                                                    y1={y}
                                                    x2={trendWidth - trendPadding}
                                                    y2={y}
                                                    stroke="var(--border-subtle)"
                                                    strokeWidth="0.5"
                                                    strokeDasharray="4 4"
                                                />
                                                <text
                                                    x={trendPadding - 4}
                                                    y={y + 3}
                                                    textAnchor="end"
                                                    fill="var(--text-tertiary)"
                                                    fontSize="8"
                                                >
                                                    {v}
                                                </text>
                                            </g>
                                        );
                                    })}
                                    {/* Gradient area fill */}
                                    <defs>
                                        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity="0.25" />
                                            <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                    {scoreTrend.length >= 2 && (
                                        <path
                                            d={`${buildTrendPath()} L ${trendWidth - trendPadding} ${trendHeight - trendPadding} L ${trendPadding} ${trendHeight - trendPadding} Z`}
                                            fill="url(#trendGrad)"
                                        />
                                    )}
                                    {/* Line */}
                                    <path
                                        d={buildTrendPath()}
                                        fill="none"
                                        stroke="var(--accent-blue)"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    {/* Data points */}
                                    {getTrendPoints().map((pt, i) => (
                                        <g key={i}>
                                            <circle cx={pt.x} cy={pt.y} r="4" fill="var(--accent-blue)" />
                                            <title>{pt.date}: {pt.score}/100</title>
                                        </g>
                                    ))}
                                </svg>
                                <div className={styles.trendLabels}>
                                    <span>{formatDate(scoreTrend[0].date)}</span>
                                    <span>{formatDate(scoreTrend[scoreTrend.length - 1].date)}</span>
                                </div>
                            </Card>
                        </motion.div>
                    )}

                    {/* Radar Chart */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Card>
                            <h3 className={styles.cardTitle}>
                                <BarChart3 size={16} /> Performance Radar
                            </h3>
                            {hasAnalytics ? (
                                <>
                                    <div className={styles.radarContainer}>
                                        <svg viewBox="0 0 300 300" className={styles.radarSvg}>
                                            {/* Background rings */}
                                            {[20, 40, 60, 80, 100].map((ring) => (
                                                <polygon
                                                    key={ring}
                                                    points={radarSkills
                                                        .map((_, i) => {
                                                            const angle = (Math.PI * 2 * i) / radarSkills.length - Math.PI / 2;
                                                            const r = (ring / 100) * 120;
                                                            return `${150 + r * Math.cos(angle)},${150 + r * Math.sin(angle)}`;
                                                        })
                                                        .join(' ')}
                                                    fill="none"
                                                    stroke="var(--border-subtle)"
                                                    strokeWidth="1"
                                                />
                                            ))}
                                            {/* Data polygon */}
                                            <polygon
                                                points={radarSkills
                                                    .map((skill, i) => {
                                                        const angle = (Math.PI * 2 * i) / radarSkills.length - Math.PI / 2;
                                                        const r = (skill.value / 100) * 120;
                                                        return `${150 + r * Math.cos(angle)},${150 + r * Math.sin(angle)}`;
                                                    })
                                                    .join(' ')}
                                                fill="rgba(59, 130, 246, 0.15)"
                                                stroke="var(--accent-blue)"
                                                strokeWidth="2"
                                            />
                                            {/* Data points */}
                                            {radarSkills.map((skill, i) => {
                                                const angle = (Math.PI * 2 * i) / radarSkills.length - Math.PI / 2;
                                                const r = (skill.value / 100) * 120;
                                                return (
                                                    <circle
                                                        key={i}
                                                        cx={150 + r * Math.cos(angle)}
                                                        cy={150 + r * Math.sin(angle)}
                                                        r="4"
                                                        fill="var(--accent-blue)"
                                                    />
                                                );
                                            })}
                                            {/* Labels */}
                                            {radarSkills.map((skill, i) => {
                                                const angle = (Math.PI * 2 * i) / radarSkills.length - Math.PI / 2;
                                                const r = 140;
                                                return (
                                                    <text
                                                        key={i}
                                                        x={150 + r * Math.cos(angle)}
                                                        y={150 + r * Math.sin(angle)}
                                                        textAnchor="middle"
                                                        dominantBaseline="middle"
                                                        fill="var(--text-secondary)"
                                                        fontSize="11"
                                                        fontWeight="600"
                                                    >
                                                        {skill.label}
                                                    </text>
                                                );
                                            })}
                                        </svg>
                                    </div>
                                    <div className={styles.radarLegend}>
                                        {radarSkills.map((skill) => (
                                            <div key={skill.label} className={styles.radarLegendItem}>
                                                <span>{skill.label}</span>
                                                <span className={styles.radarScore}>{skill.value}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <p style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
                                    Complete an interview with AI evaluation to see your performance radar.
                                </p>
                            )}
                        </Card>
                    </motion.div>

                    {/* Skill Gap Heatmap */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <Card>
                            <h3 className={styles.cardTitle}>
                                <TrendingUp size={16} /> Skill Breakdown by Type
                            </h3>
                            {heatmapData.some((c) => c.skills.some((s) => s.score > 0)) ? (
                                <>
                                    <div className={styles.heatmap}>
                                        {heatmapData.map((category) => (
                                            <div key={category.category} className={styles.heatmapRow}>
                                                <span className={styles.heatmapCategory}>{category.category}</span>
                                                <div className={styles.heatmapCells}>
                                                    {category.skills.map((skill) => (
                                                        <div
                                                            key={skill.name}
                                                            className={styles.heatmapCell}
                                                            style={{
                                                                background: skill.score > 0 ? getScoreColor(skill.score) : 'var(--bg-tertiary)',
                                                                opacity: skill.score > 0 ? 0.15 + (skill.score / 100) * 0.85 : 0.3,
                                                            }}
                                                            title={`${skill.name}: ${skill.score > 0 ? skill.score + '%' : 'No data'}`}
                                                        >
                                                            <span className={styles.heatmapLabel}>{skill.name}</span>
                                                            <span className={styles.heatmapValue}>
                                                                {skill.score > 0 ? skill.score : '—'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className={styles.heatmapScale}>
                                        <span>Weak</span>
                                        <div className={styles.scaleBar} />
                                        <span>Strong</span>
                                    </div>
                                </>
                            ) : (
                                <p style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
                                    Complete interviews across different types to see your skill breakdown.
                                </p>
                            )}
                        </Card>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
