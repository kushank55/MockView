/**
 * Starts an embedded Postgres for local development when Supabase is unavailable.
 * Keeps running until killed (Ctrl+C).
 */
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const databaseDir = resolve(process.cwd(), 'data/pg');
const port = Number(process.env.LOCAL_PG_PORT || 5433);
const user = 'postgres';
const password = 'postgres';
const database = 'mockview';

mkdirSync(databaseDir, { recursive: true });

const pg = new EmbeddedPostgres({
    databaseDir,
    user,
    password,
    port,
    persistent: true,
});

async function main() {
    const alreadyInitialised = existsSync(resolve(databaseDir, 'PG_VERSION'));
    if (!alreadyInitialised) {
        console.log(`Initialising embedded Postgres in ${databaseDir} ...`);
        await pg.initialise();
    } else {
        console.log(`Using existing cluster in ${databaseDir}`);
    }
    await pg.start();

    try {
        await pg.createDatabase(database);
        console.log(`Created database "${database}"`);
    } catch (err) {
        // Already exists on subsequent runs
        const msg = String(err?.message || err);
        if (!/already exists/i.test(msg)) {
            console.warn('createDatabase:', msg);
        } else {
            console.log(`Database "${database}" already exists`);
        }
    }

    const url = `postgresql://${user}:${password}@127.0.0.1:${port}/${database}`;
    console.log('\nLocal Postgres is ready.');
    console.log(`Set in .env:\n  DATABASE_URL="${url}"\n  DIRECT_URL="${url}"\n`);
    console.log('Leave this process running, then in another terminal:');
    console.log('  npx prisma db push');
    console.log('  npm run dev\n');
}

main().catch(async (err) => {
    console.error(err);
    try {
        await pg.stop();
    } catch {
        // ignore
    }
    process.exit(1);
});

async function shutdown() {
    console.log('\nStopping embedded Postgres...');
    try {
        await pg.stop();
    } catch {
        // ignore
    }
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
