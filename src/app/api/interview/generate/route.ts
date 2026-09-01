import { jsonError } from '@/lib/http';
import { getSessionUser } from '@/lib/session';
import { cacheDel, cacheSetNx } from '@/lib/cache';
import { clientIp, enforceAiRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import {
    capResumeText,
    generateGeminiText,
    isQuotaError,
    trimChatMessages,
} from '@/lib/gemini';

export const maxDuration = 30;

const difficultyPrompts: Record<string, string> = {
    easy: 'Friendly interviewer. Entry-level questions, brief praise, a hint if they stall.',
    medium: 'Professional interviewer. Standard depth. One short note of praise or a gap, then the next question.',
    hard: 'Senior interviewer. Probe vague answers. Demand examples and metrics. One challenge, then the next question.',
};

function generateSystemPrompt(
    topic: string,
    name: string,
    difficulty: string,
    customTopic?: string,
    resumeText?: string
) {
    const roleContext = customTopic ? `'${customTopic}'` : `'${topic}'`;
    let basePrompt = `You are MockView AI interviewing ${name} for ${roleContext}.
${difficultyPrompts[difficulty] || difficultyPrompts.medium}
Rules: one question per turn; max 2 spoken sentences; no markdown; after an answer give a brief reaction then the next question; if they ask you something, one-sentence answer then resume. First turn: greeting + first question.`;

    if (resumeText) {
        basePrompt += `\nPersonalize from this resume excerpt:\n${resumeText}`;
    }
    return basePrompt;
}

export async function POST(req: Request) {
    try {
        const user = await getSessionUser();
        if (!user) return jsonError(401, 'UNAUTHORIZED', 'Unauthorized');

        const { messages, topic, resumeText, difficulty, customTopic } = await req.json();
        if (!messages || !topic) {
            return jsonError(400, 'VALIDATION_ERROR', 'Missing required parameters');
        }

        const limit = await enforceAiRateLimit(user.id, clientIp(req));
        if (!limit.allowed) return rateLimitResponse(limit.retryAfterSec);

        const lockKey = `lock:ai:generate:${user.id}`;
        const acquired = await cacheSetNx(lockKey, '1', 25);
        if (!acquired) {
            return jsonError(
                429,
                'RATE_LIMIT_EXCEEDED',
                'An interview turn is already in progress. Please wait a moment.'
            );
        }

        try {
            const system = generateSystemPrompt(
                topic,
                user.name || 'Candidate',
                difficulty || 'medium',
                customTopic,
                capResumeText(resumeText)
            );

            const { text } = await generateGeminiText({
                system,
                messages: trimChatMessages(messages),
            });
            return Response.json({ success: true, text });
        } catch (error) {
            console.error('Interview generate failed:', error);
            const quota = isQuotaError(error);
            return jsonError(
                quota ? 429 : 502,
                'INTERVIEW_GENERATION_FAILED',
                quota
                    ? 'The interviewer is rate-limited right now. Wait about a minute, then retry.'
                    : 'Could not reach the interviewer. Please retry.'
            );
        } finally {
            await cacheDel(lockKey);
        }
    } catch (error: unknown) {
        console.error('AI SDK Error:', error);
        const quota = isQuotaError(error);
        return jsonError(
            quota ? 429 : 500,
            'INTERVIEW_GENERATION_FAILED',
            quota
                ? 'The interviewer is rate-limited right now. Wait about a minute, then retry.'
                : 'Could not reach the interviewer. Please retry.'
        );
    }
}
