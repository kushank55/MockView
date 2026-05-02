import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// ── System prompt for STAR rewriting ──
function buildStarPrompt(
    question: string,
    userAnswer: string,
    interviewType: string
): string {
    return `You are an expert career coach specializing in interview preparation.

A candidate answered an interview question during a "${interviewType}" mock interview.
Your task is to rewrite their answer into a polished, professional response using the STAR method.

STAR Format:
- **Situation**: Set the context — describe the relevant background.
- **Task**: Explain your specific responsibility or the challenge you faced.
- **Action**: Detail the steps YOU took (use "I" statements, be specific about your contributions).
- **Result**: Share the measurable outcome, what you learned, and the impact.

ORIGINAL QUESTION:
"${question}"

CANDIDATE'S ANSWER:
"${userAnswer}"

Produce a JSON object (and NOTHING else — no markdown, no explanation) with this exact structure:

{
  "situation": "<1-2 sentences setting the context>",
  "task": "<1-2 sentences describing the specific challenge or responsibility>",
  "action": "<2-4 sentences detailing specific actions taken, using I-statements>",
  "result": "<1-2 sentences with measurable outcomes or impact>",
  "fullAnswer": "<The complete STAR answer as a single flowing paragraph that sounds natural in a real interview>",
  "keyImprovements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"]
}

Guidelines:
1. Keep the rewrite grounded in what the candidate ACTUALLY said — don't invent facts.
2. If the candidate's answer was vague, add placeholders like "[specific metric]" or "[project name]" that they should fill in.
3. Make "fullAnswer" sound conversational and natural, not robotic.
4. "keyImprovements" should list 2-4 specific things the rewrite improved (e.g., "Added quantifiable results", "Used I-statements instead of 'we'").
5. If the answer doesn't suit STAR format (e.g., it's a pure technical/factual answer), still restructure it with a clear setup → approach → result flow.

Respond ONLY with the JSON object.`;
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await params; // Validate route param exists

        const { question, answer, interviewType } = await req.json();

        if (!question || !answer) {
            return NextResponse.json(
                { error: 'Question and answer are required' },
                { status: 400 }
            );
        }

        // Call Gemini for STAR rewrite
        const { text: aiResponse } = await generateText({
            model: google('gemini-2.5-flash'),
            prompt: buildStarPrompt(question, answer, interviewType || 'general'),
        });

        // Parse the AI response
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
            return NextResponse.json(
                { error: 'AI returned an invalid response. Please try again.' },
                { status: 502 }
            );
        }

        // Validate structure
        if (!starData.fullAnswer || !starData.situation) {
            return NextResponse.json(
                { error: 'AI returned incomplete STAR data. Please try again.' },
                { status: 502 }
            );
        }

        return NextResponse.json(starData);
    } catch (error: any) {
        console.error('POST /api/interviews/[id]/star error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate STAR response' },
            { status: 500 }
        );
    }
}
