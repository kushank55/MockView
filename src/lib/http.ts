import { NextResponse } from 'next/server';
import { DATABASE_UNREACHABLE, DATABASE_UNREACHABLE_MESSAGE } from './api-errors';

export type ErrorCode =
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'VALIDATION_ERROR'
    | 'RATE_LIMIT_EXCEEDED'
    | 'DATABASE_UNREACHABLE'
    | 'INTERVIEW_GENERATION_FAILED'
    | 'EVALUATION_FAILED'
    | 'RESUME_ANALYSIS_FAILED'
    | 'STAR_REWRITE_FAILED'
    | 'SUGGESTIONS_FAILED'
    | 'INTERNAL_ERROR';

export function jsonError(
    status: number,
    code: ErrorCode | string,
    message: string,
    extra?: Record<string, unknown>
) {
    return NextResponse.json(
        {
            success: false,
            error: { code, message },
            // Kept so older clients that read `error` as a string still work.
            message,
            code,
            ...extra,
        },
        { status }
    );
}

export function jsonOk<T>(data: T, status = 200) {
    return NextResponse.json({ success: true, ...data }, { status });
}

export function databaseUnavailable() {
    return jsonError(503, DATABASE_UNREACHABLE, DATABASE_UNREACHABLE_MESSAGE);
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export function parsePageLimit(searchParams: URLSearchParams): { page: number; limit: number; skip: number } {
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
    const requested = Number.parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT;
    const limit = Math.min(MAX_LIMIT, Math.max(1, requested));
    return { page, limit, skip: (page - 1) * limit };
}

export function paginationMeta(page: number, limit: number, total: number) {
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
    };
}
