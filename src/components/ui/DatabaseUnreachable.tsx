'use client';

import { Database, RefreshCw } from 'lucide-react';
import { DATABASE_UNREACHABLE_MESSAGE } from '@/lib/api-errors';
import styles from './DatabaseUnreachable.module.css';

interface DatabaseUnreachableProps {
    /** Optional extra context for the page the user is on. */
    detail?: string;
    onRetry?: () => void;
}

/**
 * Shown when a data fetch fails because the database is unreachable.
 * Must never look like an empty account or a generic "still loading" state —
 * those hide the outage and make people think they have no data.
 */
export default function DatabaseUnreachable({
    detail = 'Your data is safe, but it cannot be loaded right now.',
    onRetry,
}: DatabaseUnreachableProps) {
    return (
        <div className={styles.wrap} role="alert">
            <div className={styles.icon}>
                <Database size={22} />
            </div>
            <h2 className={styles.title}>Database not reached</h2>
            <p className={styles.body}>{detail || DATABASE_UNREACHABLE_MESSAGE}</p>
            {onRetry && (
                <button type="button" className={styles.retry} onClick={onRetry}>
                    <RefreshCw size={14} />
                    Try again
                </button>
            )}
        </div>
    );
}
