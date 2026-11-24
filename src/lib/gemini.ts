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
import { APICallError, generateText, Output, type ModelMessage } from 'ai';
import { type ZodType } from 'zod';
import { setTimeout as sleep } from 'node:timers/promises';

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
    return (APICallError.isInstance(error) && error.statusCode === 429) ||
        /quota|rate.limit|429|RESOURCE_EXHAUSTED/i.test(text);
}

export function isTransientGeminiError(error: unknown): boolean {
    if (isQuotaError(error) || isPermanentGeminiError(error)) return false;
    if (APICallError.isInstance(error) && error.statusCode && error.statusCode >= 500) return true;
    if (error instanceof Error && /^(Abort|Timeout)Error$/.test(error.name)) return true;
    const text = error instanceof Error ? error.message : String(error ?? '');
    return /503|502|504|high demand|overloaded|unavailable|ECONNRESET|ETIMEDOUT|fetch failed|network/i.test(text);
}

export function isPermanentGeminiError(error: unknown): boolean {
    const text = error instanceof Error ? error.message : String(error ?? '');
    return (APICallError.isInstance(error) && (error.statusCode === 401 || error.statusCode === 403)) ||
        /401|403|API_KEY|invalid.?key|PERMISSION_DENIED/i.test(text);
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

interface GeminiFallbackOptions {
    models?: readonly string[];
    attemptsPerModel?: number;
    timeoutPerAttemptMs?: number;
    signal?: AbortSignal;
}

/**
 * Tries Lite then Flash. Retries transient failures with exponential backoff.
 * Does not retry invalid-key / permission errors.
 */
async function generateWithFallback<T>(
    options: GeminiFallbackOptions,
    generate: (model: string, abortSignal: AbortSignal) => Promise<T>
): Promise<{ value: T; model: string }> {
    const models = options.models?.length ? options.models : INTERVIEW_MODELS;
    const attempts = options.attemptsPerModel ?? 3;
    let lastError: unknown;

    for (const modelId of models) {
        let delay = 400;
        for (let attempt = 0; attempt < attempts; attempt++) {
            options.signal?.throwIfAborted();
            const attemptSignal = AbortSignal.timeout(options.timeoutPerAttemptMs ?? GEMINI_TIMEOUT_MS);
            const abortSignal = options.signal ? AbortSignal.any([options.signal, attemptSignal]) : attemptSignal;
            try {
                return { value: await generate(modelId, abortSignal), model: modelId };
            } catch (error) {
                options.signal?.throwIfAborted();
                lastError = error;
                console.error(`Gemini ${modelId} attempt ${attempt + 1} failed`, {
                    name: error instanceof Error ? error.name : 'UnknownError',
                    status: APICallError.isInstance(error) ? error.statusCode : undefined,
                });
                if (isPermanentGeminiError(error)) throw error;
                // Quota is not worth retrying on the same model; try the fallback once.
                if (!isTransientGeminiError(error) || attempt === attempts - 1) break;
                await sleep(delay, undefined, { signal: options.signal });
                delay *= 2;
            }
        }
    }

    throw lastError instanceof Error ? lastError : new Error('Gemini request failed');
}

export async function generateGeminiText(args: {
    system?: string;
    prompt?: string;
    messages?: ChatMessage[];
    models?: readonly string[];
}): Promise<{ text: string; model: string }> {
    const { value, model } = await generateWithFallback(args, async (modelId, abortSignal) => {
        const { text } = await generateText({
            model: google(modelId),
            system: args.system,
            maxRetries: 0,
            abortSignal,
            ...(args.messages?.length
                ? { messages: args.messages as ModelMessage[] }
                : { prompt: args.prompt || '' }),
        });
        if (!text?.trim()) throw new Error('Empty model response');
        return text.trim();
    });
    return { text: value, model };
}

export async function generateGeminiObject<T>(args: GeminiFallbackOptions & {
    prompt: string;
    system?: string;
    schema: ZodType<T>;
}): Promise<T> {
    const { value } = await generateWithFallback(args, async (modelId, abortSignal) => {
        const { output } = await generateText({
            model: google(modelId),
            system: args.system,
            prompt: args.prompt,
            output: Output.object({ schema: args.schema }),
            maxRetries: 0,
            abortSignal,
        });
        return output;
    });
    return value;
}
