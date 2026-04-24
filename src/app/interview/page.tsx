'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpeech } from '@/hooks/useSpeech';
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

// Hardcoded static references removed, driven by useChat state.

export default function InterviewPage() {
    const [isActive, setIsActive] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [selectedType, setSelectedType] = useState('behavioral');
    const [timer, setTimer] = useState(0);
    const [showCoach, setShowCoach] = useState(true);
    const [waveformData, setWaveformData] = useState<number[]>(Array.from({ length: 50 }, () => 0.1));
    const [currentAnswer, setCurrentAnswer] = useState('');

    const [messages, setMessages] = useState<Array<{ role: string, content: string }>>([]);
    const [isLoading, setIsLoading] = useState(false);

    // ── Refs that mirror state so callbacks always read the latest values ──
    const currentAnswerRef = useRef(currentAnswer);
    const messagesRef = useRef(messages);
    const isLoadingRef = useRef(isLoading);
    const isSpeakingRef = useRef(false);
    const transcriptRef = useRef<HTMLDivElement>(null);

    useEffect(() => { currentAnswerRef.current = currentAnswer; }, [currentAnswer]);
    useEffect(() => { messagesRef.current = messages; }, [messages]);
    useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);

    const append = async (newUserMessage: { role: 'user', content: string }) => {
        const updatedMessages = [...messagesRef.current, newUserMessage];
        setMessages(updatedMessages);
        messagesRef.current = updatedMessages;
        setIsLoading(true);

        try {
            const res = await fetch('/api/interview/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: updatedMessages,
                    topic: selectedType,
                }),
            });

            if (!res.ok || !res.body) throw new Error('Network response was not ok');

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let aiText = '';

            // Add an empty assistant message
            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                aiText += chunk;

                // Update the last message
                setMessages(prev => {
                    const newMsgs = [...prev];
                    newMsgs[newMsgs.length - 1].content = aiText;
                    return newMsgs;
                });
            }

            setIsLoading(false);

            if (isActive && !isPaused && !isMuted) {
                speakText(aiText);
            }
        } catch (error) {
            console.error('Failed to fetch AI response:', error);
            setIsLoading(false);
        }
    };

    const {
        isRecording,
        isSpeaking,
        startRecording,
        stopRecording,
        speakText,
        stopSpeaking,
    } = useSpeech({
        onSpeechResult: (text) => {
            if (!isPaused && !isMuted) {
                setCurrentAnswer((prev) => {
                    const updated = prev ? prev + " " + text : text;
                    currentAnswerRef.current = updated;
                    return updated;
                });
            }
        },
        onSilence: () => {
            // Guard: don't fire while AI is loading/speaking, or if answer is empty
            if (isLoadingRef.current || isSpeakingRef.current) return;
            const answer = currentAnswerRef.current.trim();
            if (answer !== '') {
                append({ role: 'user', content: answer });
                setCurrentAnswer('');
                currentAnswerRef.current = '';
            }
        }
    });

    // Keep isSpeakingRef in sync
    useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);

    // Auto-start recording functionality
    useEffect(() => {
        if (isActive && !isPaused && !isMuted && !isSpeaking) {
            startRecording();
        } else {
            stopRecording();
        }
    }, [isActive, isPaused, isMuted, isSpeaking, startRecording, stopRecording]);

    // Derived states
    const aiMessages = messages.filter((m: any) => m.role === 'assistant');
    const questionNumber = Math.max(1, aiMessages.length);
    const latestQuestion = aiMessages.length > 0 ? aiMessages[aiMessages.length - 1].content : 'Waiting for AI to ask the first question...';
    const transcriptMessages = messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'ai' : 'user',
        text: m.content
    }));
    if (currentAnswer.trim() !== '') {
        transcriptMessages.push({ role: 'user', text: currentAnswer });
    }

    // Auto-scroll transcript to the bottom on new messages
    useEffect(() => {
        if (transcriptRef.current) {
            transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
        }
    }, [messages, currentAnswer]);

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

    // Waveform animation based on speaking vs recording status
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isActive && !isPaused) {
            interval = setInterval(() => {
                setWaveformData(
                    Array.from({ length: 50 }, () => {
                        const base = isSpeaking ? 0.6 : (isRecording ? 0.3 : 0.1);
                        return base + Math.random() * (isSpeaking ? 0.4 : 0.15);
                    })
                );
            }, 100);
        } else {
            setWaveformData(Array.from({ length: 50 }, () => 0.1));
        }
        return () => clearInterval(interval);
    }, [isActive, isPaused, isSpeaking, isRecording]);

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
                            onClick={() => {
                                setIsActive(true);
                                // Trigger first question by appending initial context
                                append({ role: 'user', content: `Hi, I'm ready to begin the ${selectedType} interview.` });
                            }}
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
                        Question {questionNumber}
                    </span>
                </div>
                <div className={styles.headerRight}>
                    <Badge variant="blue">{interviewTypes.find(t => t.id === selectedType)?.label || 'Interview'}</Badge>
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
                            <p className={styles.questionText}>
                                {latestQuestion}
                            </p>
                        </Card>
                    </motion.div>

                    {/* Voice Waveform */}
                    <Card className={styles.waveformCard}>
                        <div className={styles.waveformHeader}>
                            <Volume2 size={16} color="var(--accent-blue)" />
                            <span>{isSpeaking ? 'AI Speaking' : 'Your Voice'}</span>
                            {!isPaused && (
                                <span className={styles.recording}>
                                    <span className={styles.recordDot} style={{ background: isSpeaking ? 'var(--accent-purple)' : undefined }} />
                                    {isSpeaking ? 'Listening' : (isRecording ? 'Recording' : 'Waiting')}
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
                        <div className={styles.transcript} ref={transcriptRef}>
                            {transcriptMessages.map((msg: any, i: number) => (
                                <motion.div
                                    key={i}
                                    className={`${styles.transcriptMsg} ${styles[msg.role]}`}
                                    initial={{ opacity: 0, x: msg.role === 'ai' ? -10 : 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                >
                                    <span className={styles.msgRole}>
                                        {msg.role === 'ai' ? 'AI' : 'You'}
                                    </span>
                                    <p className={styles.msgText}>{msg.text}</p>
                                </motion.div>
                            ))}

                            {/* Live Interim Transcript */}
                            {currentAnswer && (
                                <div className={`${styles.transcriptMsg} ${styles.user}`} style={{ opacity: 0.7 }}>
                                    <span className={styles.msgRole}>You</span>
                                    <p className={styles.msgText}>{currentAnswer}</p>
                                </div>
                            )}

                            {isLoading && (
                                <div className={styles.typingIndicator}>
                                    <span /><span /><span />
                                </div>
                            )}
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
                            disabled={isLoading}
                            onClick={async () => {
                                setIsLoading(true);
                                try {
                                    // Stop recording immediately
                                    setIsActive(false);

                                    // Generate placeholder score until AI evaluation is fully implemented
                                    const baseScore = Math.floor(Math.random() * 16) + 75; // 75-90

                                    const res = await fetch('/api/interviews', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            type: selectedType,
                                            topic: `${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Interview`,
                                            score: baseScore,
                                            duration: `${Math.max(1, Math.ceil(timer / 60))} min`,
                                            questions: Math.max(1, messages.filter((m: any) => m.role === 'assistant').length),
                                            transcript: messages,
                                            feedback: {
                                                communication: baseScore + 2,
                                                technical: baseScore - 3,
                                                problemSolving: baseScore,
                                                confidence: baseScore + 5
                                            }
                                        })
                                    });

                                    if (!res.ok) {
                                        const errorData = await res.text();
                                        alert("Failed to save the interview: " + errorData);
                                        setIsLoading(false);
                                        return;
                                    }

                                    // Force relocation so the dashboard safely hard-reloads its server components
                                    window.location.href = '/dashboard';
                                } catch (err) {
                                    console.error('Failed to save interview', err);
                                    setTimer(0);
                                    setIsLoading(false);
                                }
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

                                {/* Real-time Tips (Placeholder for future hookup) */}
                                <div className={styles.tipsSection}>
                                    <h4 className={styles.tipsLabel}>Real-time Feedback</h4>
                                    <div className={styles.tipsList}>
                                        <div className={styles.tipItem}>
                                            <CheckCircle2 size={14} color="var(--accent-emerald)" />
                                            <span>Good detailed explanation</span>
                                        </div>
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
