'use client';

import React from 'react';
import styles from './ProgressRing.module.css';

interface ProgressRingProps {
    progress: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
    bgColor?: string;
    children?: React.ReactNode;
}

export default function ProgressRing({
    progress,
    size = 120,
    strokeWidth = 8,
    color = 'var(--accent-blue)',
    bgColor = 'var(--border-subtle)',
    children,
}: ProgressRingProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className={styles.container} style={{ width: size, height: size }}>
            <svg width={size} height={size} className={styles.svg}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={bgColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className={styles.progressCircle}
                    style={{
                        filter: `drop-shadow(0 0 6px ${color})`,
                    }}
                />
            </svg>
            {children && <div className={styles.content}>{children}</div>}
        </div>
    );
}
