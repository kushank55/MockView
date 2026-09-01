'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { takeCompleteUtterances, useSpeech } from '@/hooks/useSpeech';
import { useCamera } from '@/hooks/useCamera';
import { useMutedSpeechDetector } from '@/hooks/useMutedSpeechDetector';
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
    Send,
    MessageCircleQuestion,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import styles from './interview.module.css';
import { apiErrorMessage } from '@/lib/api-errors';

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

// How much talking into a muted mic is allowed before the candidate is warned.
// Short enough to catch the start of an answer, long enough to ignore a cough.
const MUTED_SPEECH_ALERT_MS = 700;

// Hardcoded static references removed, driven by useChat state.

// useSearchParams requires a Suspense boundary during prerendering.
export default function InterviewPage() {
    return (
        <Suspense fallback={null}>
            <InterviewSession />
        </Suspense>
    );
}

function InterviewSession() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [isActive, setIsActive] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [isPaused, setIsPaused] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [showMutedAlert, setShowMutedAlert] = useState(false);
    const {
        isVideoOn,
        videoRef,
        error: cameraError,
        isRequesting: isCameraStarting,
        isSupported: isCameraSupported,
        stop: stopCamera,
        toggle: toggleCamera,
    } = useCamera();
    // Prefilled from the dashboard's "practice this weak skill" deep link.
    // Unknown values fall back to the defaults rather than breaking the form.
    const [selectedType, setSelectedType] = useState(() => {
        const type = searchParams.get('type');
        return interviewTypes.some((t) => t.id === type) ? (type as string) : 'behavioral';
    });
    const [selectedDifficulty, setSelectedDifficulty] = useState(() => {
        const difficulty = searchParams.get('difficulty');
        return difficultyLevels.some((d) => d.id === difficulty) ? (difficulty as string) : 'medium';
    });
    const [customTopic, setCustomTopic] = useState(() => searchParams.get('topic')?.slice(0, 200) ?? '');
    const [timer, setTimer] = useState(0);
    const [showCoach, setShowCoach] = useState(true);
    const [waveformData, setWaveformData] = useState<number[]>(Array.from({ length: 50 }, () => 0.1));
    const [currentAnswer, setCurrentAnswer] = useState('');
    const [interimAnswer, setInterimAnswer] = useState('');
    const [typedAnswer, setTypedAnswer] = useState('');

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
    const [aiError, setAiError] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);

    // Resume upload state
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [resumeText, setResumeText] = useState('');
    const [isParsingResume, setIsParsingResume] = useState(false);
    const [resumeError, setResumeError] = useState('');
    const resumeTextRef = useRef('');

    // A previously analyzed resume the user can reuse instead of re-uploading.
    const [savedResume, setSavedResume] = useState<{
        fileName: string;
        targetRole: string;
        atsScore: number;
        resumeText: string;
    } | null>(null);
    const [usingSavedResume, setUsingSavedResume] = useState(false);

    // ── Refs that mirror state so callbacks always read the latest values ──
    const currentAnswerRef = useRef(currentAnswer);
    const messagesRef = useRef(messages);
    const isLoadingRef = useRef(isLoading);
    const isSpeakingRef = useRef(false);
    const isActiveRef = useRef(false);
    const isPausedRef = useRef(false);
    const isMutedRef = useRef(false);
    const inFlightRef = useRef(false);
    const generateAbortRef = useRef<AbortController | null>(null);
    const suggestAbortRef = useRef<AbortController | null>(null);
    const transcriptRef = useRef<HTMLDivElement>(null);
    const appendRef = useRef<(msg: { role: 'user'; content: string }) => Promise<void>>(
        async () => {}
    );

    useEffect(() => { currentAnswerRef.current = currentAnswer; }, [currentAnswer]);
    useEffect(() => { messagesRef.current = messages; }, [messages]);
    useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);
    useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
    useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
    useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

    const {
        isRecording,
        isSpeaking,
        isSupported: isSpeechSupported,
        micDenied,
        startRecording,
        stopRecording,
        speakText,
        stopSpeaking,
        primeSpeech,
    } = useSpeech({
        onSpeechResult: (text) => {
            if (!isPausedRef.current && !isMutedRef.current && !isSpeakingRef.current && !isLoadingRef.current) {
                setInterimAnswer('');
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
        onInterimResult: (text) => {
            if (!isPausedRef.current && !isMutedRef.current && !isSpeakingRef.current && !isLoadingRef.current) {
                setInterimAnswer(text);
            }
        },
        onSilence: () => {
            // Guard: don't fire while AI is loading/speaking, or if answer is empty
            if (isLoadingRef.current || isSpeakingRef.current || inFlightRef.current) return;
            if (isPausedRef.current || isMutedRef.current) return;
            const answer = currentAnswerRef.current.trim();
            if (answer !== '') {
                setInterimAnswer('');
                setCurrentAnswer('');
                currentAnswerRef.current = '';
                void appendRef.current({ role: 'user', content: answer });
            }
        }
    });

    const releaseSpokenText = (spokenSoFar: string, pieces: string[]) => {
        let next = spokenSoFar;
        for (const piece of pieces) {
            next = next ? `${next} ${piece}` : piece;
            if (isActiveRef.current && !isPausedRef.current && !isMutedRef.current) {
                speakText(piece);
            }
        }
        const released = next;
        setMessages((prev) => {
            const newMsgs = [...prev];
            const last = newMsgs[newMsgs.length - 1];
            if (last?.role === 'assistant') {
                newMsgs[newMsgs.length - 1] = { ...last, content: released };
            }
            messagesRef.current = newMsgs;
            return newMsgs;
        });
        return released;
    };

    const loadSuggestions = async () => {
        suggestAbortRef.current?.abort();
        const controller = new AbortController();
        suggestAbortRef.current = controller;
        setSuggestionsLoading(true);

        try {
            const res = await fetch('/api/interview/suggest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: messagesRef.current,
                    topic: selectedType,
                    customTopic: customTopic || undefined,
                    difficulty: selectedDifficulty,
                }),
                signal: controller.signal,
            });
            if (!isActiveRef.current || controller.signal.aborted) return;
            const data = await res.json().catch(() => ({}));
            const list = Array.isArray(data.suggestions)
                ? data.suggestions
                    .filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 8)
                    .map((item: string) => item.trim())
                    .slice(0, 4)
                : [];
            if (isActiveRef.current && !controller.signal.aborted) {
                setSuggestions(list);
            }
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            if (isActiveRef.current && !controller.signal.aborted) {
                setSuggestions([]);
            }
        } finally {
            if (isActiveRef.current && !controller.signal.aborted) {
                setSuggestionsLoading(false);
            }
        }
    };

    const requestAiReply = async () => {
        if (inFlightRef.current) return;
        inFlightRef.current = true;
        stopRecording();
        setAiError('');
        setIsLoading(true);
        suggestAbortRef.current?.abort();
        setSuggestions([]);
        setSuggestionsLoading(true);

        try {
            generateAbortRef.current?.abort();
            const controller = new AbortController();
            generateAbortRef.current = controller;
            const timeout = setTimeout(() => controller.abort(), 25_000);

            const res = await fetch('/api/interview/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: messagesRef.current,
                    topic: selectedType,
                    resumeText: resumeTextRef.current || undefined,
                    difficulty: selectedDifficulty,
                    customTopic: customTopic || undefined,
                }),
                signal: controller.signal,
            });
            clearTimeout(timeout);

            if (!isActiveRef.current) return;

            const data = await res.json().catch(() => ({}));
            const text = typeof data.text === 'string' ? data.text.trim() : '';
            if (!res.ok || !text) {
                throw new Error(
                    apiErrorMessage(
                        data,
                        res.status === 429
                            ? 'The interviewer is rate-limited right now. Wait about a minute, then retry.'
                            : 'Could not reach the interviewer. Please retry.'
                    )
                );
            }

            if (!isActiveRef.current) return;

            setMessages((prev) => {
                const withoutEmpty = prev.filter((m, i) => !(i === prev.length - 1 && m.role === 'assistant' && !m.content.trim()));
                const next = [...withoutEmpty, { role: 'assistant', content: '' }];
                messagesRef.current = next;
                return next;
            });

            const { ready, rest } = takeCompleteUtterances(text);
            const leftover = rest.trim();
            const pieces = [...ready, ...(leftover ? [leftover] : [])];
            if (isActiveRef.current) {
                releaseSpokenText('', pieces.length ? pieces : [text]);
                void loadSuggestions();
            }
        } catch (error) {
            if (!isActiveRef.current) return;
            console.error('Failed to fetch AI response:', error);
            const aborted = error instanceof DOMException && error.name === 'AbortError';
            setAiError(
                aborted
                    ? 'The interviewer took too long to respond. Please retry.'
                    : error instanceof Error
                        ? error.message
                        : 'Could not reach the interviewer. Please retry.'
            );
            setMessages((prev) => {
                const next = prev.filter((m, i) => !(i === prev.length - 1 && m.role === 'assistant' && !m.content.trim()));
                messagesRef.current = next;
                return next;
            });
            setSuggestionsLoading(false);
        } finally {
            if (isActiveRef.current) {
                setIsLoading(false);
            }
            inFlightRef.current = false;
        }
    };

    const append = async (newUserMessage: { role: 'user'; content: string }) => {
        if (inFlightRef.current) return;
        const updatedMessages = [...messagesRef.current, newUserMessage];
        setMessages(updatedMessages);
        messagesRef.current = updatedMessages;
        await requestAiReply();
    };
    appendRef.current = append;

    const askSuggestion = (question: string) => {
        const text = question.trim();
        if (!text || !isActive || isPaused || isLoading || isSpeaking || inFlightRef.current) return;
        stopRecording();
        setInterimAnswer('');
        setTypedAnswer('');
        setCurrentAnswer('');
        currentAnswerRef.current = '';
        void append({ role: 'user', content: text });
    };

    // Keep isSpeakingRef in sync
    useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);

    // Watch for the candidate talking during THEIR turn while the mute button
    // is on. Auto-stop during AI speech is separate (echo prevention).
    const isUserTurn =
        isActive && !isPaused && !isSpeaking && !isLoading && !aiError;
    const isWatchingForMutedSpeech = isUserTurn && isMuted && isSpeechSupported !== false && !micDenied;

    const turnMicOn = useCallback(() => {
        setShowMutedAlert(false);
        isMutedRef.current = false;
        setIsMuted(false);
    }, []);

    const handleSpeechWhileMuted = useCallback(() => {
        setShowMutedAlert(true);
    }, []);

    useMutedSpeechDetector({
        enabled: isWatchingForMutedSpeech,
        speakingMs: MUTED_SPEECH_ALERT_MS,
        onSpeechWhileMuted: handleSpeechWhileMuted,
    });

    // The warning is only meaningful while muted, so unmuting clears it.
    useEffect(() => {
        if (!isMuted) setShowMutedAlert(false);
    }, [isMuted]);

    // Offer the most recently analyzed resume so the user doesn't have to
    // upload the same PDF they already ran through the resume analyzer.
    useEffect(() => {
        let cancelled = false;
        fetch('/api/resume/latest')
            .then((res) => (res.ok ? res.json() : { resume: null }))
            .then((data) => {
                if (!cancelled && data?.resume?.resumeText) {
                    setSavedResume(data.resume);
                }
            })
            .catch((err) => console.error('Failed to load saved resume:', err));
        return () => { cancelled = true; };
    }, []);

    const useSavedResume = () => {
        if (!savedResume) return;
        setResumeText(savedResume.resumeText);
        resumeTextRef.current = savedResume.resumeText;
        setUsingSavedResume(true);
        setResumeFile(null);
        setResumeError('');
    };

    const clearResume = () => {
        setResumeFile(null);
        setResumeText('');
        setResumeError('');
        setUsingSavedResume(false);
        setIsParsingResume(false);
        resumeTextRef.current = '';
    };

    const parseUploadedResume = async (file: File) => {
        setResumeFile(file);
        setUsingSavedResume(false);
        setResumeError('');
        setIsParsingResume(true);
        setResumeText('');
        resumeTextRef.current = '';

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25_000);

        try {
            const formData = new FormData();
            formData.append('resume', file);
            const res = await fetch('/api/interview/parse-resume', {
                method: 'POST',
                body: formData,
                signal: controller.signal,
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(apiErrorMessage(data, 'Failed to parse resume'));
            }
            if (!data.text || String(data.text).trim().length < 30) {
                throw new Error('Could not extract enough text from the PDF.');
            }
            setResumeText(data.text);
            resumeTextRef.current = data.text;
        } catch (err: unknown) {
            const aborted = err instanceof DOMException && err.name === 'AbortError';
            setResumeError(
                aborted
                    ? 'Parsing timed out. Please try a text-based PDF.'
                    : err instanceof Error
                        ? err.message
                        : 'Failed to parse resume'
            );
            setResumeFile(null);
            setResumeText('');
            resumeTextRef.current = '';
        } finally {
            clearTimeout(timeout);
            setIsParsingResume(false);
        }
    };

    // Submits a typed answer — the fallback path for browsers without speech
    // recognition, and an escape hatch when dictation mishears something.
    const submitTypedAnswer = () => {
        const answer = typedAnswer.trim();
        if (!answer || isLoading || isSpeaking || inFlightRef.current) return;
        setInterimAnswer('');
        append({ role: 'user', content: answer });
        setTypedAnswer('');
        setCurrentAnswer('');
        currentAnswerRef.current = '';
    };

    // Only listen while it is the candidate's turn. Mic off during thinking
    // and while the interviewer is talking — otherwise the speakers get
    // transcribed as the user's answer.
    useEffect(() => {
        if (isActive && !isPaused && !isMuted && !isSpeaking && !isLoading && !aiError) {
            startRecording();
        } else {
            stopRecording();
        }
    }, [isActive, isPaused, isMuted, isSpeaking, isLoading, aiError, startRecording, stopRecording]);

    // Derived states
    const aiMessages = messages.filter((m: any) => m.role === 'assistant' && String(m.content).trim());
    const questionNumber = Math.max(1, aiMessages.length);
    const latestQuestion = aiMessages.length > 0 ? aiMessages[aiMessages.length - 1].content : '';
    const questionDisplay = latestQuestion.trim()
        ? latestQuestion
        : isLoading
            ? 'The interviewer is thinking...'
            : aiError
                ? aiError
                : 'Waiting for the interviewer...';
    const turnLabel = isSpeaking
        ? 'AI speaking'
        : isLoading
            ? 'Thinking'
            : aiError
                ? 'Retry needed'
            : isMuted
                ? 'Mic off'
                : isRecording
                    ? 'Your turn — we\'re listening'
                    : isPaused
                        ? 'Paused'
                        : 'Waiting';
    const transcriptMessages = messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'ai' : 'user',
        text: m.content
    }));

    // Auto-scroll transcript to the bottom on new messages
    useEffect(() => {
        if (transcriptRef.current) {
            transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
        }
    }, [messages, currentAnswer, interimAnswer]);

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

                            {/* Reuse the resume already analyzed on the Resume page */}
                            {savedResume && !resumeFile && !usingSavedResume && (
                                <button className={styles.savedResumeCard} onClick={useSavedResume}>
                                    <FileText size={18} className={styles.fileIcon} />
                                    <div className={styles.savedResumeInfo}>
                                        <span className={styles.fileName}>{savedResume.fileName}</span>
                                        <span className={styles.savedResumeMeta}>
                                            Already analyzed · ATS {savedResume.atsScore}
                                            {savedResume.targetRole ? ` · ${savedResume.targetRole}` : ''}
                                        </span>
                                    </div>
                                    <span className={styles.savedResumeAction}>Use this</span>
                                </button>
                            )}

                            {usingSavedResume && savedResume ? (
                                <div className={styles.uploadedFile}>
                                    <FileText size={18} className={styles.fileIcon} />
                                    <span className={styles.fileName}>{savedResume.fileName}</span>
                                    <Badge variant="emerald" dot>Ready</Badge>
                                    <button className={styles.removeFileBtn} onClick={clearResume}>
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : !resumeFile ? (
                                <label className={styles.uploadZone}>
                                    <input
                                        type="file"
                                        accept=".pdf,application/pdf"
                                        className={styles.fileInput}
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            e.target.value = '';
                                            if (!file) return;
                                            await parseUploadedResume(file);
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
                                    <button className={styles.removeFileBtn} onClick={clearResume}>
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

                        {/* Voice input is Web Speech only — warn before the user
                            starts an interview they can't actually speak in. */}
                        {isSpeechSupported === false && (
                            <div className={styles.browserWarning}>
                                <AlertCircle size={16} />
                                <div>
                                    <strong>Voice input isn&apos;t available in this browser.</strong>
                                    <p>
                                        Speech recognition is only supported in Chrome, Edge, and other
                                        Chromium browsers. You can still run the interview and type your
                                        answers below the transcript.
                                    </p>
                                </div>
                            </div>
                        )}

                        {micDenied && (
                            <div className={styles.browserWarning}>
                                <AlertCircle size={16} />
                                <div>
                                    <strong>Microphone access is blocked.</strong>
                                    <p>
                                        Allow microphone access in your browser&apos;s site settings, then
                                        reload this page to use voice answers.
                                    </p>
                                </div>
                            </div>
                        )}

                        <Button
                            size="lg"
                            fullWidth
                            icon={<Mic size={18} />}
                            disabled={isParsingResume}
                            onClick={() => {
                                primeSpeech();
                                isActiveRef.current = true;
                                setIsActive(true);
                                let msg = `Hi, I'm ready to begin the ${selectedType} interview.`;
                                if (customTopic) msg += ` The topic I want to focus on is: ${customTopic}.`;
                                if (resumeText) msg += ` I've uploaded my resume for your reference.`;
                                void append({ role: 'user', content: msg });
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
                                <span className={styles.turnStatus}>{turnLabel}</span>
                            </div>
                            <p className={styles.questionText}>
                                {questionDisplay}
                            </p>
                            {aiError && !isLoading && (
                                <button
                                    className={styles.retryAiBtn}
                                    onClick={() => { void requestAiReply(); }}
                                >
                                    Retry question
                                </button>
                            )}
                            {isRecording && !isSpeaking && !isLoading && !aiError && (
                                <p className={styles.turnHint}>Speak naturally. Pause when you&apos;re done and the interviewer will continue.</p>
                            )}
                        </Card>
                    </motion.div>

                    {/* Self-view camera — opt-in, practise reading your own body language */}
                    <Card className={styles.selfViewCard}>
                        <div className={styles.selfViewHeader}>
                            <Video size={16} color="var(--accent-cyan)" />
                            <span>Self View</span>
                            {isVideoOn && <Badge variant="emerald" size="sm" dot>On</Badge>}
                        </div>

                        <div className={styles.selfViewFrame}>
                            {isVideoOn ? (
                                <video
                                    ref={videoRef}
                                    className={styles.selfViewVideo}
                                    autoPlay
                                    playsInline
                                    muted
                                />
                            ) : (
                                <div className={styles.selfViewPlaceholder}>
                                    <VideoOff size={28} />
                                    <span>
                                        {isCameraStarting
                                            ? 'Starting camera...'
                                            : !isCameraSupported
                                                ? 'Camera not supported in this browser'
                                                : 'Camera is off'}
                                    </span>
                                    {isCameraSupported && !isCameraStarting && (
                                        <button className={styles.selfViewEnableBtn} onClick={toggleCamera}>
                                            Turn on camera
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {cameraError && (
                            <div className={styles.selfViewError}>
                                <AlertCircle size={13} />
                                <span>{cameraError}</span>
                            </div>
                        )}
                    </Card>

                    {/* Voice Waveform */}
                    <Card className={styles.waveformCard}>
                        <div className={styles.waveformHeader}>
                            <Volume2 size={16} color="var(--accent-blue)" />
                            <span>{isSpeaking ? 'AI Speaking' : isLoading ? 'Thinking' : isMuted ? 'Microphone off' : 'Your Voice'}</span>
                            {!isPaused && (
                                <span className={styles.recording}>
                                    <span className={styles.recordDot} style={{ background: isSpeaking ? 'var(--accent-purple)' : isLoading ? 'var(--accent-amber)' : isMuted ? 'var(--accent-rose)' : undefined }} />
                                    {isSpeaking ? 'Speaking' : isLoading ? 'Thinking' : isMuted ? 'Muted' : (isRecording ? 'Listening' : 'Waiting')}
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
                                    <p className={styles.msgText}>{currentAnswer}{interimAnswer ? ` ${interimAnswer}` : ''}</p>
                                </div>
                            )}
                            {!currentAnswer && interimAnswer && (
                                <div className={`${styles.transcriptMsg} ${styles.user}`} style={{ opacity: 0.7 }}>
                                    <span className={styles.msgRole}>You</span>
                                    <p className={styles.msgText}>{interimAnswer}</p>
                                </div>
                            )}

                            {isLoading && (
                                <div className={styles.typingIndicator}>
                                    <span /><span /><span />
                                </div>
                            )}
                        </div>

                        {/* Typed answers: the only input path when speech
                            recognition is unavailable, optional otherwise. */}
                        <div className={styles.answerComposer}>
                            <input
                                className={styles.answerInput}
                                placeholder={
                                    isSpeechSupported === false
                                        ? 'Type your answer and press Enter'
                                        : 'Or type your answer...'
                                }
                                value={typedAnswer}
                                onChange={(e) => setTypedAnswer(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        submitTypedAnswer();
                                    }
                                }}
                                disabled={isLoading || isSpeaking}
                                aria-label="Type your answer"
                            />
                            <button
                                className={styles.answerSendBtn}
                                onClick={submitTypedAnswer}
                                disabled={isLoading || isSpeaking || !typedAnswer.trim()}
                                aria-label="Send answer"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </Card>

                    {saveError && (
                        <div className={styles.browserWarning}>
                            <AlertCircle size={16} />
                            <div>
                                <strong>Interview not saved</strong>
                                <p>{saveError}</p>
                            </div>
                        </div>
                    )}

                    {/* Talking on your turn while the mute button is on */}
                    <AnimatePresence>
                        {showMutedAlert && isMuted && (
                            <motion.div
                                className={styles.mutedOverlay}
                                role="alertdialog"
                                aria-modal="true"
                                aria-labelledby="muted-alert-title"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <motion.div
                                    className={styles.mutedDialog}
                                    initial={{ opacity: 0, scale: 0.96, y: 8 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.96, y: 8 }}
                                >
                                    <div className={styles.mutedDialogIcon}>
                                        <MicOff size={28} />
                                    </div>
                                    <h3 id="muted-alert-title" className={styles.mutedDialogTitle}>
                                        Your microphone is off
                                    </h3>
                                    <p className={styles.mutedDialogBody}>
                                        It&apos;s your turn and we can tell you&apos;re speaking, but the interviewer can&apos;t hear you. Turn the mic on to start your answer.
                                    </p>
                                    <button
                                        className={styles.mutedDialogAction}
                                        onClick={turnMicOn}
                                    >
                                        Turn on mic and start answering
                                    </button>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Controls */}
                    <div className={styles.controls}>
                        <button
                            className={`${styles.controlBtn} ${isMuted ? styles.muted : ''}`}
                            onClick={() => {
                                if (isMuted) turnMicOn();
                                else setIsMuted(true);
                            }}
                            title={isMuted ? 'Turn on microphone' : 'Mute microphone'}
                            aria-label={isMuted ? 'Turn on microphone' : 'Mute microphone'}
                        >
                            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                        </button>
                        <button
                            className={`${styles.controlBtn} ${!isVideoOn ? styles.muted : ''}`}
                            onClick={toggleCamera}
                            disabled={!isCameraSupported || isCameraStarting}
                            title={
                                !isCameraSupported
                                    ? 'Camera is not supported in this browser'
                                    : isVideoOn
                                        ? 'Turn camera off'
                                        : 'Turn camera on'
                            }
                            aria-label={isVideoOn ? 'Turn camera off' : 'Turn camera on'}
                        >
                            {isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}
                        </button>
                        <button
                            className={`${styles.controlBtn} ${styles.pauseBtn}`}
                            onClick={() => {
                                if (!isPaused) stopSpeaking();
                                setIsPaused(!isPaused);
                            }}
                        >
                            {isPaused ? <Play size={20} /> : <Pause size={20} />}
                        </button>
                        <button
                            className={`${styles.controlBtn} ${styles.endBtn}`}
                            onClick={async () => {
                                isActiveRef.current = false;
                                generateAbortRef.current?.abort();
                                suggestAbortRef.current?.abort();
                                setSuggestions([]);
                                setSuggestionsLoading(false);
                                stopSpeaking(true);
                                stopRecording();
                                stopCamera();
                                setIsActive(false);
                                setIsLoading(true);
                                setSaveError('');
                                try {
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
                                        // Keep the session on screen so the transcript
                                        // isn't lost, and let the user retry hanging up.
                                        console.error('Failed to save interview:', await res.text());
                                        setSaveError('We couldn\'t save this interview. Check your connection and try ending it again.');
                                        isActiveRef.current = true;
                                        stopSpeaking(false);
                                        setIsActive(true);
                                        setIsLoading(false);
                                        return;
                                    }

                                    // Redirect to the detailed results page with STAR builder
                                    const savedInterview = await res.json();
                                    router.push(`/history/${savedInterview.id}`);
                                } catch (err) {
                                    console.error('Failed to save interview', err);
                                    setSaveError('We couldn\'t save this interview. Check your connection and try ending it again.');
                                    isActiveRef.current = true;
                                    stopSpeaking(false);
                                    setIsActive(true);
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

                                {/* Follow-up questions the candidate can ask */}
                                <div className={styles.suggestSection}>
                                    <h4 className={styles.tipsLabel}>
                                        <MessageCircleQuestion size={12} />
                                        Ask the interviewer
                                    </h4>
                                    <p className={styles.suggestHint}>
                                        {isLoading || isSpeaking
                                            ? 'Suggestions update after this question.'
                                            : 'Tap a question to ask it out loud in the interview.'}
                                    </p>
                                    <div className={styles.suggestList}>
                                        {suggestionsLoading && suggestions.length === 0 ? (
                                            <>
                                                <div className={styles.suggestSkeleton} />
                                                <div className={styles.suggestSkeleton} />
                                                <div className={styles.suggestSkeleton} />
                                            </>
                                        ) : suggestions.length > 0 ? (
                                            suggestions.map((question) => (
                                                <button
                                                    key={question}
                                                    type="button"
                                                    className={styles.suggestChip}
                                                    disabled={isLoading || isSpeaking || isPaused || !!aiError}
                                                    onClick={() => askSuggestion(question)}
                                                    title={question}
                                                >
                                                    {question}
                                                </button>
                                            ))
                                        ) : (
                                            <div className={styles.suggestEmpty}>
                                                <span>
                                                    {suggestionsLoading
                                                        ? 'Writing suggestions…'
                                                        : 'Live questions will appear after the interviewer speaks.'}
                                                </span>
                                                {!suggestionsLoading && aiMessages.length > 0 && (
                                                    <button
                                                        type="button"
                                                        className={styles.suggestRetry}
                                                        onClick={() => { void loadSuggestions(); }}
                                                    >
                                                        Refresh
                                                    </button>
                                                )}
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
