'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mic,
    MicOff,
    Video,
    VideoOff,
    PhoneOff,
    Pause,
    Play,
    MessageSquare,
    Brain,
    Clock,
    ChevronRight,
    Volume2,
    AlertCircle,
    CheckCircle2,
    Lightbulb,
    TrendingUp,
    Zap,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import styles from './interview.module.css';

const interviewTypes = [
    { id: 'behavioral', label: 'Behavioral', icon: MessageSquare, color: 'var(--accent-blue)' },
    { id: 'technical', label: 'Technical', icon: Brain, color: 'var(--accent-purple)' },
    { id: 'system-design', label: 'System Design', icon: Zap, color: 'var(--accent-cyan)' },
];

const questions = [
    'Tell me about yourself and your experience.',
    'Describe a challenging project you led and how you overcame obstacles.',
    'How do you approach system design for a high-traffic application?',
    'Walk me through your problem-solving process.',
    'What are your greatest strengths and areas for improvement?',
];

const coachTips = [
    { type: 'positive', icon: CheckCircle2, text: 'Great eye contact and posture!', color: 'var(--accent-emerald)' },
    { type: 'suggestion', icon: Lightbulb, text: 'Try to reduce filler words like "um" and "uh"', color: 'var(--accent-amber)' },
    { type: 'insight', icon: TrendingUp, text: 'Your pacing is improving — 140 WPM (ideal range)', color: 'var(--accent-blue)' },
    { type: 'warning', icon: AlertCircle, text: 'Remember to use the STAR method for behavioral questions', color: 'var(--accent-rose)' },
];

const transcriptMessages = [
    { role: 'ai', text: 'Welcome! Let\'s begin with your mock interview. I\'ll be evaluating your communication, technical depth, and confidence. Are you ready?' },
    { role: 'user', text: 'Yes, I\'m ready. Let\'s get started!' },
    { role: 'ai', text: 'Great! Tell me about yourself and walk me through your professional journey. Focus on your most relevant experiences.' },
    { role: 'user', text: 'I\'m a software engineer with 4 years of experience building scalable web applications. Most recently, I led the frontend architecture for a fintech startup...' },
];

export default function InterviewPage() {
    const [isActive, setIsActive] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [selectedType, setSelectedType] = useState('behavioral');
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [timer, setTimer] = useState(0);
    const [showCoach, setShowCoach] = useState(true);
    const [waveformData, setWaveformData] = useState<number[]>(
        Array.from({ length: 50 }, () => Math.random())
    );

    // Timer
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isActive && !isPaused) {
            interval = setInterval(() => {
                setTimer((prev) => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isActive, isPaused]);

    // Waveform animation
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isActive && !isPaused) {
            interval = setInterval(() => {
                setWaveformData(
                    Array.from({ length: 50 }, () => Math.random() * 0.8 + 0.2)
                );
            }, 150);
        }
        return () => clearInterval(interval);
    }, [isActive, isPaused]);

    const formatTimer = useCallback((s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, []);

    if (!isActive) {
        return (
            <div className={styles.page}>
                <Header title="AI Interview" subtitle="Start a voice-powered mock interview session" />

                <motion.div
                    className={styles.setupContainer}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Card className={styles.setupCard} glow="blue">
                        <div className={styles.setupHeader}>
                            <div className={styles.setupIconWrap}>
                                <Mic size={32} />
                            </div>
                            <h2 className={styles.setupTitle}>Start Mock Interview</h2>
                            <p className={styles.setupDesc}>
                                Choose your interview type and let our AI voice agent guide you through
                                realistic interview scenarios with real-time coaching.
                            </p>
                        </div>

                        <div className={styles.typeSelector}>
                            <h3 className={styles.selectorLabel}>Interview Type</h3>
                            <div className={styles.typeGrid}>
                                {interviewTypes.map((type) => (
                                    <button
                                        key={type.id}
                                        className={`${styles.typeBtn} ${selectedType === type.id ? styles.typeActive : ''}`}
                                        onClick={() => setSelectedType(type.id)}
                                        style={{ '--type-color': type.color } as React.CSSProperties}
                                    >
                                        <type.icon size={20} />
                                        <span>{type.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className={styles.setupOptions}>
                            <div className={styles.optionRow}>
                                <span>AI Difficulty</span>
                                <Badge variant="amber">Medium</Badge>
                            </div>
                            <div className={styles.optionRow}>
                                <span>Duration</span>
                                <Badge variant="blue">30 minutes</Badge>
                            </div>
                            <div className={styles.optionRow}>
                                <span>AI Coach</span>
                                <Badge variant="emerald" dot>Enabled</Badge>
                            </div>
                        </div>

                        <Button
                            size="lg"
                            fullWidth
                            icon={<Mic size={18} />}
                            onClick={() => setIsActive(true)}
                        >
                            Begin Interview
                        </Button>
                    </Card>
                </motion.div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            {/* Active Interview Header */}
            <div className={styles.interviewHeader}>
                <div className={styles.headerLeft}>
                    <Badge variant="rose" dot>LIVE</Badge>
                    <span className={styles.timer}>
                        <Clock size={14} /> {formatTimer(timer)}
                    </span>
                </div>
                <div className={styles.headerCenter}>
                    <span className={styles.questionProgress}>
                        Question {currentQuestion + 1} of {questions.length}
                    </span>
                </div>
                <div className={styles.headerRight}>
                    <Badge variant="blue">Behavioral</Badge>
                </div>
            </div>

            <div className={styles.interviewGrid}>
                {/* Main Interview Area */}
                <div className={styles.mainArea}>
                    {/* AI Question */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Card className={styles.questionCard}>
                            <div className={styles.questionLabel}>
                                <Brain size={16} /> AI Interviewer
                            </div>
                            <p className={styles.questionText}>{questions[currentQuestion]}</p>
                            <div className={styles.questionNav}>
                                <button
                                    className={styles.navBtn}
                                    disabled={currentQuestion === 0}
                                    onClick={() => setCurrentQuestion((p) => p - 1)}
                                >
                                    Previous
                                </button>
                                <button
                                    className={styles.navBtn}
                                    disabled={currentQuestion === questions.length - 1}
                                    onClick={() => setCurrentQuestion((p) => p + 1)}
                                >
                                    Next <ChevronRight size={14} />
                                </button>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Voice Waveform */}
                    <Card className={styles.waveformCard}>
                        <div className={styles.waveformHeader}>
                            <Volume2 size={16} color="var(--accent-blue)" />
                            <span>Voice Activity</span>
                            {!isPaused && (
                                <span className={styles.recording}>
                                    <span className={styles.recordDot} />
                                    Recording
                                </span>
                            )}
                        </div>
                        <div className={styles.waveform}>
                            {waveformData.map((val, i) => (
                                <motion.div
                                    key={i}
                                    className={styles.waveBar}
                                    animate={{
                                        height: isPaused ? '8px' : `${val * 80}px`,
                                    }}
                                    transition={{ duration: 0.15 }}
                                    style={{
                                        background: `linear-gradient(to top, var(--accent-blue), var(--accent-purple))`,
                                        opacity: 0.4 + val * 0.6,
                                    }}
                                />
                            ))}
                        </div>
                    </Card>

                    {/* Live Transcript */}
                    <Card className={styles.transcriptCard}>
                        <h3 className={styles.sectionTitle}>
                            <MessageSquare size={16} /> Live Transcript
                        </h3>
                        <div className={styles.transcript}>
                            {transcriptMessages.map((msg, i) => (
                                <motion.div
                                    key={i}
                                    className={`${styles.transcriptMsg} ${styles[msg.role]}`}
                                    initial={{ opacity: 0, x: msg.role === 'ai' ? -10 : 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.2 }}
                                >
                                    <span className={styles.msgRole}>
                                        {msg.role === 'ai' ? 'AI' : 'You'}
                                    </span>
                                    <p className={styles.msgText}>{msg.text}</p>
                                </motion.div>
                            ))}
                            <div className={styles.typingIndicator}>
                                <span /><span /><span />
                            </div>
                        </div>
                    </Card>

                    {/* Controls */}
                    <div className={styles.controls}>
                        <button
                            className={`${styles.controlBtn} ${isMuted ? styles.muted : ''}`}
                            onClick={() => setIsMuted(!isMuted)}
                        >
                            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                        </button>
                        <button
                            className={`${styles.controlBtn} ${!isVideoOn ? styles.muted : ''}`}
                            onClick={() => setIsVideoOn(!isVideoOn)}
                        >
                            {isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}
                        </button>
                        <button
                            className={`${styles.controlBtn} ${styles.pauseBtn}`}
                            onClick={() => setIsPaused(!isPaused)}
                        >
                            {isPaused ? <Play size={20} /> : <Pause size={20} />}
                        </button>
                        <button
                            className={`${styles.controlBtn} ${styles.endBtn}`}
                            onClick={() => {
                                setIsActive(false);
                                setTimer(0);
                                setCurrentQuestion(0);
                            }}
                        >
                            <PhoneOff size={20} />
                        </button>
                    </div>
                </div>

                {/* AI Coach Panel */}
                <AnimatePresence>
                    {showCoach && (
                        <motion.div
                            className={styles.coachPanel}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                        >
                            <Card className={styles.coachCard}>
                                <div className={styles.coachHeader}>
                                    <Brain size={18} color="var(--accent-purple)" />
                                    <h3 className={styles.sectionTitle}>AI Coach</h3>
                                    <Badge variant="purple" dot>Active</Badge>
                                </div>

                                {/* Confidence Score */}
                                <div className={styles.confidenceSection}>
                                    <span className={styles.confidenceLabel}>Confidence Level</span>
                                    <div className={styles.confidenceBar}>
                                        <motion.div
                                            className={styles.confidenceFill}
                                            initial={{ width: 0 }}
                                            animate={{ width: '78%' }}
                                            transition={{ duration: 1, delay: 0.5 }}
                                        />
                                    </div>
                                    <span className={styles.confidenceValue}>78%</span>
                                </div>

                                {/* Real-time Tips */}
                                <div className={styles.tipsSection}>
                                    <h4 className={styles.tipsLabel}>Real-time Feedback</h4>
                                    <div className={styles.tipsList}>
                                        {coachTips.map((tip, i) => (
                                            <motion.div
                                                key={i}
                                                className={styles.tipItem}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.3 + i * 0.15 }}
                                            >
                                                <tip.icon size={14} color={tip.color} />
                                                <span>{tip.text}</span>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>

                                {/* Metrics */}
                                <div className={styles.metricsSection}>
                                    <h4 className={styles.tipsLabel}>Session Metrics</h4>
                                    <div className={styles.metricGrid}>
                                        <div className={styles.metric}>
                                            <span className={styles.metricValue}>140</span>
                                            <span className={styles.metricLabel}>WPM</span>
                                        </div>
                                        <div className={styles.metric}>
                                            <span className={styles.metricValue}>3</span>
                                            <span className={styles.metricLabel}>Fillers</span>
                                        </div>
                                        <div className={styles.metric}>
                                            <span className={styles.metricValue}>82%</span>
                                            <span className={styles.metricLabel}>Clarity</span>
                                        </div>
                                        <div className={styles.metric}>
                                            <span className={styles.metricValue}>A-</span>
                                            <span className={styles.metricLabel}>Grade</span>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Toggle Coach Button (mobile) */}
            <button
                className={styles.coachToggle}
                onClick={() => setShowCoach(!showCoach)}
            >
                <Brain size={16} />
                {showCoach ? 'Hide Coach' : 'Show Coach'}
            </button>
        </div>
    );
}
