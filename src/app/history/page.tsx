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

// ── Static data (will be computed from AI feedback later) ──
const radarSkills = [
    { label: 'Communication', value: 85 },
    { label: 'Technical Depth', value: 78 },
    { label: 'Problem Solving', value: 84 },
    { label: 'Confidence', value: 80 },
    { label: 'Clarity', value: 88 },
    { label: 'Structure', value: 75 },
];

const heatmapData = [
    {
        category: 'Behavioral', skills: [
            { name: 'STAR Method', score: 90 },
            { name: 'Leadership', score: 85 },
            { name: 'Teamwork', score: 88 },
            { name: 'Conflict', score: 72 },
        ]
    },
    {
        category: 'Technical', skills: [
            { name: 'React', score: 92 },
            { name: 'System Design', score: 75 },
            { name: 'Algorithms', score: 68 },
            { name: 'APIs', score: 85 },
        ]
    },
    {
        category: 'Soft Skills', skills: [
            { name: 'Communication', score: 88 },
            { name: 'Pacing', score: 78 },
            { name: 'Confidence', score: 80 },
            { name: 'Articulation', score: 82 },
        ]
    },
];

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
};

// ── Helper ──
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

    // ── Fetch interviews from API ──
    useEffect(() => {
        const params = new URLSearchParams();
        if (filter !== 'all') params.set('type', filter);

        fetch(`/api/interviews?${params.toString()}`)
            .then((res) => res.json())
            .then((data) => {
                setInterviews(data.interviews || []);
                setLoading(false);
            })
            .catch((err) => {
                console.error('Failed to load interviews:', err);
                setLoading(false);
            });
    }, [filter]);

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
                                    <Card className={styles.interviewCard} hover>
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
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </div>

                {/* Right — Analytics */}
                <div className={styles.rightCol}>
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
                                <TrendingUp size={16} /> Skill Gap Heatmap
                            </h3>
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
                                                        background: getScoreColor(skill.score),
                                                        opacity: 0.15 + (skill.score / 100) * 0.85,
                                                    }}
                                                    title={`${skill.name}: ${skill.score}%`}
                                                >
                                                    <span className={styles.heatmapLabel}>{skill.name}</span>
                                                    <span className={styles.heatmapValue}>{skill.score}</span>
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
                        </Card>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
