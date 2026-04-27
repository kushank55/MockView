'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
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
    LogOut,
    Sun,
    Moon,
} from 'lucide-react';
import styles from './Sidebar.module.css';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/providers/ThemeProvider';

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
    const { data: session } = useSession();
    const { theme, toggleTheme } = useTheme();

    const userName = session?.user?.name || 'User';
    const userEmail = session?.user?.email || '';
    const initials = userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

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

            {/* User Profile Section */}
            <div className={cn(styles.userSection, collapsed && styles.userSectionCollapsed)}>
                <div className={styles.userInfo} title={collapsed ? userName : undefined}>
                    <div className={styles.userAvatar}>{initials}</div>
                    {!collapsed && (
                        <div className={styles.userDetails}>
                            <span className={styles.userName}>{userName}</span>
                            <span className={styles.userEmail}>{userEmail}</span>
                        </div>
                    )}
                </div>
                <button
                    className={styles.signOutBtn}
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    title="Sign out"
                >
                    <LogOut size={16} />
                    {!collapsed && <span>Sign out</span>}
                </button>
            </div>

            {/* Theme Toggle */}
            <button
                className={styles.themeToggle}
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
            </button>

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
