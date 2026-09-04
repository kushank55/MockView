import type { NextConfig } from "next";

/**
 * NextAuth's client SDK inlines NEXTAUTH_URL at build time. If that value is
 * still http://localhost:3000 on a Vercel build, "Continue with Google" talks
 * to your laptop instead of this deployment.
 */
function vercelAuthUrl(): string | undefined {
    if (!process.env.VERCEL) return process.env.NEXTAUTH_URL;
    const host = (
        process.env.VERCEL_ENV === "production"
            ? process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
            : process.env.VERCEL_URL
    )?.replace(/^https?:\/\//, "");
    return host ? `https://${host}` : process.env.NEXTAUTH_URL;
}

const authUrl = vercelAuthUrl();

const nextConfig: NextConfig = {
    env: authUrl ? { NEXTAUTH_URL: authUrl } : {},
};

export default nextConfig;
