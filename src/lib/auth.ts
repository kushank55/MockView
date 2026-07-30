import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { AUTH_ERRORS } from './auth-errors';
import { ensureDemoUser } from './demo';

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(db) as NextAuthOptions['adapter'],
    session: {
        strategy: 'jwt',
    },
    pages: {
        signIn: '/login',
    },
    providers: [
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

export default NextAuth(authOptions);
