'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSpeechOptions {
    onSpeechResult: (text: string) => void;
    onSilence: () => void; // Triggered when user stops speaking
}

export function useSpeech({ onSpeechResult, onSilence }: UseSpeechOptions) {
    const [isRecording, setIsRecording] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const recognitionRef = useRef<any>(null);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Keep active state and callbacks in refs to avoid re-triggering the effect
    const isRecordingRef = useRef(isRecording);
    const onSpeechResultRef = useRef(onSpeechResult);
    const onSilenceRef = useRef(onSilence);

    useEffect(() => {
        isRecordingRef.current = isRecording;
        onSpeechResultRef.current = onSpeechResult;
        onSilenceRef.current = onSilence;
    }, [isRecording, onSpeechResult, onSilence]);

    // Initialize Web Speech API for Recognition (Speech-to-Text)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = 'en-US';

                recognition.onresult = (event: any) => {
                    let finalTranscript = '';
                    let interimTranscript = '';

                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript;
                        } else {
                            interimTranscript += event.results[i][0].transcript;
                        }
                    }

                    if (finalTranscript) {
                        onSpeechResultRef.current(finalTranscript);
                    }

                    // Reset silence timer every time we get speech data
                    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                    silenceTimerRef.current = setTimeout(() => {
                        onSilenceRef.current();
                    }, 2500); // 2.5 seconds of silence means user is done talking
                };

                recognition.onerror = (event: any) => {
                    console.error('Speech recognition error', event.error);
                    if (event.error === 'not-allowed') {
                        setIsRecording(false);
                    }
                };

                recognition.onend = () => {
                    // Auto-restart if we are supposed to be recording
                    if (isRecordingRef.current) {
                        try {
                            recognition.start();
                        } catch (e) {
                            // Already started
                        }
                    }
                };

                recognitionRef.current = recognition;
            } else {
                console.warn('Speech Recognition API not supported in this browser.');
            }
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        };
    }, []);

    const startRecording = useCallback(() => {
        if (recognitionRef.current && !isRecording) {
            try {
                recognitionRef.current.start();
                setIsRecording(true);
            } catch (e) {
                console.error('Failed to start recording', e);
            }
        }
    }, [isRecording]);

    const stopRecording = useCallback(() => {
        if (recognitionRef.current && isRecording) {
            recognitionRef.current.stop();
            setIsRecording(false);
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        }
    }, [isRecording]);

    // Speech Synthesis (Text-to-Speech)
    const speakText = useCallback((text: string) => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            // Cancel any ongoing speech
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 1.0;
            utterance.pitch = 1.0;

            // Try to use a better sounding voice if available
            const voices = window.speechSynthesis.getVoices();
            const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha') || v.name.includes('Siri'));
            if (preferredVoice) utterance.voice = preferredVoice;

            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = (e) => {
                console.error('Speech synthesis error', e);
                setIsSpeaking(false);
            };

            window.speechSynthesis.speak(utterance);
        } else {
            console.warn('Speech Synthesis API not supported in this browser.');
        }
    }, []);

    const stopSpeaking = useCallback(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }
    }, []);

    // Ensure voices are loaded
    useEffect(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.getVoices();
            // Chrome needs this event to load voices
            window.speechSynthesis.onvoiceschanged = () => {
                window.speechSynthesis.getVoices();
            };
        }
    }, []);

    return {
        isRecording,
        isSpeaking,
        startRecording,
        stopRecording,
        speakText,
        stopSpeaking,
    };
}
