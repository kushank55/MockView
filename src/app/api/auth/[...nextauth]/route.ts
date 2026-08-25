import { NextRequest } from 'next/server';
import NextAuth from 'next-auth';
import { getAuthOptions } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ nextauth: string[] }> };

async function handler(req: NextRequest, context: RouteContext) {
    return NextAuth(getAuthOptions())(req, context);
}

export { handler as GET, handler as POST };
