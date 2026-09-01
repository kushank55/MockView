import { getServerSession } from 'next-auth';
import { getAuthOptions } from './auth';

export interface SessionUser {
    id: string;
    name: string | null;
    email: string | null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
    const session = await getServerSession(getAuthOptions());
    const id = (session?.user as { id?: string } | undefined)?.id;
    if (!id) return null;
    return {
        id,
        name: session?.user?.name ?? null,
        email: session?.user?.email ?? null,
    };
}
