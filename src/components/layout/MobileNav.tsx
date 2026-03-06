'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Mic,
    FileText,
    History,
    Settings,
} from 'lucide-react';
import styles from './MobileNav.module.css';
import { cn } from '@/lib/utils';

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/interview', label: 'Interview', icon: Mic },
    { href: '/resume', label: 'Resume', icon: FileText },
    { href: '/history', label: 'History', icon: History },
    { href: '/settings', label: 'Settings', icon: Settings },
];

export default function MobileNav() {
    const pathname = usePathname();

    return (
        <nav className={styles.mobileNav}>
            {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(styles.navItem, isActive && styles.active)}
                    >
                        <item.icon size={20} />
                        <span className={styles.label}>{item.label}</span>
                        {isActive && <div className={styles.activeBar} />}
                    </Link>
                );
            })}
        </nav>
    );
}
