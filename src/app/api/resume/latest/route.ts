import { databaseUnreachableResponse, db } from '@/lib/db';
import { jsonError } from '@/lib/http';
import { getSessionUser } from '@/lib/session';

// GET /api/resume/latest — the user's most recent analyzed resume, so the
// interview setup can reuse it instead of asking for the same PDF again.
export async function GET() {
    try {
        const user = await getSessionUser();
        if (!user) return jsonError(401, 'UNAUTHORIZED', 'Unauthorized');
        const userId = user.id;

        const latest = await db.resumeAnalysis.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                fileName: true,
                targetRole: true,
                atsScore: true,
                resumeText: true,
                createdAt: true,
            },
        });

        // Analyses saved before resumeText existed can't personalize an
        // interview, so treat them as "nothing reusable available".
        if (!latest?.resumeText) {
            return Response.json({ success: true, resume: null });
        }

        return Response.json({ success: true, resume: latest });
    } catch (error) {
        console.error('GET /api/resume/latest error:', error);
        return (
            databaseUnreachableResponse(error) ??
            jsonError(500, 'INTERNAL_ERROR', 'Failed to fetch resume')
        );
    }
}
