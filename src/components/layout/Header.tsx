'use client';

import React from 'react';
import { Bell, Search } from 'lucide-react';
import styles from './Header.module.css';

import { useSession } from 'next-auth/react';

interface HeaderProps {
    title: string;
    subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
    const { data: session } = useSession();

    // Compute initials from actual user name
    const userName = session?.user?.name || 'User';
    const initials = userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <header className={styles.header}>
            <div className={styles.left}>
                <h1 className={styles.title}>{title}</h1>
                {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            </div>
            <div className={styles.right}>
                <button className={styles.iconBtn} aria-label="Search">
                    <Search size={18} />
                </button>
                <button className={styles.iconBtn} aria-label="Notifications">
                    <Bell size={18} />
                    <span className={styles.notifDot} />
                </button>
                <div className={styles.avatar}>
                    <span>{initials}</span>
                </div>
            </div>
        </header>
    );
}
