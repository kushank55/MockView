'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Manages the candidate's self-view camera stream.
 *
 * The camera is opt-in — nothing is requested until enable() is called, so a
 * user who only wants a voice interview is never prompted for camera access.
 */
export function useCamera() {
    const [isVideoOn, setIsVideoOn] = useState(false);
    const [error, setError] = useState('');
    const [isRequesting, setIsRequesting] = useState(false);

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const isSupported =
        typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

    const stop = useCallback(() => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        setIsVideoOn(false);
    }, []);

    const enable = useCallback(async () => {
        if (!isSupported) {
            setError('Your browser does not support camera access.');
            return;
        }

        setIsRequesting(true);
        setError('');

        try {
            // Audio stays off — the mic is owned by speech recognition, and
            // grabbing it here would compete with it for the device.
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
                audio: false,
            });

            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setIsVideoOn(true);
        } catch (err) {
            const name = err instanceof Error ? err.name : '';
            if (name === 'NotAllowedError') {
                setError('Camera permission denied. You can still continue with voice only.');
            } else if (name === 'NotFoundError') {
                setError('No camera found on this device.');
            } else {
                setError('Could not start the camera.');
            }
            setIsVideoOn(false);
        } finally {
            setIsRequesting(false);
        }
    }, [isSupported]);

    const toggle = useCallback(() => {
        if (isVideoOn) {
            stop();
        } else {
            enable();
        }
    }, [isVideoOn, enable, stop]);

    // Reattach the stream whenever the <video> element mounts, since the
    // element is conditionally rendered and gets a fresh node each time.
    useEffect(() => {
        if (isVideoOn && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [isVideoOn]);

    // Always release the camera when the page unmounts so the hardware
    // indicator light doesn't stay on after the interview ends.
    useEffect(() => {
        return () => {
            streamRef.current?.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        };
    }, []);

    return { isVideoOn, videoRef, error, isRequesting, isSupported, enable, stop, toggle };
}
