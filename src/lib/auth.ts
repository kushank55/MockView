import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { AUTH_ERRORS } from './auth-errors';
import { ensureDemoUser } from './demo';

/**
 * Next.js/Turbopack can snapshot process.env with empty GOOGLE_CLIENT_* keys,
 * so later .env values never reach NextAuth. Read the key from process.env
 * first, then fall back to parsing `.env` directly.
 */
function readProjectEnv(key: string): string {
    const fromProcess = process.env[key]?.trim();
    if (fromProcess) return fromProcess;

    const envPath = resolve(process.cwd(), '.env');
    if (!existsSync(envPath)) return '';

    for (const rawLine of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const eq = line.indexOf('=');
        if (eq <= 0) continue;
        if (line.slice(0, eq).trim() !== key) continue;
        let value = line.slice(eq + 1).trim();
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        return value;
    }
    return '';
}

export function getAuthOptions(): NextAuthOptions {
    const googleClientId = readProjectEnv('GOOGLE_CLIENT_ID');
    const googleClientSecret = readProjectEnv('GOOGLE_CLIENT_SECRET');

    const googleProvider =
        googleClientId && googleClientSecret
            ? [
                  GoogleProvider({
                      clientId: googleClientId,
                      clientSecret: googleClientSecret,
                      // Same-email Google sign-in should attach to an existing
                      // credentials account instead of failing with OAuthAccountNotLinked.
                      allowDangerousEmailAccountLinking: true,
                  }),
              ]
            : [];

    if (googleProvider.length === 0) {
        console.warn(
            'Google sign-in is disabled: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing from .env'
        );
    }

    return {
        adapter: PrismaAdapter(db) as NextAuthOptions['adapter'],
        session: {
            strategy: 'jwt',
        },
        pages: {
            signIn: '/login',
        },
        providers: [
            ...googleProvider,
            CredentialsProvider({
                name: 'credentials',
                credentials: {
                    email: { label: 'Email', type: 'email' },
                    password: { label: 'Password', type: 'password' },
                },
                async authorize(credentials) {
                    if (!credentials?.email || !credentials?.password) {
                        throw new Error(AUTH_ERRORS.INVALID_CREDENTIALS);
                    }

                    // NextAuth forwards whatever this function throws to the browser
                    // via the error query param, so infrastructure failures must be
                    // logged server-side and reported as an opaque code. Leaking the
                    // raw Prisma message would publish the database hostname.
                    let user;
                    try {
                        user = await db.user.findUnique({
                            where: { email: credentials.email },
                        });
                    } catch (error) {
                        console.error('Auth database lookup failed:', error);
                        throw new Error(AUTH_ERRORS.SERVICE_UNAVAILABLE);
                    }

                    if (!user || !user.passwordHash) {
                        throw new Error(AUTH_ERRORS.INVALID_CREDENTIALS);
                    }

                    const isValid = await bcrypt.compare(
                        credentials.password,
                        user.passwordHash
                    );

                    if (!isValid) {
                        throw new Error(AUTH_ERRORS.INVALID_CREDENTIALS);
                    }

                    return {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        image: user.image,
                    };
                },
            }),

            // One-click demo sign-in. Takes no input and can only ever return the
            // demo account, so there is no password to ship to the browser and no
            // way to reach any other user through it.
            CredentialsProvider({
                id: 'demo',
                name: 'Demo',
                credentials: {},
                async authorize() {
                    try {
                        const user = await ensureDemoUser();
                        return {
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            image: user.image,
                        };
                    } catch (error) {
                        console.error('Demo sign-in failed:', error);
                        throw new Error(AUTH_ERRORS.SERVICE_UNAVAILABLE);
                    }
                },
            }),
        ],
        callbacks: {
            async jwt({ token, user }) {
                if (user) {
                    token.id = user.id;
                }
                if (!token.id && token.sub) {
                    token.id = token.sub;
                }
                return token;
            },
            async session({ session, token }) {
                if (session.user) {
                    (session.user as { id: string }).id = token.id as string;
                }
                return session;
            },
        },
    };
}

export const authOptions: NextAuthOptions = getAuthOptions();

export default NextAuth(authOptions);
