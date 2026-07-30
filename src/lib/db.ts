import { PrismaClient } from '@prisma/client';

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

/**
 * True when an error is a connectivity failure rather than a real query error.
 * Lets routes answer with 503 and an honest message instead of a blanket 500,
 * which otherwise looks identical to a bug in the app.
 */
export function isDatabaseUnreachable(error: unknown): boolean {
    const code = (error as { code?: unknown } | null)?.code;
    return typeof code === 'string' && UNREACHABLE_CODES.has(code);
}
