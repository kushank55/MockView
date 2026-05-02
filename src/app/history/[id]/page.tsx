'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
    Sparkles,
    Copy,
    Check,
    ChevronDown,
    ChevronUp,
    Share2,
    Star,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ProgressRing from '@/components/ui/ProgressRing';
import { getScoreColor, getScoreLabel } from '@/lib/utils';
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

interface StarResponse {
    situation: string;
    task: string;
    action: string;
    result: string;
    fullAnswer: string;
    keyImprovements: string[];
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
    const [copied, setCopied] = useState(false);

    // STAR Response Builder state
    const [starResponses, setStarResponses] = useState<Record<number, StarResponse>>({});
    const [starLoading, setStarLoading] = useState<Record<number, boolean>>({});
    const [starErrors, setStarErrors] = useState<Record<number, string>>({});
    const [expandedStar, setExpandedStar] = useState<number | null>(null);
    const [copiedStar, setCopiedStar] = useState<number | null>(null);

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

    // Extract Q&A pairs from transcript
    const getQAPairs = useCallback(() => {
        if (!interview?.transcript) return [];
        const pairs: Array<{ question: string; answer: string; questionIndex: number; answerIndex: number }> = [];
        const transcript = interview.transcript;

        for (let i = 0; i < transcript.length; i++) {
            const msg = transcript[i];
            if (msg.role === 'assistant' && i + 1 < transcript.length && transcript[i + 1].role === 'user') {
                pairs.push({
                    question: msg.content,
                    answer: transcript[i + 1].content,
                    questionIndex: i,
                    answerIndex: i + 1,
                });
            }
        }
        return pairs;
    }, [interview]);

    // Generate STAR response for a specific Q&A pair
    const generateStar = async (pairIndex: number, question: string, answer: string) => {
        setStarLoading((prev) => ({ ...prev, [pairIndex]: true }));
        setStarErrors((prev) => ({ ...prev, [pairIndex]: '' }));

        try {
            const res = await fetch(`/api/interviews/${params.id}/star`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question,
                    answer,
                    interviewType: interview?.type || 'general',
                }),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to generate STAR response');
            }

            const data = await res.json();
            setStarResponses((prev) => ({ ...prev, [pairIndex]: data }));
            setExpandedStar(pairIndex);
        } catch (err: any) {
            setStarErrors((prev) => ({ ...prev, [pairIndex]: err.message }));
        } finally {
            setStarLoading((prev) => ({ ...prev, [pairIndex]: false }));
        }
    };

    // Copy STAR answer to clipboard
    const copyStarAnswer = (pairIndex: number, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedStar(pairIndex);
        setTimeout(() => setCopiedStar(null), 2000);
    };

    // Share results summary
    const shareResults = () => {
        if (!interview) return;
        const text = `🎯 MockView AI Interview Results\n\n📝 ${interview.topic}\n📊 Score: ${interview.score}/100\n⏱ Duration: ${interview.duration}\n\n📈 Breakdown:\n• Communication: ${interview.feedback?.communication || 0}%\n• Technical: ${interview.feedback?.technical || 0}%\n• Problem Solving: ${interview.feedback?.problemSolving || 0}%\n• Confidence: ${interview.feedback?.confidence || 0}%\n\n🏆 ${getScoreLabel(interview.score)} Performance!\n\nPractice with MockView AI 🚀`;

        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    if (loading) {
        return (
            <div className={styles.page}>
                <Header title="Interview Review" subtitle="Loading..." />
                <div className={styles.loadingWrap}>
                    <div className={styles.loadingSpinner} />
                    <span>Loading interview data...</span>
                </div>
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
    const qaPairs = getQAPairs();

    const feedbackItems = feedback
        ? [
            { label: 'Communication', value: feedback.communication, icon: MessageSquare, color: 'var(--accent-blue)' },
            { label: 'Technical', value: feedback.technical, icon: Brain, color: 'var(--accent-purple)' },
            { label: 'Problem Solving', value: feedback.problemSolving, icon: Lightbulb, color: 'var(--accent-emerald)' },
            { label: 'Confidence', value: feedback.confidence, icon: Zap, color: 'var(--accent-cyan)' },
        ]
        : [];

    return (
        <div className={styles.page}>
            <Header
                title="Interview Review"
                subtitle={`${interview.type.charAt(0).toUpperCase() + interview.type.slice(1).replace('-', ' ')} Interview`}
            />

            {/* Top Actions Bar */}
            <div className={styles.actionsBar}>
                <button className={styles.backLink} onClick={() => router.push('/history')}>
                    <ArrowLeft size={14} /> Back to History
                </button>
                <div className={styles.actionsRight}>
                    <button
                        className={styles.shareBtn}
                        onClick={shareResults}
                    >
                        {copied ? <Check size={14} /> : <Share2 size={14} />}
                        {copied ? 'Copied!' : 'Share Results'}
                    </button>
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
                        <Trash2 size={14} /> {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>

            {/* Score Hero Section */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
                <Card className={styles.scoreHero} glow={interview.score >= 80 ? 'emerald' : interview.score >= 60 ? 'blue' : null}>
                    <div className={styles.scoreHeroGrid}>
                        <div className={styles.scoreRingWrap}>
                            <ProgressRing
                                progress={interview.score}
                                size={160}
                                strokeWidth={12}
                                color={getScoreColor(interview.score)}
                            >
                                <span className={styles.heroScoreNum}>{interview.score}</span>
                                <span className={styles.heroScoreLabel}>/100</span>
                            </ProgressRing>
                            <Badge
                                variant={interview.score >= 80 ? 'emerald' : interview.score >= 60 ? 'amber' : 'rose'}
                                size="md"
                            >
                                {getScoreLabel(interview.score)}
                            </Badge>
                        </div>

                        <div className={styles.scoreHeroInfo}>
                            <h2 className={styles.heroTitle}>{interview.topic}</h2>
                            <div className={styles.heroMeta}>
                                <span className={styles.metaItem}>
                                    <Calendar size={13} /> {formatDate(interview.createdAt)}
                                </span>
                                <span className={styles.metaItem}>
                                    <Clock size={13} /> {interview.duration}
                                </span>
                                <span className={styles.metaItem}>
                                    <MessageSquare size={13} /> {interview.questions} questions
                                </span>
                            </div>

                            {/* Inline score breakdown */}
                            {feedback && (
                                <div className={styles.miniScoreGrid}>
                                    {feedbackItems.map((f) => (
                                        <div key={f.label} className={styles.miniScoreItem}>
                                            <div className={styles.miniScoreBar}>
                                                <motion.div
                                                    className={styles.miniScoreFill}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${f.value}%` }}
                                                    transition={{ duration: 0.8, delay: 0.3 }}
                                                    style={{ background: f.color }}
                                                />
                                            </div>
                                            <div className={styles.miniScoreInfo}>
                                                <span className={styles.miniScoreLabel}>{f.label}</span>
                                                <span className={styles.miniScoreVal} style={{ color: f.color }}>{f.value}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            </motion.div>

            {/* Coach Tips */}
            {tips.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                >
                    <h3 className={styles.sectionTitle}>
                        <Brain size={18} /> AI Coach Feedback
                    </h3>
                    <div className={styles.tipsGrid}>
                        {tips.map((tip, i) => (
                            <motion.div
                                key={i}
                                className={`${styles.tipCard} ${styles[tip.type] || ''}`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 + i * 0.05 }}
                            >
                                <div className={`${styles.tipIconWrap} ${styles[tip.type] || ''}`}>
                                    {getTipIcon(tip.type)}
                                </div>
                                <p className={styles.tipText}>{tip.text}</p>
                                <Badge
                                    variant={tip.type === 'strength' ? 'emerald' : tip.type === 'improvement' ? 'amber' : 'blue'}
                                    size="sm"
                                >
                                    {tip.type.charAt(0).toUpperCase() + tip.type.slice(1)}
                                </Badge>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* STAR Response Builder */}
            {qaPairs.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                >
                    <div className={styles.starHeader}>
                        <h3 className={styles.sectionTitle}>
                            <Star size={18} /> STAR Response Builder
                        </h3>
                        <Badge variant="purple" dot>AI-Powered</Badge>
                    </div>
                    <p className={styles.starSubtitle}>
                        Click on any answer to get an AI-rewritten version using the STAR method
                        (Situation → Task → Action → Result)
                    </p>

                    <div className={styles.starPairsList}>
                        {qaPairs.map((pair, idx) => (
                            <motion.div
                                key={idx}
                                className={styles.starPair}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 + idx * 0.06 }}
                            >
                                {/* Question */}
                                <div className={styles.starQuestion}>
                                    <div className={styles.starQLabel}>
                                        <Brain size={14} />
                                        <span>Q{idx + 1}</span>
                                    </div>
                                    <p className={styles.starQText}>{pair.question}</p>
                                </div>

                                {/* User's original answer */}
                                <div className={styles.starAnswer}>
                                    <div className={styles.starALabel}>
                                        <MessageSquare size={14} />
                                        <span>Your Answer</span>
                                    </div>
                                    <p className={styles.starAText}>{pair.answer}</p>

                                    {/* Generate STAR button */}
                                    {!starResponses[idx] && (
                                        <button
                                            className={styles.generateStarBtn}
                                            disabled={starLoading[idx]}
                                            onClick={() => generateStar(idx, pair.question, pair.answer)}
                                        >
                                            {starLoading[idx] ? (
                                                <>
                                                    <div className={styles.starBtnSpinner} />
                                                    Analyzing with AI...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles size={14} />
                                                    Rewrite with STAR Method
                                                </>
                                            )}
                                        </button>
                                    )}

                                    {starErrors[idx] && (
                                        <div className={styles.starError}>
                                            <AlertCircle size={14} />
                                            <span>{starErrors[idx]}</span>
                                        </div>
                                    )}
                                </div>

                                {/* STAR Response (if generated) */}
                                <AnimatePresence>
                                    {starResponses[idx] && (
                                        <motion.div
                                            className={styles.starResult}
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                        >
                                            <div className={styles.starResultHeader}>
                                                <div className={styles.starResultTitle}>
                                                    <Sparkles size={16} color="var(--accent-purple)" />
                                                    <span>STAR Ideal Answer</span>
                                                </div>
                                                <div className={styles.starResultActions}>
                                                    <button
                                                        className={styles.copyStarBtn}
                                                        onClick={() => copyStarAnswer(idx, starResponses[idx].fullAnswer)}
                                                    >
                                                        {copiedStar === idx ? <Check size={12} /> : <Copy size={12} />}
                                                        {copiedStar === idx ? 'Copied!' : 'Copy'}
                                                    </button>
                                                    <button
                                                        className={styles.toggleStarBtn}
                                                        onClick={() => setExpandedStar(expandedStar === idx ? null : idx)}
                                                    >
                                                        {expandedStar === idx ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Full STAR answer (always visible) */}
                                            <div className={styles.starFullAnswer}>
                                                <p>{starResponses[idx].fullAnswer}</p>
                                            </div>

                                            {/* Expanded STAR breakdown */}
                                            <AnimatePresence>
                                                {expandedStar === idx && (
                                                    <motion.div
                                                        className={styles.starBreakdown}
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                    >
                                                        <div className={styles.starSteps}>
                                                            <div className={styles.starStep}>
                                                                <div className={`${styles.starStepIcon} ${styles.stepS}`}>S</div>
                                                                <div>
                                                                    <span className={styles.starStepLabel}>Situation</span>
                                                                    <p className={styles.starStepText}>{starResponses[idx].situation}</p>
                                                                </div>
                                                            </div>
                                                            <div className={styles.starStep}>
                                                                <div className={`${styles.starStepIcon} ${styles.stepT}`}>T</div>
                                                                <div>
                                                                    <span className={styles.starStepLabel}>Task</span>
                                                                    <p className={styles.starStepText}>{starResponses[idx].task}</p>
                                                                </div>
                                                            </div>
                                                            <div className={styles.starStep}>
                                                                <div className={`${styles.starStepIcon} ${styles.stepA}`}>A</div>
                                                                <div>
                                                                    <span className={styles.starStepLabel}>Action</span>
                                                                    <p className={styles.starStepText}>{starResponses[idx].action}</p>
                                                                </div>
                                                            </div>
                                                            <div className={styles.starStep}>
                                                                <div className={`${styles.starStepIcon} ${styles.stepR}`}>R</div>
                                                                <div>
                                                                    <span className={styles.starStepLabel}>Result</span>
                                                                    <p className={styles.starStepText}>{starResponses[idx].result}</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Key improvements */}
                                                        {starResponses[idx].keyImprovements?.length > 0 && (
                                                            <div className={styles.keyImprovements}>
                                                                <h4 className={styles.improvementsTitle}>
                                                                    <CheckCircle2 size={14} /> Key Improvements Made
                                                                </h4>
                                                                <ul className={styles.improvementsList}>
                                                                    {starResponses[idx].keyImprovements.map((imp, impIdx) => (
                                                                        <li key={impIdx} className={styles.improvementItem}>
                                                                            <span className={styles.improvementDot} />
                                                                            {imp}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Full Transcript */}
            {transcript.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
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
