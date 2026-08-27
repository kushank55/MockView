import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { INTERVIEW_MODELS } from '@/lib/gemini';

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
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { messages, topic, customTopic, difficulty } = await req.json();
        if (!Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json({ error: 'Missing conversation' }, { status: 400 });
        }

        const recent = messages
            .slice(-8)
            .map((m: { role?: string; content?: string }) => {
                const who = m.role === 'assistant' ? 'Interviewer' : 'Candidate';
                return `${who}: ${String(m.content || '').trim()}`;
            })
            .filter((line: string) => !line.endsWith(':'))
            .join('\n\n');

        const focus = customTopic || topic || 'this role';
        const prompt = `You are an interview coach sitting with a candidate in a live ${difficulty || 'medium'} ${topic || 'job'} interview about ${focus}.

Here is the recent conversation:
---
${recent}
---

Suggest 3 short follow-up questions the CANDIDATE can ask the INTERVIEWER right now. They must be specific to this conversation (clarify the last question, probe the role/team/stack, or ask what success looks like). Do not suggest answers. Do not repeat questions already asked.

Return ONLY JSON: {"suggestions":["question one?","question two?","question three?"]}`;

        let lastError: unknown;
        for (const modelId of INTERVIEW_MODELS) {
            try {
                const { text } = await generateText({
                    model: google(modelId),
                    prompt,
                    maxRetries: 0,
                });
                const suggestions = parseSuggestions(text || '');
                if (suggestions.length > 0) {
                    return NextResponse.json({ suggestions });
                }
            } catch (error) {
                lastError = error;
                console.error(`Interview suggest failed (${modelId}):`, error);
            }
        }

        console.error('Interview suggest failed:', lastError);
        return NextResponse.json({ suggestions: [] });
    } catch (error) {
        console.error('Interview suggest error:', error);
        return NextResponse.json({ suggestions: [] }, { status: 500 });
    }
}
