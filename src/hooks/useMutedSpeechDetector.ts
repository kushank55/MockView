'use client';

import { useEffect, useRef } from 'react';

/**
 * Watches the microphone while the candidate has muted themselves, so the app
 * can tell them they are talking to a mic nobody is listening to.
 *
 * Speech recognition is stopped while muted, which leaves the device free for
 * this analyser. Nothing is recorded or transmitted — only the loudness of the
 * incoming signal is measured, and the stream is released the moment the user
 * unmutes.
 */

// Root-mean-square loudness above which a frame counts as speech rather than
// room tone. Normal talking sits well above this on a typical laptop mic.
const SPEECH_RMS_THRESHOLD = 0.03;

// How often the signal is sampled. Short enough to catch a sentence, long
// enough that the analyser costs nothing noticeable.
const SAMPLE_INTERVAL_MS = 100;

// Quiet frames pay back part of the accumulated total, so hours of muted room
// noise can never creep up to the threshold on its own — only sustained speech
// gets there.
const SILENCE_DECAY_FACTOR = 0.5;

interface UseMutedSpeechDetectorOptions {
    /** Only listen while this is true (muted, in an active, unpaused session). */
    enabled: boolean;
    /** Cumulative speech required before the user is alerted. */
    speakingMs: number;
    /** Called once each time the threshold is reached. */
    onSpeechWhileMuted: () => void;
}

export function useMutedSpeechDetector({
    enabled,
    speakingMs,
    onSpeechWhileMuted,
}: UseMutedSpeechDetectorOptions) {
    const onSpeechWhileMutedRef = useRef(onSpeechWhileMuted);

    useEffect(() => {
        onSpeechWhileMutedRef.current = onSpeechWhileMuted;
    }, [onSpeechWhileMuted]);

    useEffect(() => {
        if (!enabled) return;
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;

        let cancelled = false;
        let stream: MediaStream | null = null;
        let audioContext: AudioContext | null = null;
        let timer: ReturnType<typeof setInterval> | null = null;
        let accumulatedMs = 0;

        const start = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                    },
                    video: false,
                });

                // The user may have unmuted while the permission prompt was open.
                if (cancelled) return;

                const AudioContextCtor =
                    window.AudioContext ||
                    (window as unknown as { webkitAudioContext?: typeof AudioContext })
                        .webkitAudioContext;
                if (!AudioContextCtor) return;

                audioContext = new AudioContextCtor();
                if (audioContext.state === 'suspended') {
                    await audioContext.resume();
                }
                if (cancelled) return;

                const source = audioContext.createMediaStreamSource(stream);
                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 2048;
                source.connect(analyser);

                const samples = new Float32Array(analyser.fftSize);

                timer = setInterval(() => {
                    analyser.getFloatTimeDomainData(samples);

                    let sumOfSquares = 0;
                    for (let i = 0; i < samples.length; i++) {
                        sumOfSquares += samples[i] * samples[i];
                    }
                    const rms = Math.sqrt(sumOfSquares / samples.length);

                    if (rms > SPEECH_RMS_THRESHOLD) {
                        accumulatedMs += SAMPLE_INTERVAL_MS;
                    } else {
                        accumulatedMs = Math.max(
                            0,
                            accumulatedMs - SAMPLE_INTERVAL_MS * SILENCE_DECAY_FACTOR
                        );
                    }

                    if (accumulatedMs >= speakingMs) {
                        accumulatedMs = 0;
                        onSpeechWhileMutedRef.current();
                    }
                }, SAMPLE_INTERVAL_MS);
            } catch {
                // Permission denied or no input device: there is nothing to warn
                // about, and the interview continues normally without this hint.
            }
        };

        start();

        return () => {
            cancelled = true;
            if (timer) clearInterval(timer);
            stream?.getTracks().forEach((track) => track.stop());
            audioContext?.close().catch(() => { });
        };
    }, [enabled, speakingMs]);
}
