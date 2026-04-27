import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Node.js runtime is required for NextAuth and Prisma

// Difficulty-specific prompting
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

// System prompt for the persona of the AI interviewer
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
2. Keep your responses concise and conversational (maximum 2-3 sentences).
3. Do not break character. Do not use markdown that can't easily be read aloud.
4. Listen to the candidate's answer, provide 1 brief constructive remark (praising or pointing out a slight improvement), and then ask the NEXT question.
5. If the candidate asks you a question, answer it briefly, but steer the conversation back to the interview.
6. The interview must feel like a natural voice conversation.
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

        // Call the Google Gemini model via Vercel AI SDK
        const result = streamText({
            model: google('gemini-2.5-flash'),
            system: generateSystemPrompt(
                topic,
                session.user.name || 'Candidate',
                difficulty || 'medium',
                customTopic,
                resumeText
            ),
            messages: messages as any[],
        });

        return result.toTextStreamResponse();
    } catch (error: any) {
        console.error('AI SDK Error:', error);
        return NextResponse.json(
            { error: error.message || 'An error occurred during interview generation' },
            { status: 500 }
        );
    }
}
