'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Mic,
    FileText,
    History,
    Settings,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    Zap,
} from 'lucide-react';
import styles from './Sidebar.module.css';
import { cn } from '@/lib/utils';

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/interview', label: 'Interview', icon: Mic },
    { href: '/resume', label: 'Resume', icon: FileText },
    { href: '/history', label: 'History', icon: History },
    { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const pathname = usePathname();

    return (
        <aside className={cn(styles.sidebar, collapsed && styles.collapsed)}>
            {/* Logo */}
            <Link href="/" className={styles.logo}>
                <div className={styles.logoIcon}>
                    <Sparkles size={22} />
                </div>
                {!collapsed && (
                    <span className={styles.logoText}>
                        Mock<span className={styles.logoHighlight}>View</span>
                    </span>
                )}
            </Link>

            {/* Navigation */}
            <nav className={styles.nav}>
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(styles.navItem, isActive && styles.active)}
                            title={collapsed ? item.label : undefined}
                        >
                            <item.icon size={20} />
                            {!collapsed && <span>{item.label}</span>}
                            {isActive && <div className={styles.activeIndicator} />}
                        </Link>
                    );
                })}
            </nav>

            {/* Quick Start Card */}
            {!collapsed && (
                <div className={styles.quickStart}>
                    <div className={styles.quickStartIcon}>
                        <Zap size={18} />
                    </div>
                    <p className={styles.quickStartText}>Ready for your next interview?</p>
                    <Link href="/interview" className={styles.quickStartBtn}>
                        Start Now
                    </Link>
                </div>
            )}

            {/* Collapse Toggle */}
            <button
                className={styles.collapseBtn}
                onClick={() => setCollapsed((prev) => !prev)}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
                {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
        </aside>
    );
}
