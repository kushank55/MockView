'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Calendar,
    Clock,
    MessageSquare,
    Brain,
    Lightbulb,
    CheckCircle2,
    AlertCircle,
    Zap,
    Trash2,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { getScoreColor } from '@/lib/utils';
import styles from './playback.module.css';

interface InterviewData {
    id: string;
    type: string;
    topic: string;
    score: number;
    duration: string;
    questions: number;
    transcript: Array<{ role: string; content: string }> | null;
    feedback: {
        communication: number;
        technical: number;
        problemSolving: number;
        confidence: number;
    } | null;
    coachTips: Array<{ type: string; text: string; color: string }> | null;
    createdAt: string;
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function getTipIcon(type: string) {
    switch (type) {
        case 'strength':
            return <CheckCircle2 size={14} />;
        case 'improvement':
            return <AlertCircle size={14} />;
        case 'tip':
            return <Lightbulb size={14} />;
        default:
            return <Zap size={14} />;
    }
}

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0 },
};

export default function InterviewPlaybackPage() {
    const params = useParams();
    const router = useRouter();
    const [interview, setInterview] = useState<InterviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (!params.id) return;

        fetch(`/api/interviews/${params.id}`)
            .then((res) => {
                if (!res.ok) throw new Error('Interview not found');
                return res.json();
            })
            .then((data) => {
                setInterview(data);
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
            });
    }, [params.id]);

    if (loading) {
        return (
            <div className={styles.page}>
                <Header title="Interview Review" subtitle="Loading..." />
                <div className={styles.loadingWrap}>Loading interview data...</div>
            </div>
        );
    }

    if (error || !interview) {
        return (
            <div className={styles.page}>
                <Header title="Interview Review" subtitle="Error" />
                <div className={styles.errorWrap}>
                    <p>{error || 'Interview not found'}</p>
                    <button className={styles.backLink} onClick={() => router.push('/history')}>
                        <ArrowLeft size={14} /> Back to History
                    </button>
                </div>
            </div>
        );
    }

    const feedback = interview.feedback;
    const tips = interview.coachTips || [];
    const transcript = interview.transcript || [];

    return (
        <div className={styles.page}>
            <Header
                title="Interview Review"
                subtitle={`${interview.type.charAt(0).toUpperCase() + interview.type.slice(1).replace('-', ' ')} Interview`}
            />

            <button className={styles.backLink} onClick={() => router.push('/history')}>
                <ArrowLeft size={14} /> Back to History
            </button>

            {/* Delete Button */}
            <button
                className={styles.deleteBtn}
                disabled={deleting}
                onClick={async () => {
                    if (!confirm('Are you sure you want to delete this interview? This cannot be undone.')) return;
                    setDeleting(true);
                    try {
                        const res = await fetch(`/api/interviews/${params.id}`, { method: 'DELETE' });
                        if (res.ok) {
                            router.push('/history');
                        } else {
                            alert('Failed to delete interview');
                            setDeleting(false);
                        }
                    } catch {
                        alert('Failed to delete interview');
                        setDeleting(false);
                    }
                }}
            >
                <Trash2 size={14} /> {deleting ? 'Deleting...' : 'Delete Interview'}
            </button>

            {/* Overview Header */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
                <Card className={styles.summaryCard}>
                    <div className={styles.overviewHeader}>
                        <div className={styles.overviewLeft}>
                            <h2 className={styles.overviewTitle}>{interview.topic}</h2>
                            <div className={styles.overviewMeta}>
                                <span className={styles.metaItem}>
                                    <Calendar size={12} /> {formatDate(interview.createdAt)}
                                </span>
                                <span className={styles.metaItem}>
                                    <Clock size={12} /> {interview.duration}
                                </span>
                                <span className={styles.metaItem}>
                                    <MessageSquare size={12} /> {interview.questions} questions
                                </span>
                            </div>
                        </div>
                        <div className={styles.overviewScore}>
                            <span
                                className={styles.bigScore}
                                style={{ color: getScoreColor(interview.score) }}
                            >
                                {interview.score}
                            </span>
                            <span className={styles.scoreLabel}>Overall Score</span>
                        </div>
                    </div>
                </Card>
            </motion.div>

            {/* Feedback Breakdown */}
            {feedback && (
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className={styles.feedbackGrid}>
                        {[
                            { label: 'Communication', value: feedback.communication },
                            { label: 'Technical', value: feedback.technical },
                            { label: 'Problem Solving', value: feedback.problemSolving },
                            { label: 'Confidence', value: feedback.confidence },
                        ].map((f) => (
                            <div key={f.label} className={styles.feedbackItem}>
                                <span
                                    className={styles.feedbackValue}
                                    style={{ color: getScoreColor(f.value) }}
                                >
                                    {f.value}
                                </span>
                                <span className={styles.feedbackLabel}>{f.label}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Coach Tips */}
            {tips.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <h3 className={styles.sectionTitle}>
                        <Brain size={18} /> AI Coach Feedback
                    </h3>
                    <div className={styles.tipsGrid}>
                        {tips.map((tip, i) => (
                            <div key={i} className={`${styles.tipCard} ${styles[tip.type] || ''}`}>
                                <div className={`${styles.tipIconWrap} ${styles[tip.type] || ''}`}>
                                    {getTipIcon(tip.type)}
                                </div>
                                <p className={styles.tipText}>{tip.text}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Full Transcript */}
            {transcript.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Card>
                        <h3 className={styles.sectionTitle}>
                            <MessageSquare size={18} /> Full Transcript
                        </h3>
                        <motion.div
                            className={styles.transcriptContainer}
                            variants={container}
                            initial="hidden"
                            animate="show"
                        >
                            {transcript.map((msg, i) => {
                                const role = msg.role === 'assistant' ? 'ai' : 'user';
                                return (
                                    <motion.div
                                        key={i}
                                        variants={item}
                                        className={`${styles.msgBubble} ${styles[role]}`}
                                    >
                                        <span className={styles.msgRole}>
                                            {role === 'ai' ? 'AI Interviewer' : 'You'}
                                        </span>
                                        <div className={styles.msgContent}>{msg.content}</div>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    </Card>
                </motion.div>
            )}

            {transcript.length === 0 && (
                <Card>
                    <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                        No transcript available for this interview.
                    </p>
                </Card>
            )}
        </div>
    );
}
