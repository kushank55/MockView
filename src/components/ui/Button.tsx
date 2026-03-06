'use client';

import React from 'react';
import styles from './Button.module.css';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    icon?: React.ReactNode;
    fullWidth?: boolean;
}

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    fullWidth = false,
    className,
    disabled,
    ...props
}: ButtonProps) {
    return (
        <button
            className={cn(
                styles.btn,
                styles[variant],
                styles[size],
                fullWidth && styles.fullWidth,
                loading && styles.loading,
                className
            )}
            disabled={disabled || loading}
            {...props}
        >
            {loading && <span className={styles.spinner} />}
            {icon && !loading && <span className={styles.icon}>{icon}</span>}
            {children}
        </button>
    );
}
