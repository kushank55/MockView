import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import type { Adapter } from 'next-auth/adapters';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { AUTH_ERRORS } from './auth-errors';
import { DEMO_EMAIL, DEMO_NAME, ensureDemoUser } from './demo';

/**
 * Dynamic lookup so Next.js cannot replace `process.env.GOOGLE_CLIENT_ID`
 * with an empty string at build time (which is what happened locally, and
 * would also disable Google on Vercel even after the keys are added).
 */
function runtimeEnv(key: string): string {
    const bag: Record<string, string | undefined> = process.env;
    return (bag[key] ?? '').trim();
}

/**
 * Next.js/Turbopack can snapshot process.env with empty GOOGLE_CLIENT_* keys,
 * so later .env values never reach NextAuth. Fall back to parsing `.env`.
 * On Vercel there is no `.env` file — keys must come from project env vars.
 */
function readProjectEnv(key: string): string {
    const fromProcess = runtimeEnv(key);
    if (fromProcess) return fromProcess;
    if (process.env.VERCEL) return '';

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

/** Localhost NEXTAUTH_URL copied to Vercel makes Google redirect to your laptop. */
function applyVercelAuthUrl() {
    if (!process.env.VERCEL) return;
    const current = runtimeEnv('NEXTAUTH_URL');
    const looksLocal = !current || /localhost|127\.0\.0\.1/i.test(current);
    if (!looksLocal) return;

    const host = (
        process.env.VERCEL_ENV === 'production'
            ? process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
            : process.env.VERCEL_URL
    )?.replace(/^https?:\/\//, '');
    if (host) process.env.NEXTAUTH_URL = `https://${host}`;
}

async function unlinkGoogleFromDemo(providerAccountId: string) {
    await db.account.deleteMany({
        where: {
            provider: 'google',
            providerAccountId,
            user: { email: DEMO_EMAIL },
        },
    });
}

/**
 * NextAuth links a new Google login onto the current session. After someone
 * tries the demo, that session is Demo User — so Gmail keeps opening the
 * shared playground account. Always resolve Google to a real user by email.
 */
async function resolveGoogleUser(input: {
    providerAccountId: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
}) {
    const email = input.email?.trim().toLowerCase();
    if (!email || email === DEMO_EMAIL) return null;

    await unlinkGoogleFromDemo(input.providerAccountId);

    const demo = await db.user.findUnique({
        where: { email: DEMO_EMAIL },
        select: { id: true },
    });

    let user = await db.user.findUnique({ where: { email } });

    if (!demo) {
        const stolen = await db.user.findFirst({
            where: { name: DEMO_NAME, email },
        });
        if (stolen) {
            await db.user.update({
                where: { id: stolen.id },
                data: { email: DEMO_EMAIL, name: DEMO_NAME },
            });
            user = null;
        }
    } else if (user?.id === demo.id) {
        user = null;
    }

    if (!user) {
        user = await db.user.create({
            data: {
                email,
                name: input.name || email.split('@')[0],
                image: input.image,
                emailVerified: new Date(),
            },
        });
    } else if (!user.name && input.name) {
        user = await db.user.update({
            where: { id: user.id },
            data: { name: input.name, image: input.image ?? user.image },
        });
    }

    const existing = await db.account.findUnique({
        where: {
            provider_providerAccountId: {
                provider: 'google',
                providerAccountId: input.providerAccountId,
            },
        },
    });

    if (existing && existing.userId !== user.id) {
        await db.account.delete({ where: { id: existing.id } });
    }
    if (!existing || existing.userId !== user.id) {
        await db.account.create({
            data: {
                userId: user.id,
                type: 'oauth',
                provider: 'google',
                providerAccountId: input.providerAccountId,
            },
        });
    }

    return user;
}

export function getAuthOptions(): NextAuthOptions {
    applyVercelAuthUrl();
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
            'Google sign-in is disabled: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing. On Vercel, set both in Project Settings → Environment Variables and redeploy.'
        );
    }

    return {
        adapter: PrismaAdapter(db) as Adapter,
        secret: readProjectEnv('NEXTAUTH_SECRET') || undefined,
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
            async signIn({ account }) {
                if (account?.provider === 'google' && account.providerAccountId) {
                    await unlinkGoogleFromDemo(account.providerAccountId);
                }
                return true;
            },
            async jwt({ token, user, account, profile }) {
                if (account?.provider === 'google') {
                    const googleProfile = profile as
                        | { email?: string; name?: string; picture?: string; image?: string }
                        | undefined;
                    const resolved = await resolveGoogleUser({
                        providerAccountId: account.providerAccountId,
                        email: googleProfile?.email || user?.email,
                        name: googleProfile?.name || user?.name,
                        image:
                            googleProfile?.picture ||
                            googleProfile?.image ||
                            user?.image,
                    });
                    if (resolved) {
                        token.id = resolved.id;
                        token.sub = resolved.id;
                        token.name = resolved.name;
                        token.email = resolved.email;
                        token.picture = resolved.image;
                    }
                    return token;
                }
                if (user) {
                    token.id = user.id;
                    token.name = user.name;
                    token.email = user.email;
                    token.picture = user.image;
                }
                if (!token.id && token.sub) {
                    token.id = token.sub;
                }
                return token;
            },
            async session({ session, token }) {
                if (session.user) {
                    (session.user as { id: string }).id = token.id as string;
                    if (typeof token.name === 'string') session.user.name = token.name;
                    if (typeof token.email === 'string') session.user.email = token.email;
                    if (typeof token.picture === 'string') session.user.image = token.picture;
                }
                return session;
            },
        },
    };
}

export const authOptions: NextAuthOptions = getAuthOptions();

export default NextAuth(authOptions);
