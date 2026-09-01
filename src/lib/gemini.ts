/**
 * Gemini model IDs and call helpers.
 *
 * 2.x Flash IDs are retired for new API keys (404). Flash-Lite is the
 * default for live interviews: lower latency and a higher free-tier cap so
 * turn-by-turn practice does not burn the daily Flash quota. 3.6 Flash is
 * the fallback when Lite is empty or errors.
 *
 * Interview turns are NOT streamed. An earlier streamText integration hung
 * under Next.js App Router + this SDK version, and the UI already speaks
 * sentence-by-sentence after a complete turn. Streaming JSON endpoints
 * (evaluate / suggest / STAR) would also be unusable mid-parse.
 */

import { google } from '@ai-sdk/google';
import { generateText, type ModelMessage } from 'ai';

export const GEMINI_FAST = 'gemini-3.5-flash-lite';
export const GEMINI_DEFAULT = 'gemini-3.6-flash';
export const INTERVIEW_MODELS = [GEMINI_FAST, GEMINI_DEFAULT] as const;

export const GEMINI_TIMEOUT_MS = 20_000;
export const MAX_INTERVIEW_MESSAGES = 10;
export const MAX_RESUME_CHARS = 4000;
export const MAX_EVAL_MESSAGES = 40;

type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };

export function isQuotaError(error: unknown): boolean {
    const text = error instanceof Error ? error.message : String(error ?? '');
    return /quota|rate-limit|429|RESOURCE_EXHAUSTED/i.test(text);
}

export function isTransientGeminiError(error: unknown): boolean {
    if (isQuotaError(error)) return true;
    const text = error instanceof Error ? error.message : String(error ?? '');
    return /503|502|504|overloaded|unavailable|ECONNRESET|ETIMEDOUT|fetch failed|network/i.test(text);
}

export function isPermanentGeminiError(error: unknown): boolean {
    const text = error instanceof Error ? error.message : String(error ?? '');
    return /401|403|API_KEY|invalid.?key|PERMISSION_DENIED/i.test(text);
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function trimChatMessages(
    messages: Array<{ role?: string; content?: unknown }>,
    max = MAX_INTERVIEW_MESSAGES
): ChatMessage[] {
    const cleaned = messages
        .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
        .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: String(m.content ?? '').trim(),
        }))
        .filter((m) => m.content.length > 0);
    return cleaned.slice(-max);
}

export function capResumeText(resumeText?: string | null): string | undefined {
    if (!resumeText?.trim()) return undefined;
    return resumeText.trim().slice(0, MAX_RESUME_CHARS);
}

async function generateOnce(modelId: string, args: {
    system?: string;
    prompt?: string;
    messages?: ChatMessage[];
}): Promise<string> {
    const { text } = await generateText({
        model: google(modelId),
        system: args.system,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
        ...(args.messages?.length
            ? { messages: args.messages as ModelMessage[] }
            : { prompt: args.prompt || '' }),
    });
    return text?.trim() || '';
}

/**
 * Tries Lite then Flash. Retries transient failures with exponential backoff.
 * Does not retry invalid-key / permission errors.
 */
export async function generateGeminiText(args: {
    system?: string;
    prompt?: string;
    messages?: ChatMessage[];
    models?: readonly string[];
}): Promise<{ text: string; model: string }> {
    const models = args.models?.length ? args.models : INTERVIEW_MODELS;
    let lastError: unknown;

    for (const modelId of models) {
        let delay = 400;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const text = await generateOnce(modelId, args);
                if (text) return { text, model: modelId };
                lastError = new Error('Empty model response');
                break;
            } catch (error) {
                lastError = error;
                console.error(`Gemini ${modelId} attempt ${attempt + 1} failed:`, error);
                if (isPermanentGeminiError(error)) throw error;
                if (!isTransientGeminiError(error) || attempt === 2) break;
                await sleep(delay);
                delay *= 2;
            }
        }
    }

    throw lastError instanceof Error ? lastError : new Error('Gemini request failed');
}
