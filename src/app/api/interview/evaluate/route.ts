import { NextRequest } from 'next/server';
import { jsonError } from '@/lib/http';
import { getSessionUser } from '@/lib/session';
import { clientIp, enforceAiRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { generateGeminiText, MAX_EVAL_MESSAGES, isQuotaError, trimChatMessages } from '@/lib/gemini';

function buildEvaluationPrompt(
    transcript: Array<{ role: string; content: string }>,
    interviewType: string
): string {
    const formattedTranscript = transcript
        .map((m) => `${m.role === 'assistant' ? 'Interviewer' : 'Candidate'}: ${m.content}`)
        .join('\n\n');

    return `Score this ${interviewType} mock interview. JSON only:
{"score":0,"feedback":{"communication":0,"technical":0,"problemSolving":0,"confidence":0},"coachTips":[{"type":"strength","text":"","color":"emerald"}],"summary":""}
Weights: communication 25%, technical 30%, problem solving 25%, confidence 20%. 4-6 coachTips (strength=emerald, improvement=amber, tip=blue) grounded in the transcript. Short transcripts score 40-60.

TRANSCRIPT:
${formattedTranscript}`;
}

export async function POST(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user) return jsonError(401, 'UNAUTHORIZED', 'Unauthorized');

        const limit = await enforceAiRateLimit(user.id, clientIp(req));
        if (!limit.allowed) return rateLimitResponse(limit.retryAfterSec);

        const { transcript, type } = await req.json();
        if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
            return jsonError(400, 'VALIDATION_ERROR', 'A non-empty transcript is required for evaluation');
        }

        const trimmed = trimChatMessages(transcript, MAX_EVAL_MESSAGES);
        const { text: aiResponse } = await generateGeminiText({
            prompt: buildEvaluationPrompt(trimmed, type || 'general'),
        });

        let evaluationData: {
            score: number;
            feedback: {
                communication: number;
                technical: number;
                problemSolving: number;
                confidence: number;
            };
            coachTips: Array<{ type: string; text: string; color: string }>;
            summary: string;
        };

        try {
            const cleaned = aiResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
            evaluationData = JSON.parse(cleaned);
        } catch {
            console.error('Failed to parse AI evaluation:', aiResponse.slice(0, 500));
            return jsonError(502, 'EVALUATION_FAILED', 'AI returned an invalid evaluation. Please try again.');
        }

        if (
            typeof evaluationData.score !== 'number' ||
            !evaluationData.feedback ||
            !Array.isArray(evaluationData.coachTips)
        ) {
            return jsonError(502, 'EVALUATION_FAILED', 'AI evaluation returned incomplete data. Please try again.');
        }

        evaluationData.score = Math.max(0, Math.min(100, Math.round(evaluationData.score)));
        evaluationData.feedback.communication = Math.max(0, Math.min(100, Math.round(evaluationData.feedback.communication)));
        evaluationData.feedback.technical = Math.max(0, Math.min(100, Math.round(evaluationData.feedback.technical)));
        evaluationData.feedback.problemSolving = Math.max(0, Math.min(100, Math.round(evaluationData.feedback.problemSolving)));
        evaluationData.feedback.confidence = Math.max(0, Math.min(100, Math.round(evaluationData.feedback.confidence)));

        return Response.json({ success: true, ...evaluationData });
    } catch (error) {
        console.error('POST /api/interview/evaluate error:', error);
        const quota = isQuotaError(error);
        return jsonError(
            quota ? 429 : 502,
            'EVALUATION_FAILED',
            quota
                ? 'The evaluator is rate-limited right now. Wait about a minute, then retry.'
                : 'Failed to evaluate interview'
        );
    }
}
