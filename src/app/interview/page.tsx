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
    Upload,
    FileText,
    X,
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

const difficultyLevels = [
    { id: 'easy', label: 'Easy', color: 'var(--accent-emerald)', description: 'Supportive & encouraging' },
    { id: 'medium', label: 'Medium', color: 'var(--accent-amber)', description: 'Industry standard' },
    { id: 'hard', label: 'Hard', color: 'var(--accent-rose)', description: 'Rigorous & challenging' },
];

// Filler words to detect
const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'so', 'well', 'right', 'i mean', 'kind of', 'sort of'];

// Hardcoded static references removed, driven by useChat state.

export default function InterviewPage() {
    const [isActive, setIsActive] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [selectedType, setSelectedType] = useState('behavioral');
    const [selectedDifficulty, setSelectedDifficulty] = useState('medium');
    const [customTopic, setCustomTopic] = useState('');
    const [timer, setTimer] = useState(0);
    const [showCoach, setShowCoach] = useState(true);
    const [waveformData, setWaveformData] = useState<number[]>(Array.from({ length: 50 }, () => 0.1));
    const [currentAnswer, setCurrentAnswer] = useState('');

    // Live coach state
    const [coachWpm, setCoachWpm] = useState(0);
    const [coachFillers, setCoachFillers] = useState(0);
    const [coachClarity, setCoachClarity] = useState(0);
    const [coachTips, setCoachTips] = useState<Array<{ icon: string; text: string }>>([]);
    const totalWordsRef = useRef(0);
    const totalFillersRef = useRef(0);
    const speechStartTimeRef = useRef<number | null>(null);
    const timerWarningShown = useRef(false);

    const [messages, setMessages] = useState<Array<{ role: string, content: string }>>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Resume upload state
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [resumeText, setResumeText] = useState('');
    const [isParsingResume, setIsParsingResume] = useState(false);
    const [resumeError, setResumeError] = useState('');
    const resumeTextRef = useRef('');

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
                    resumeText: resumeTextRef.current || undefined,
                    difficulty: selectedDifficulty,
                    customTopic: customTopic || undefined,
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

                // ── Live Coach Analytics ──
                if (!speechStartTimeRef.current) speechStartTimeRef.current = Date.now();
                const words = text.trim().split(/\s+/);
                totalWordsRef.current += words.length;

                // WPM calculation
                const elapsedMin = (Date.now() - speechStartTimeRef.current) / 60000;
                if (elapsedMin > 0.05) {
                    setCoachWpm(Math.round(totalWordsRef.current / elapsedMin));
                }

                // Filler word detection
                const lowerText = text.toLowerCase();
                let fillerCount = 0;
                FILLER_WORDS.forEach((filler) => {
                    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
                    const matches = lowerText.match(regex);
                    if (matches) fillerCount += matches.length;
                });
                totalFillersRef.current += fillerCount;
                setCoachFillers(totalFillersRef.current);

                // Clarity score (based on word length and filler ratio)
                const fillerRatio = totalWordsRef.current > 0 ? totalFillersRef.current / totalWordsRef.current : 0;
                const clarity = Math.max(0, Math.min(100, Math.round(100 - fillerRatio * 300)));
                setCoachClarity(clarity);

                // Dynamic tips
                const tips: Array<{ icon: string; text: string }> = [];
                const wpm = elapsedMin > 0.05 ? Math.round(totalWordsRef.current / elapsedMin) : 0;
                if (wpm > 180) tips.push({ icon: 'warning', text: 'You\'re speaking too fast — slow down a bit' });
                else if (wpm > 0 && wpm < 90) tips.push({ icon: 'warning', text: 'Try to speak a bit faster and more confidently' });
                else if (wpm >= 120 && wpm <= 160) tips.push({ icon: 'success', text: 'Great pace — clear and measured' });
                if (totalFillersRef.current > 5) tips.push({ icon: 'warning', text: `${totalFillersRef.current} filler words detected — try pausing instead` });
                else if (totalFillersRef.current <= 2 && totalWordsRef.current > 20) tips.push({ icon: 'success', text: 'Very few filler words — excellent!' });
                if (clarity >= 80 && totalWordsRef.current > 20) tips.push({ icon: 'success', text: 'High clarity score — well articulated' });
                setCoachTips(tips);
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

    // Timer with warning and auto-end
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isActive && !isPaused) {
            interval = setInterval(() => {
                setTimer((prev) => {
                    const next = prev + 1;
                    // Auto-end at 30 minutes
                    if (next >= 1800 && !timerWarningShown.current) {
                        timerWarningShown.current = true;
                        // Will trigger end via the effect below
                    }
                    return next;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isActive, isPaused]);

    // Timer warning: flash and auto-end
    const isTimerWarning = timer >= 1500; // 25 minutes
    const isTimerExpired = timer >= 1800; // 30 minutes

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

                        {/* Resume Upload Section */}
                        <div className={styles.resumeUploadSection}>
                            <h3 className={styles.selectorLabel}>Upload Resume <span className={styles.optionalTag}>(Optional)</span></h3>
                            <p className={styles.resumeHint}>Upload your resume for personalized questions based on your experience</p>

                            {!resumeFile ? (
                                <label className={styles.uploadZone}>
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        className={styles.fileInput}
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            setResumeFile(file);
                                            setResumeError('');
                                            setIsParsingResume(true);

                                            try {
                                                const formData = new FormData();
                                                formData.append('resume', file);
                                                const res = await fetch('/api/interview/parse-resume', {
                                                    method: 'POST',
                                                    body: formData,
                                                });
                                                if (!res.ok) {
                                                    const err = await res.json();
                                                    throw new Error(err.error || 'Failed to parse resume');
                                                }
                                                const data = await res.json();
                                                setResumeText(data.text);
                                                resumeTextRef.current = data.text;
                                            } catch (err: any) {
                                                setResumeError(err.message || 'Failed to parse resume');
                                                setResumeFile(null);
                                                setResumeText('');
                                                resumeTextRef.current = '';
                                            } finally {
                                                setIsParsingResume(false);
                                            }
                                        }}
                                    />
                                    <Upload size={24} className={styles.uploadIcon} />
                                    <span className={styles.uploadText}>Click to upload PDF resume</span>
                                </label>
                            ) : (
                                <div className={styles.uploadedFile}>
                                    <FileText size={18} className={styles.fileIcon} />
                                    <span className={styles.fileName}>{resumeFile.name}</span>
                                    {isParsingResume ? (
                                        <span className={styles.parsingBadge}>Parsing...</span>
                                    ) : resumeText ? (
                                        <Badge variant="emerald" dot>Ready</Badge>
                                    ) : null}
                                    <button
                                        className={styles.removeFileBtn}
                                        onClick={() => {
                                            setResumeFile(null);
                                            setResumeText('');
                                            setResumeError('');
                                            resumeTextRef.current = '';
                                        }}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )}

                            {resumeError && (
                                <div className={styles.resumeErrorMsg}>
                                    <AlertCircle size={14} />
                                    <span>{resumeError}</span>
                                </div>
                            )}
                        </div>

                        {/* Difficulty Selector */}
                        <div className={styles.typeSelector}>
                            <h3 className={styles.selectorLabel}>Difficulty Level</h3>
                            <div className={styles.typeGrid}>
                                {difficultyLevels.map((level) => (
                                    <button
                                        key={level.id}
                                        className={`${styles.typeBtn} ${selectedDifficulty === level.id ? styles.typeActive : ''}`}
                                        onClick={() => setSelectedDifficulty(level.id)}
                                        style={{ '--type-color': level.color } as React.CSSProperties}
                                    >
                                        <span>{level.label}</span>
                                        <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text-tertiary)' }}>{level.description}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom Topic Input */}
                        <div className={styles.resumeUploadSection}>
                            <h3 className={styles.selectorLabel}>Custom Topic <span className={styles.optionalTag}>(Optional)</span></h3>
                            <input
                                type="text"
                                className={styles.customTopicInput}
                                placeholder="e.g. React Developer at Google, Backend Engineer..."
                                value={customTopic}
                                onChange={(e) => setCustomTopic(e.target.value)}
                            />
                        </div>

                        <div className={styles.setupOptions}>
                            <div className={styles.optionRow}>
                                <span>AI Difficulty</span>
                                <Badge variant={selectedDifficulty === 'easy' ? 'emerald' : selectedDifficulty === 'hard' ? 'rose' : 'amber'}>
                                    {selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1)}
                                </Badge>
                            </div>
                            <div className={styles.optionRow}>
                                <span>Duration</span>
                                <Badge variant="blue">30 minutes</Badge>
                            </div>
                            <div className={styles.optionRow}>
                                <span>AI Coach</span>
                                <Badge variant="emerald" dot>Enabled</Badge>
                            </div>
                            <div className={styles.optionRow}>
                                <span>Resume</span>
                                <Badge variant={resumeText ? 'emerald' : 'blue'} dot={!!resumeText}>
                                    {resumeText ? 'Uploaded' : 'None'}
                                </Badge>
                            </div>
                            {customTopic && (
                                <div className={styles.optionRow}>
                                    <span>Custom Topic</span>
                                    <Badge variant="purple">{customTopic.slice(0, 25)}{customTopic.length > 25 ? '...' : ''}</Badge>
                                </div>
                            )}
                        </div>

                        <Button
                            size="lg"
                            fullWidth
                            icon={<Mic size={18} />}
                            disabled={isParsingResume}
                            onClick={() => {
                                setIsActive(true);
                                let msg = `Hi, I'm ready to begin the ${selectedType} interview.`;
                                if (customTopic) msg += ` The topic I want to focus on is: ${customTopic}.`;
                                if (resumeText) msg += ` I've uploaded my resume for your reference.`;
                                append({ role: 'user', content: msg });
                            }}
                        >
                            {isParsingResume ? 'Parsing Resume...' : 'Begin Interview'}
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
                    <span className={`${styles.timer} ${isTimerWarning ? styles.timerWarning : ''} ${isTimerExpired ? styles.timerExpired : ''}`}>
                        <Clock size={14} /> {formatTimer(timer)}
                    </span>
                    {isTimerWarning && !isTimerExpired && <Badge variant="amber" size="sm">5 min left</Badge>}
                    {isTimerExpired && <Badge variant="rose" size="sm">Time&apos;s up!</Badge>}
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
                                    // Stop recording and speech immediately
                                    setIsActive(false);
                                    stopSpeaking();
                                    stopRecording();

                                    const currentMessages = messagesRef.current;

                                    // Step 1: Call AI evaluation endpoint
                                    const evalRes = await fetch('/api/interview/evaluate', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            transcript: currentMessages,
                                            type: selectedType,
                                        }),
                                    });

                                    let evalData;
                                    if (evalRes.ok) {
                                        evalData = await evalRes.json();
                                    } else {
                                        console.warn('AI evaluation failed, using fallback scores');
                                        const fallback = 70;
                                        evalData = {
                                            score: fallback,
                                            feedback: { communication: fallback, technical: fallback, problemSolving: fallback, confidence: fallback },
                                            coachTips: [{ type: 'tip', text: 'AI evaluation was unavailable. Try again for detailed feedback.', color: 'amber' }],
                                            summary: 'Evaluation could not be completed.',
                                        };
                                    }

                                    // Step 2: Save the interview with real AI feedback
                                    const res = await fetch('/api/interviews', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            type: selectedType,
                                            topic: `${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Interview`,
                                            score: evalData.score,
                                            duration: `${Math.max(1, Math.ceil(timer / 60))} min`,
                                            questions: Math.max(1, currentMessages.filter((m: any) => m.role === 'assistant').length),
                                            transcript: currentMessages,
                                            feedback: evalData.feedback,
                                            coachTips: evalData.coachTips,
                                        }),
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

                {/* AI Coach Panel — LIVE */}
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
                                    <Badge variant="purple" dot>Live</Badge>
                                </div>

                                {/* Clarity Score */}
                                <div className={styles.confidenceSection}>
                                    <span className={styles.confidenceLabel}>Clarity Score</span>
                                    <div className={styles.confidenceBar}>
                                        <motion.div
                                            className={styles.confidenceFill}
                                            animate={{ width: `${coachClarity}%` }}
                                            transition={{ duration: 0.5 }}
                                        />
                                    </div>
                                    <span className={styles.confidenceValue}>{coachClarity || 0}%</span>
                                </div>

                                {/* Real-time Tips */}
                                <div className={styles.tipsSection}>
                                    <h4 className={styles.tipsLabel}>Live Feedback</h4>
                                    <div className={styles.tipsList}>
                                        {coachTips.length > 0 ? coachTips.map((tip, i) => (
                                            <div key={i} className={styles.tipItem}>
                                                {tip.icon === 'success' ? (
                                                    <CheckCircle2 size={14} color="var(--accent-emerald)" />
                                                ) : (
                                                    <AlertCircle size={14} color="var(--accent-amber)" />
                                                )}
                                                <span>{tip.text}</span>
                                            </div>
                                        )) : (
                                            <div className={styles.tipItem}>
                                                <Lightbulb size={14} color="var(--accent-blue)" />
                                                <span>Start speaking to see live feedback</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Live Metrics */}
                                <div className={styles.metricsSection}>
                                    <h4 className={styles.tipsLabel}>Session Metrics</h4>
                                    <div className={styles.metricGrid}>
                                        <div className={styles.metric}>
                                            <span className={styles.metricValue}>{coachWpm || '—'}</span>
                                            <span className={styles.metricLabel}>WPM</span>
                                        </div>
                                        <div className={styles.metric}>
                                            <span className={styles.metricValue}>{coachFillers}</span>
                                            <span className={styles.metricLabel}>Fillers</span>
                                        </div>
                                        <div className={styles.metric}>
                                            <span className={styles.metricValue}>{coachClarity || '—'}%</span>
                                            <span className={styles.metricLabel}>Clarity</span>
                                        </div>
                                        <div className={styles.metric}>
                                            <span className={styles.metricValue}>
                                                {coachClarity >= 90 ? 'A+' : coachClarity >= 80 ? 'A' : coachClarity >= 70 ? 'B+' : coachClarity >= 60 ? 'B' : coachClarity > 0 ? 'C' : '—'}
                                            </span>
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
