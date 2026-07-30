/**
 * Sign-in error codes shared between the NextAuth server config and the
 * client sign-in pages.
 *
 * This lives apart from lib/auth.ts on purpose: that module imports Prisma,
 * and a client component importing it would pull the database client into the
 * browser bundle.
 *
 * The codes are deliberately opaque. Anything thrown from authorize() is
 * echoed back to the browser in a URL, so it must never carry a database
 * message, hostname, or stack trace.
 */
export const AUTH_ERRORS = {
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;
