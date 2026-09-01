/**
 * Error contract shared between the data API routes and the pages that read
 * them.
 *
 * This file deliberately imports nothing: the pages are client components, so
 * anything they import here must not pull Prisma or next/server into the
 * browser bundle.
 *
 * A route that cannot reach the database answers 503 with the code below. That
 * is a very different situation from "you have no interviews yet", and the UI
 * has to be able to tell them apart — otherwise an outage silently renders as
 * an empty account.
 */

export const DATABASE_UNREACHABLE = 'DATABASE_UNREACHABLE';

export const DATABASE_UNREACHABLE_MESSAGE = 'Database not reached';

interface ApiErrorBody {
    error?: string | { code?: string; message?: string };
    code?: string;
    message?: string;
}

function nestedError(body?: unknown): { code?: string; message?: string } | null {
    if (!body || typeof body !== 'object') return null;
    const err = (body as ApiErrorBody).error;
    if (err && typeof err === 'object') return err;
    return null;
}

/** True when a response (and its parsed body) reports a database outage. */
export function isDatabaseUnreachableResponse(
    response: { status: number },
    body?: unknown
): boolean {
    const nested = nestedError(body);
    if (nested?.code === DATABASE_UNREACHABLE) return true;
    if ((body as ApiErrorBody | null | undefined)?.code === DATABASE_UNREACHABLE) return true;
    return response.status === 503;
}

/** Read a human message from either the legacy `{ error: string }` or `{ error: { message } }` shape. */
export function apiErrorMessage(body: unknown, fallback = 'Something went wrong'): string {
    if (!body || typeof body !== 'object') return fallback;
    const data = body as ApiErrorBody;
    if (typeof data.error === 'string' && data.error.trim()) return data.error;
    const nested = nestedError(body);
    if (nested?.message?.trim()) return nested.message;
    if (typeof data.message === 'string' && data.message.trim()) return data.message;
    return fallback;
}
