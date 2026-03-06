'use client';

import React from 'react';
import { Bell, Search } from 'lucide-react';
import styles from './Header.module.css';

interface HeaderProps {
    title: string;
    subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
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
                    <span>KG</span>
                </div>
            </div>
        </header>
    );
}
