'use client';

/**
 * Live preview of the database-outage UI. The real database is up, so this
 * page exists so the empty-state vs outage-state difference can be seen
 * without taking the DB offline.
 */
import Header from '@/components/layout/Header';
import Card from '@/components/ui/Card';
import DatabaseUnreachable from '@/components/ui/DatabaseUnreachable';
import styles from './preview.module.css';

export default function OutagePreviewPage() {
    return (
        <div className={styles.page}>
            <Header
                title="Outage UI preview"
                subtitle="What users see when the database cannot be reached"
            />

            <div className={styles.grid}>
                <section>
                    <p className={styles.label}>Before — History treated a dead database as empty data</p>
                    <Card>
                        <p className={styles.oldEmpty}>
                            No interviews found. Start practicing!
                        </p>
                    </Card>
                    <p className={styles.caption}>
                        That is the current-looking empty state. A 503 from the API
                        used to fall through to this, so an outage looked like a new account.
                    </p>
                </section>

                <section>
                    <p className={styles.label}>After — every data page now shows this</p>
                    <DatabaseUnreachable
                        onRetry={() => {
                            alert('Retry would refetch the page.');
                        }}
                    />
                </section>
            </div>
        </div>
    );
}
