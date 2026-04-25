import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// ── System prompt for post-interview evaluation ──
function buildEvaluationPrompt(
    transcript: Array<{ role: string; content: string }>,
    interviewType: string
): string {
    const formattedTranscript = transcript
        .map((m) => `${m.role === 'assistant' ? 'Interviewer' : 'Candidate'}: ${m.content}`)
        .join('\n\n');

    return `You are an expert interview evaluator and career coach.

You have just observed a "${interviewType}" mock interview. Analyze the following transcript and produce a detailed evaluation.

Produce a JSON object (and NOTHING else — no markdown, no explanation) with this exact structure:

{
  "score": <number 0-100, overall interview performance>,
  "feedback": {
    "communication": <number 0-100>,
    "technical": <number 0-100>,
    "problemSolving": <number 0-100>,
    "confidence": <number 0-100>
  },
  "coachTips": [
    { "type": "strength" | "improvement" | "tip", "text": "<concise actionable feedback>", "color": "emerald" | "amber" | "blue" }
  ],
  "summary": "<2-3 sentence overall assessment of the candidate's performance>"
}

Guidelines:
1. "score" is the weighted overall score. Communication (25%), Technical Knowledge (30%), Problem Solving (25%), Confidence (20%).
2. "feedback" breaks down into 4 sub-scores. Be strict but fair — a vague or short answer should score 30-50 for that category.
3. "coachTips" should contain 4-6 items. Include at least 1 "strength" (color: "emerald"), 2-3 "improvement" items (color: "amber"), and 1-2 "tip" items (color: "blue"). Each tip text must be specific to what the candidate ACTUALLY said (or failed to say).
4. "summary" should be encouraging but honest.
5. If the transcript is very short (1-2 exchanges), score conservatively (40-60) and note that more practice is needed.

INTERVIEW TRANSCRIPT:
---
${formattedTranscript}
---

Respond ONLY with the JSON object.`;
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { transcript, type } = await req.json();

        if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
            return NextResponse.json(
                { error: 'A non-empty transcript is required for evaluation' },
                { status: 400 }
            );
        }

        // Call Gemini for evaluation
        const { text: aiResponse } = await generateText({
            model: google('gemini-2.5-flash'),
            prompt: buildEvaluationPrompt(transcript, type || 'general'),
        });

        // Parse the AI response
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
            return NextResponse.json(
                { error: 'AI returned an invalid evaluation. Please try again.' },
                { status: 502 }
            );
        }

        // Validate structure
        if (
            typeof evaluationData.score !== 'number' ||
            !evaluationData.feedback ||
            !Array.isArray(evaluationData.coachTips)
        ) {
            return NextResponse.json(
                { error: 'AI evaluation returned incomplete data. Please try again.' },
                { status: 502 }
            );
        }

        // Clamp scores to 0-100
        evaluationData.score = Math.max(0, Math.min(100, Math.round(evaluationData.score)));
        evaluationData.feedback.communication = Math.max(0, Math.min(100, Math.round(evaluationData.feedback.communication)));
        evaluationData.feedback.technical = Math.max(0, Math.min(100, Math.round(evaluationData.feedback.technical)));
        evaluationData.feedback.problemSolving = Math.max(0, Math.min(100, Math.round(evaluationData.feedback.problemSolving)));
        evaluationData.feedback.confidence = Math.max(0, Math.min(100, Math.round(evaluationData.feedback.confidence)));

        return NextResponse.json(evaluationData);
    } catch (error: any) {
        console.error('POST /api/interview/evaluate error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to evaluate interview' },
            { status: 500 }
        );
    }
}
