'use client';

import React, { useState } from 'react';
import { signIn, signOut } from 'next-auth/react';
import styles from './GoogleSignInButton.module.css';

function GoogleMark() {
    return (
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
                fill="#4285F4"
                d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
            />
            <path
                fill="#34A853"
                d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
            />
            <path
                fill="#FBBC05"
                d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
            />
            <path
                fill="#EA4335"
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"
            />
        </svg>
    );
}

interface GoogleSignInButtonProps {
    label?: string;
    onError?: (message: string) => void;
}

export default function GoogleSignInButton({
    label = 'Continue with Google',
    onError,
}: GoogleSignInButtonProps) {
    const [loading, setLoading] = useState(false);

    const handleClick = async () => {
        setLoading(true);
        try {
            const providers = await fetch('/api/auth/providers')
                .then((res) => res.json())
                .catch(() => null);
            if (!providers?.google) {
                onError?.(
                    'Google sign-in is not configured on this deployment. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel, then redeploy.'
                );
                setLoading(false);
                return;
            }

            // Drop a demo (or any) session first. NextAuth links Google onto
            // the current user, which is why Gmail was landing as Demo User.
            await signOut({ redirect: false });

            const res = await signIn('google', {
                callbackUrl: '/dashboard',
                redirect: true,
            });
            if (res?.error) {
                onError?.(
                    res.error === 'OAuthAccountNotLinked'
                        ? 'This email already has an account. Sign in with email and password.'
                        : 'Google sign-in was cancelled or failed. Please try again.'
                );
                setLoading(false);
            }
        } catch {
            onError?.('Google sign-in failed. Please try again.');
            setLoading(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={loading}
            className={styles.btn}
        >
            {loading ? <span className={styles.spinner} /> : <GoogleMark />}
            {loading ? 'Redirecting to Google...' : label}
        </button>
    );
}
