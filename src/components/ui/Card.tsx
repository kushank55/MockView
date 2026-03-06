'use client';

import React from 'react';
import styles from './Card.module.css';
import { cn } from '@/lib/utils';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
    glow?: 'blue' | 'purple' | 'cyan' | 'emerald' | null;
    padding?: 'sm' | 'md' | 'lg';
    onClick?: () => void;
}

export default function Card({
    children,
    className,
    hover = true,
    glow = null,
    padding = 'md',
    onClick,
}: CardProps) {
    return (
        <div
            className={cn(
                styles.card,
                hover && styles.hover,
                glow && styles[`glow_${glow}`],
                styles[`pad_${padding}`],
                className
            )}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
        >
            {children}
        </div>
    );
}
