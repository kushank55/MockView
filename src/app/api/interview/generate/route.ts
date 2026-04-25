import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Node.js runtime is required for NextAuth and Prisma

// System prompt for the persona of the AI interviewer
const generateSystemPrompt = (topic: string, name: string, resumeText?: string) => {
    let basePrompt = `
You are an expert technical and behavioral interviewer named 'MockView AI'.
You are currently interviewing a candidate named '${name}' for a role relevant to: '${topic}'.

Your goal is to conduct a realistic, professional, yet conversational interview.
Rules:
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

        const { messages, topic, resumeText } = await req.json();

        if (!messages || !topic) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        // Call the Google Gemini model via Vercel AI SDK
        const result = streamText({
            model: google('gemini-2.5-flash'),
            system: generateSystemPrompt(topic, session.user.name || 'Candidate', resumeText),
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
