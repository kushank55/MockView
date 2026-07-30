'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { PlayCircle } from 'lucide-react';
import styles from './DemoLoginButton.module.css';

interface DemoLoginButtonProps {
    /** Visual weight — 'solid' for the login page, 'outline' over the hero. */
    variant?: 'solid' | 'outline';
    label?: string;
    className?: string;
}

/**
 * Signs the visitor into the shared demo account in one click.
 *
 * Uses the dedicated "demo" NextAuth provider, which takes no credentials, so
 * nothing sensitive is present in the client bundle.
 */
export default function DemoLoginButton({
    variant = 'solid',
    label = 'Try the demo',
    className,
}: DemoLoginButtonProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleClick = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await signIn('demo', { redirect: false });
            if (res?.error) {
                setError("The demo isn't available right now. Please try again shortly.");
                return;
            }
            router.push('/dashboard');
            router.refresh();
        } catch {
            setError("The demo isn't available right now. Please try again shortly.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.wrap}>
            <button
                type="button"
                onClick={handleClick}
                disabled={loading}
                className={[styles.btn, styles[variant], className].filter(Boolean).join(' ')}
            >
                {loading ? (
                    <>
                        <span className={styles.spinner} /> Opening demo...
                    </>
                ) : (
                    <>
                        <PlayCircle size={16} /> {label}
                    </>
                )}
            </button>
            {error && <p className={styles.error}>{error}</p>}
        </div>
    );
}
