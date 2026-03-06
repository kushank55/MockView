import React from 'react';
import styles from './Badge.module.css';
import { cn } from '@/lib/utils';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' | 'cyan';
    size?: 'sm' | 'md';
    dot?: boolean;
}

export default function Badge({
    children,
    variant = 'default',
    size = 'sm',
    dot = false,
}: BadgeProps) {
    return (
        <span className={cn(styles.badge, styles[variant], styles[size])}>
            {dot && <span className={styles.dot} />}
            {children}
        </span>
    );
}
