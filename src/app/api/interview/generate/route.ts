import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { INTERVIEW_MODELS } from '@/lib/gemini';

export const maxDuration = 30;

const difficultyPrompts: Record<string, string> = {
    easy: `
You are a friendly, encouraging interviewer. 
- Ask straightforward, entry-level questions.
- Give positive feedback after each answer.
- Offer gentle hints if the candidate seems stuck.
- Keep the tone warm and supportive.`,
    medium: `
You are a balanced, professional interviewer.
- Ask industry-standard interview questions with moderate depth.
- Provide constructive feedback — praise what's good, note areas to improve.
- Expect reasonable depth in answers but don't push too hard.`,
    hard: `
You are a rigorous, senior-level interviewer at a top tech company.
- Ask deep, challenging follow-up questions that probe the candidate's understanding.
- Challenge vague answers — say "Can you be more specific?" or "Walk me through an example."
- Expect concrete examples, metrics, and technical precision.
- Don't accept surface-level answers — push for depth.`,
};

const generateSystemPrompt = (topic: string, name: string, difficulty: string, customTopic?: string, resumeText?: string) => {
    const roleContext = customTopic
        ? `'${customTopic}'`
        : `'${topic}'`;

    let basePrompt = `
You are an expert technical and behavioral interviewer named 'MockView AI'.
You are currently interviewing a candidate named '${name}' for a role relevant to: ${roleContext}.

${difficultyPrompts[difficulty] || difficultyPrompts.medium}

Core Rules:
1. Ask exactly ONE question at a time.
2. Speak like a real interviewer on a call: short, natural sentences that can be read aloud.
3. Maximum 2 sentences per turn. No markdown, no bullet lists, no stage directions.
4. After the candidate answers: one brief spoken reaction, then the next question. Never recap their whole answer.
5. If they ask you something, answer in one sentence and return to the interview.
6. Do not dump multiple questions. Wait for their reply, then continue.
7. The first turn is a one-sentence greeting plus the first question.
`;

    if (resumeText) {
        basePrompt += `
IMPORTANT — RESUME CONTEXT:
The candidate has provided their resume. You MUST use it to personalize your questions.
- Ask about specific projects, technologies, and experiences mentioned in the resume.
- Probe deeper into their listed skills and accomplishments.
- Reference their work history and education when forming questions.
- Start by acknowledging something from their resume before asking your first question.

CANDIDATE'S RESUME:
---
${resumeText}
---
`;
    }

    return basePrompt;
};

function isQuotaError(error: unknown): boolean {
    const text = error instanceof Error ? error.message : String(error ?? '');
    return /quota|rate-limit|429|RESOURCE_EXHAUSTED/i.test(text);
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { messages, topic, resumeText, difficulty, customTopic } = await req.json();

        if (!messages || !topic) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        const system = generateSystemPrompt(
            topic,
            session.user.name || 'Candidate',
            difficulty || 'medium',
            customTopic,
            resumeText
        );

        let lastError: unknown;
        for (const modelId of INTERVIEW_MODELS) {
            try {
                const { text } = await generateText({
                    model: google(modelId),
                    system,
                    messages,
                    maxRetries: 0,
                });
                if (text?.trim()) {
                    return NextResponse.json({ text: text.trim() });
                }
            } catch (error) {
                lastError = error;
                console.error(`Interview generate failed (${modelId}):`, error);
            }
        }

        const quota = isQuotaError(lastError);
        return NextResponse.json(
            {
                error: quota
                    ? 'The interviewer is rate-limited right now. Wait about a minute, then retry.'
                    : 'Could not reach the interviewer. Please retry.',
            },
            { status: quota ? 429 : 502 }
        );
    } catch (error: unknown) {
        console.error('AI SDK Error:', error);
        const quota = isQuotaError(error);
        return NextResponse.json(
            {
                error: quota
                    ? 'The interviewer is rate-limited right now. Wait about a minute, then retry.'
                    : 'Could not reach the interviewer. Please retry.',
            },
            { status: quota ? 429 : 500 }
        );
    }
}
