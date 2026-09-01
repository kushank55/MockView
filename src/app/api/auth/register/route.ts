import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { db, isDatabaseUnreachable } from '@/lib/db';
import { jsonError } from '@/lib/http';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, email, password } = body;

        if (!email || !password) {
            return jsonError(400, 'VALIDATION_ERROR', 'Email and password are required');
        }

        if (password.length < 6) {
            return jsonError(400, 'VALIDATION_ERROR', 'Password must be at least 6 characters');
        }

        const existingUser = await db.user.findUnique({
            where: { email },
            select: { id: true },
        });

        if (existingUser) {
            return jsonError(409, 'VALIDATION_ERROR', 'An account with this email already exists');
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const user = await db.user.create({
            data: {
                name: name || null,
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
        console.error('POST /api/auth/register error:', error);

        if (isDatabaseUnreachable(error)) {
            return jsonError(503, 'DATABASE_UNREACHABLE', 'Database not reached. Please try again in a moment.');
        }

        return jsonError(500, 'INTERNAL_ERROR', 'Failed to create account');
    }
}
