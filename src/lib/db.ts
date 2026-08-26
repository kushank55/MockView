import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import { DATABASE_UNREACHABLE, DATABASE_UNREACHABLE_MESSAGE } from './api-errors';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const db =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query'] : [],
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

// Prisma error codes that mean "the database is unreachable" rather than
// "the query was wrong". P1001 = can't reach server, P1002 = timed out,
// P1017 = server closed the connection.
const UNREACHABLE_CODES = new Set(['P1001', 'P1002', 'P1017']);

// PrismaClientInitializationError often has no `code`, but the message still
// clearly means "DB is down / wrong credentials / tenant gone".
const UNREACHABLE_MESSAGE = /can't reach database|enotfound|tenant\/user|not found|connection refused|econnrefused|timed out|server closed the connection/i;

/**
 * True when an error is a connectivity failure rather than a real query error.
 * Lets routes answer with 503 and an honest message instead of a blanket 500,
 * which otherwise looks identical to a bug in the app.
 */
export function isDatabaseUnreachable(error: unknown): boolean {
    const err = error as { code?: unknown; name?: unknown; message?: unknown } | null;
    const code = err?.code;
    if (typeof code === 'string' && UNREACHABLE_CODES.has(code)) return true;

    const name = typeof err?.name === 'string' ? err.name : '';
    const message = typeof err?.message === 'string' ? err.message : String(error ?? '');
    if (name === 'PrismaClientInitializationError') return true;
    return UNREACHABLE_MESSAGE.test(message);
}

/**
 * Standard answer for a route whose query failed because the database was
 * unreachable. 503 plus a machine-readable code, so a page can show "Database
 * not reached" instead of an empty list or a generic failure.
 *
 * Returns null when the error is a genuine bug, letting the caller fall through
 * to its own 500.
 */
export function databaseUnreachableResponse(error: unknown): NextResponse | null {
    if (!isDatabaseUnreachable(error)) return null;

    return NextResponse.json(
        { error: DATABASE_UNREACHABLE_MESSAGE, code: DATABASE_UNREACHABLE },
        { status: 503 }
    );
}
