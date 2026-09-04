import { generateGeminiText, isQuotaError } from '@/lib/gemini';
import { NextRequest } from 'next/server';
import { jsonError } from '@/lib/http';
import { getSessionUser } from '@/lib/session';
import { clientIp, enforceAiRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { db } from '@/lib/db';

function buildStarPrompt(
    question: string,
    userAnswer: string,
    interviewType: string
): string {
    return `Rewrite this ${interviewType} interview answer in STAR form. Stay faithful to what the candidate said; use placeholders like [metric] if facts are missing. JSON only:
{"situation":"","task":"","action":"","result":"","fullAnswer":"","keyImprovements":["",""]}

Q: ${question}

A: ${userAnswer}`;
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getSessionUser();
        if (!user) return jsonError(401, 'UNAUTHORIZED', 'Unauthorized');

        const limit = await enforceAiRateLimit(user.id, clientIp(req));
        if (!limit.allowed) return rateLimitResponse(limit.retryAfterSec);

        const { id } = await params;
        const owned = await db.interview.findFirst({
            where: { id, userId: user.id },
            select: { id: true, type: true },
        });
        if (!owned) {
            return jsonError(404, 'NOT_FOUND', 'Interview not found');
        }

        const { question, answer, interviewType } = await req.json();
        if (!question || !answer) {
            return jsonError(400, 'VALIDATION_ERROR', 'Question and answer are required');
        }

        const { text: aiResponse } = await generateGeminiText({
            prompt: buildStarPrompt(question, String(answer).slice(0, 4000), interviewType || owned.type || 'general'),
        });

        let starData: {
            situation: string;
            task: string;
            action: string;
            result: string;
            fullAnswer: string;
            keyImprovements: string[];
        };

        try {
            const cleaned = aiResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
            starData = JSON.parse(cleaned);
        } catch {
            console.error('Failed to parse STAR response:', aiResponse.slice(0, 500));
            return jsonError(502, 'STAR_REWRITE_FAILED', 'AI returned an invalid response. Please try again.');
        }

        if (!starData.fullAnswer || !starData.situation) {
            return jsonError(502, 'STAR_REWRITE_FAILED', 'AI returned incomplete STAR data. Please try again.');
        }

        return Response.json({ success: true, ...starData });
    } catch (error) {
        console.error('POST /api/interviews/[id]/star error:', error);
        const quota = isQuotaError(error);
        return jsonError(
            quota ? 429 : 502,
            'STAR_REWRITE_FAILED',
            quota
                ? 'STAR rewrite is rate-limited right now. Wait about a minute, then retry.'
                : 'Failed to generate STAR response'
        );
    }
}
