'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import styles from './AppShell.module.css';

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isLanding = pathname === '/';

    if (isLanding) {
        return <>{children}</>;
    }

    return (
        <div className={styles.shell}>
            <Sidebar />
            <main className={styles.main}>{children}</main>
            <MobileNav />
        </div>
    );
}
