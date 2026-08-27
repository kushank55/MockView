'use client';

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from 'react';

const noopSubscribe = () => () => { };

type SpeechWindow = Window & {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
};

const getSpeechSupport = () => {
    if (typeof window === 'undefined') return false;
    const w = window as SpeechWindow;
    return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
};

const getServerSpeechSupport = (): boolean | null => null;

/** How long the candidate can pause before we treat the answer as finished. */
const DEFAULT_SILENCE_MS = 2000;

/** After TTS, wait so speaker echo is not transcribed as the candidate. */
const POST_SPEECH_COOLDOWN_MS = 450;

interface UseSpeechOptions {
    onSpeechResult: (text: string) => void;
    onInterimResult?: (text: string) => void;
    onSilence: () => void;
    silenceMs?: number;
}

/**
 * Pulls finished spoken chunks off a streaming buffer so TTS can start before
 * the model finishes the rest of the reply.
 */
export function takeCompleteUtterances(buffer: string): { ready: string[]; rest: string } {
    const text = buffer.replace(/\s+/g, ' ');
    const ready: string[] = [];
    let start = 0;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch !== '.' && ch !== '!' && ch !== '?') continue;

        if (ch === '.') {
            let wordStart = i - 1;
            while (wordStart >= 0 && /[A-Za-z]/.test(text[wordStart])) wordStart -= 1;
            const word = text.slice(wordStart + 1, i);
            if (
                word.length === 1 ||
                /^(mr|mrs|ms|dr|prof|sr|jr|vs|etc|st)$/i.test(word)
            ) {
                continue;
            }
        }

        const next = text[i + 1];
        const isEnd = next === undefined || /\s/.test(next) || /["')\]]/.test(next);
        if (!isEnd) continue;

        let end = i + 1;
        while (end < text.length && /["')\]\s]/.test(text[end])) {
            if (/\s/.test(text[end])) {
                end += 1;
                break;
            }
            end += 1;
        }

        const chunk = text.slice(start, end).trim();
        if (chunk) ready.push(chunk);
        start = end;
        i = end - 1;
    }

    let rest = text.slice(start).trimStart();

    // Long clause without a period — start speaking anyway so the UI isn't silent.
    if (rest.length > 140) {
        const window = rest.slice(0, 140);
        const breakAt = Math.max(window.lastIndexOf(', '), window.lastIndexOf(' '));
        if (breakAt > 40) {
            ready.push(rest.slice(0, breakAt).trim());
            rest = rest.slice(breakAt).trimStart();
        }
    }

    return { ready, rest };
}

function pickEnglishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    const ranked = [
        /Google US English/i,
        /Samantha/i,
        /Karen/i,
        /Moira/i,
        /Aria/i,
        /Jenny/i,
        /Natural/i,
        /Premium/i,
    ];
    for (const re of ranked) {
        const found = voices.find((v) => re.test(v.name) && v.lang.toLowerCase().startsWith('en'));
        if (found) return found;
    }
    return (
        voices.find((v) => v.lang === 'en-US') ||
        voices.find((v) => v.lang.toLowerCase().startsWith('en')) ||
        null
    );
}

export function useSpeech({
    onSpeechResult,
    onInterimResult,
    onSilence,
    silenceMs = DEFAULT_SILENCE_MS,
}: UseSpeechOptions) {
    const [isRecording, setIsRecording] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const isSupported = useSyncExternalStore(
        noopSubscribe,
        getSpeechSupport,
        getServerSpeechSupport
    );
    const [micDenied, setMicDenied] = useState(false);

    const recognitionRef = useRef<any>(null);
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const queueRef = useRef<string[]>([]);
    const playingRef = useRef(false);
    const haltedRef = useRef(false);
    const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

    const isRecordingRef = useRef(false);
    const isSpeakingRef = useRef(false);
    const onSpeechResultRef = useRef(onSpeechResult);
    const onInterimResultRef = useRef(onInterimResult);
    const onSilenceRef = useRef(onSilence);
    const silenceMsRef = useRef(silenceMs);

    useEffect(() => {
        isRecordingRef.current = isRecording;
    }, [isRecording]);

    useEffect(() => {
        isSpeakingRef.current = isSpeaking;
    }, [isSpeaking]);

    useEffect(() => {
        onSpeechResultRef.current = onSpeechResult;
        onInterimResultRef.current = onInterimResult;
        onSilenceRef.current = onSilence;
        silenceMsRef.current = silenceMs;
    }, [onSpeechResult, onInterimResult, onSilence, silenceMs]);

    const clearSilenceTimer = () => {
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }
    };

    const armSilenceTimer = () => {
        clearSilenceTimer();
        silenceTimerRef.current = setTimeout(() => {
            if (isSpeakingRef.current || !isRecordingRef.current) return;
            onSilenceRef.current();
        }, silenceMsRef.current);
    };

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const SpeechRecognition =
            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
            // Drop anything captured while the interviewer is talking (speaker echo).
            if (isSpeakingRef.current) return;

            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const piece = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += piece;
                } else {
                    interimTranscript += piece;
                }
            }

            if (interimTranscript) {
                onInterimResultRef.current?.(interimTranscript);
            }

            if (finalTranscript) {
                onInterimResultRef.current?.('');
                onSpeechResultRef.current(finalTranscript);
            }

            if (finalTranscript || interimTranscript) {
                armSilenceTimer();
            }
        };

        recognition.onerror = (event: any) => {
            if (event.error === 'aborted' || event.error === 'no-speech') return;
            console.error('Speech recognition error', event.error);
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                setMicDenied(true);
                isRecordingRef.current = false;
                setIsRecording(false);
            }
        };

        recognition.onend = () => {
            if (isRecordingRef.current && !isSpeakingRef.current) {
                try {
                    recognition.start();
                } catch {
                    // Already started
                }
            }
        };

        recognitionRef.current = recognition;

        return () => {
            isRecordingRef.current = false;
            try {
                recognition.stop();
            } catch {
                // ignore
            }
            clearSilenceTimer();
        };
        // armSilenceTimer is stable enough via refs
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const startRecording = useCallback(() => {
        if (!recognitionRef.current || isSpeakingRef.current) return;
        if (isRecordingRef.current) return;
        try {
            isRecordingRef.current = true;
            setIsRecording(true);
            recognitionRef.current.start();
        } catch {
            // Already started
        }
    }, []);

    const stopRecording = useCallback(() => {
        clearSilenceTimer();
        isRecordingRef.current = false;
        setIsRecording(false);
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch {
                // ignore
            }
        }
    }, []);

    const stopKeepAlive = () => {
        if (keepAliveRef.current) {
            clearInterval(keepAliveRef.current);
            keepAliveRef.current = null;
        }
    };

    const startKeepAlive = () => {
        stopKeepAlive();
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
        // Chrome silently pauses utterances around the 15s mark unless we poke it.
        keepAliveRef.current = setInterval(() => {
            if (haltedRef.current) return;
            if (!window.speechSynthesis.speaking) return;
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
        }, 8000);
    };

    const playNext = useCallback(() => {
        if (haltedRef.current) {
            playingRef.current = false;
            queueRef.current = [];
            return;
        }
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
            playingRef.current = false;
            queueRef.current = [];
            setIsSpeaking(false);
            return;
        }

        const next = queueRef.current.shift();
        if (!next) {
            playingRef.current = false;
            stopKeepAlive();
            if (cooldownRef.current) clearTimeout(cooldownRef.current);
            cooldownRef.current = setTimeout(() => {
                if (haltedRef.current) return;
                isSpeakingRef.current = false;
                setIsSpeaking(false);
            }, POST_SPEECH_COOLDOWN_MS);
            return;
        }

        const utterance = new SpeechSynthesisUtterance(next);
        utterance.lang = 'en-US';
        utterance.rate = 1.04;
        utterance.pitch = 1.0;
        if (voiceRef.current) utterance.voice = voiceRef.current;

        utterance.onend = () => {
            if (haltedRef.current) return;
            playNext();
        };
        utterance.onerror = () => {
            if (haltedRef.current) return;
            playNext();
        };

        try {
            window.speechSynthesis.speak(utterance);
        } catch (error) {
            console.error('Speech synthesis error', error);
            if (!haltedRef.current) playNext();
        }
    }, []);

    const speakText = useCallback(
        (text: string) => {
            if (haltedRef.current) return;
            if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
            const chunks = [text.replace(/\s+/g, ' ').trim()].filter(Boolean);
            if (chunks.length === 0) return;

            if (cooldownRef.current) {
                clearTimeout(cooldownRef.current);
                cooldownRef.current = null;
            }

            queueRef.current.push(...chunks);
            isSpeakingRef.current = true;
            setIsSpeaking(true);

            if (playingRef.current) return;

            playingRef.current = true;
            startKeepAlive();

            if (playTimerRef.current) clearTimeout(playTimerRef.current);
            playTimerRef.current = setTimeout(() => {
                if (haltedRef.current) return;
                const voices = window.speechSynthesis.getVoices();
                if (voices.length) voiceRef.current = pickEnglishVoice(voices);
                playNext();
            }, 60);
        },
        [playNext]
    );

    const hardCancelSynth = () => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
        const synth = window.speechSynthesis;
        synth.pause();
        synth.cancel();
        synth.cancel();
    };

    const primeSpeech = useCallback(() => {
        haltedRef.current = false;
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
        window.speechSynthesis.resume();
        const unlock = new SpeechSynthesisUtterance('.');
        unlock.volume = 0;
        unlock.rate = 2;
        window.speechSynthesis.speak(unlock);
    }, []);

    const stopSpeaking = useCallback((endSession = false) => {
        haltedRef.current = endSession;
        queueRef.current = [];
        playingRef.current = false;
        if (playTimerRef.current) {
            clearTimeout(playTimerRef.current);
            playTimerRef.current = null;
        }
        if (cooldownRef.current) {
            clearTimeout(cooldownRef.current);
            cooldownRef.current = null;
        }
        stopKeepAlive();
        hardCancelSynth();
        window.setTimeout(hardCancelSynth, 0);
        window.setTimeout(hardCancelSynth, 40);
        isSpeakingRef.current = false;
        setIsSpeaking(false);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length) voiceRef.current = pickEnglishVoice(voices);
        };

        loadVoices();
        window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
        return () => {
            window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
            stopKeepAlive();
            if (playTimerRef.current) clearTimeout(playTimerRef.current);
            if (cooldownRef.current) clearTimeout(cooldownRef.current);
            window.speechSynthesis.cancel();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        isRecording,
        isSpeaking,
        isSupported,
        micDenied,
        startRecording,
        stopRecording,
        speakText,
        stopSpeaking,
        primeSpeech,
    };
}
