import { jsonError } from '@/lib/http';
import { getSessionUser } from '@/lib/session';
import { clientIp, enforceAiRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { generateGeminiText, trimChatMessages } from '@/lib/gemini';

export const maxDuration = 20;

function parseSuggestions(raw: string): string[] {
    try {
        const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
        const objectMatch = cleaned.match(/\{[\s\S]*\}/);
        const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
        const parsed = JSON.parse(objectMatch?.[0] || arrayMatch?.[0] || cleaned) as unknown;
        const list = Array.isArray(parsed)
            ? parsed
            : parsed && typeof parsed === 'object' && Array.isArray((parsed as { suggestions?: unknown }).suggestions)
                ? (parsed as { suggestions: unknown[] }).suggestions
                : [];
        return list
            .filter((item): item is string => typeof item === 'string' && item.trim().length > 8)
            .map((item) => item.trim().replace(/^[-*]\s+/, ''))
            .slice(0, 4);
    } catch {
        return [];
    }
}

export async function POST(req: Request) {
    try {
        const user = await getSessionUser();
        if (!user) return jsonError(401, 'UNAUTHORIZED', 'Unauthorized');

        const limit = await enforceAiRateLimit(user.id, clientIp(req));
        if (!limit.allowed) return rateLimitResponse(limit.retryAfterSec);

        const { messages, topic, customTopic, difficulty } = await req.json();
        if (!Array.isArray(messages) || messages.length === 0) {
            return jsonError(400, 'VALIDATION_ERROR', 'Missing conversation');
        }

        const recent = trimChatMessages(messages, 8)
            .map((m) => `${m.role === 'assistant' ? 'Interviewer' : 'Candidate'}: ${m.content}`)
            .join('\n\n');

        const focus = customTopic || topic || 'this role';
        const prompt = `Coach for a live ${difficulty || 'medium'} ${topic || 'job'} interview about ${focus}.
Suggest 3 short questions the CANDIDATE can ask the INTERVIEWER now, specific to this conversation. JSON only: {"suggestions":["?","?","?"]}

${recent}`;

        try {
            const { text } = await generateGeminiText({ prompt });
            return Response.json({ success: true, suggestions: parseSuggestions(text) });
        } catch (error) {
            console.error('Interview suggest failed:', error);
            return Response.json({ success: true, suggestions: [] });
        }
    } catch (error) {
        console.error('Interview suggest error:', error);
        return jsonError(500, 'SUGGESTIONS_FAILED', 'Could not load suggestions');
    }
}
