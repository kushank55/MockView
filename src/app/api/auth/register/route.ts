import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { db, isDatabaseUnreachable } from '@/lib/db';
import { jsonError } from '@/lib/http';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null);
        const { name, email: rawEmail, password } = body ?? {};
        const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';

        if (!email || typeof password !== 'string' || !password) {
            return jsonError(400, 'VALIDATION_ERROR', 'Email and password are required');
        }

        if (!/^[^\s@]+@[^\s@]+$/.test(email)) {
            return jsonError(400, 'VALIDATION_ERROR', 'Enter a valid email address');
        }

        if (password.length < 6) {
            return jsonError(400, 'VALIDATION_ERROR', 'Password must be at least 6 characters');
        }

        const existingUser = await db.user.findFirst({
            where: { email: { equals: email, mode: 'insensitive' } },
            select: { id: true },
        });

        if (existingUser) {
            return jsonError(409, 'VALIDATION_ERROR', 'An account with this email already exists');
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const user = await db.user.create({
            data: {
                name: typeof name === 'string' ? name.trim() || null : null,
                email,
                passwordHash,
            },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                createdAt: true,
            },
        });

        return Response.json({ success: true, ...user }, { status: 201 });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return jsonError(409, 'VALIDATION_ERROR', 'An account with this email already exists');
        }

        console.error('POST /api/auth/register error:', error);

        if (isDatabaseUnreachable(error)) {
            return jsonError(503, 'DATABASE_UNREACHABLE', 'Database not reached. Please try again in a moment.');
        }

        return jsonError(500, 'INTERNAL_ERROR', 'Failed to create account');
    }
}
