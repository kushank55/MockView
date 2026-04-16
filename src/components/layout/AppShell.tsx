'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import styles from './AppShell.module.css';

const publicPaths = ['/', '/login', '/signup'];

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { status } = useSession();
    const isPublic = publicPaths.includes(pathname);

    // Landing and auth pages — no shell
    if (pathname === '/' || pathname === '/login' || pathname === '/signup') {
        return <>{children}</>;
    }

    // If session is loading, show a minimal loading state
    if (status === 'loading') {
        return (
            <div className={styles.shell}>
                <div className={styles.main} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                }}>
                    <div style={{
                        width: 32,
                        height: 32,
                        border: '3px solid rgba(255,255,255,0.1)',
                        borderTopColor: 'var(--accent-blue)',
                        borderRadius: '50%',
                        animation: 'rotate 0.6s linear infinite',
                    }} />
                </div>
            </div>
        );
    }

    // Redirect unauthenticated users to login
    if (status === 'unauthenticated' && !isPublic) {
        router.push('/login');
        return null;
    }

    return (
        <div className={styles.shell}>
            <Sidebar />
            <main className={styles.main}>{children}</main>
            <MobileNav />
        </div>
    );
}
