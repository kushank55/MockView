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

/** Human message for NextAuth OAuth `?error=` codes on login/signup. */
export function oauthErrorMessage(code: string): string {
    switch (code) {
        case 'OAuthAccountNotLinked':
            return 'This email already has an account. Sign in with email and password.';
        case 'Configuration':
            return 'Google sign-in is not configured on this deployment. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel, then redeploy.';
        case 'OAuthCallback':
        case 'Callback':
            return 'Google rejected the redirect URL. In Google Cloud Console, add this site as an origin and {origin}/api/auth/callback/google as an Authorized redirect URI.';
        case 'AccessDenied':
            return 'Google sign-in was cancelled.';
        default:
            return 'Google sign-in was cancelled or failed. Please try again.';
    }
}
