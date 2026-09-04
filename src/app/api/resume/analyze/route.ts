import { NextRequest } from 'next/server';
import { cacheDel, dashboardCacheKey } from '@/lib/cache';
import { jsonError } from '@/lib/http';
import { getSessionUser } from '@/lib/session';
import { clientIp, enforceAiRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { generateGeminiText, isQuotaError } from '@/lib/gemini';
import { db } from '@/lib/db';
import { extractPdfText } from '@/lib/pdf-text';

function buildPrompt(resumeText: string, targetRole: string): string {
    return `ATS-analyze this resume for "${targetRole}". JSON only:
{"atsScore":0,"keywordData":[{"keyword":"","count":0,"relevance":0,"found":false}],"sectionScores":[{"label":"Contact Info","score":0},{"label":"Summary","score":0},{"label":"Experience","score":0},{"label":"Skills","score":0},{"label":"Education","score":0},{"label":"Keywords","score":0}],"improvements":[{"severity":"critical","title":"","description":""}]}
10-15 role-critical keywords (found true/false). 4-8 improvements, critical first. Generic resumes score 30-50.

RESUME:
${resumeText}`;
}

export async function POST(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user) return jsonError(401, 'UNAUTHORIZED', 'Unauthorized');
        const userId = user.id;

        const limit = await enforceAiRateLimit(user.id, clientIp(req));
        if (!limit.allowed) return rateLimitResponse(limit.retryAfterSec);

        // ── Parse multipart form data ──
        const formData = await req.formData();
        const file = formData.get('resume') as File | null;
        const targetRole = (formData.get('targetRole') as string) || 'General';

        if (!file) {
            return jsonError(400, 'VALIDATION_ERROR', 'No file provided');
        }

        // ── Extract text from PDF ──
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let resumeText: string;
        try {
            resumeText = await extractPdfText(buffer);
        } catch (parseErr) {
            console.error('PDF parse error:', parseErr);
            return jsonError(400, 'VALIDATION_ERROR', 'Failed to parse PDF. Please ensure the file is a valid text-based PDF.');
        }

        if (!resumeText || resumeText.trim().length < 50) {
            return jsonError(400, 'VALIDATION_ERROR', 'Could not extract enough text from the PDF. The file may be image-based — please use a text-based PDF.');
        }

        // ── Call Gemini for ATS analysis ──
        const { text: aiResponse } = await generateGeminiText({
            prompt: buildPrompt(resumeText.slice(0, 15000), targetRole),
        });

        // ── Parse AI response ──
        let analysisData: {
            atsScore: number;
            keywordData: { keyword: string; count: number; relevance: number; found: boolean }[];
            sectionScores: { label: string; score: number }[];
            improvements: { severity: string; title: string; description: string }[];
        };

        try {
            // Strip possible markdown code fences
            const cleaned = aiResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
            analysisData = JSON.parse(cleaned);
        } catch {
            console.error('Failed to parse AI response:', aiResponse.slice(0, 500));
            return jsonError(502, 'RESUME_ANALYSIS_FAILED', 'AI returned an invalid response. Please try again.');
        }

        // ── Validate basic structure ──
        if (
            typeof analysisData.atsScore !== 'number' ||
            !Array.isArray(analysisData.keywordData) ||
            !Array.isArray(analysisData.sectionScores) ||
            !Array.isArray(analysisData.improvements)
        ) {
            return jsonError(502, 'RESUME_ANALYSIS_FAILED', 'AI analysis returned incomplete data. Please try again.');
        }

        // ── Save to database ──
        const saved = await db.resumeAnalysis.create({
            data: {
                userId,
                fileName: file.name,
                targetRole,
                atsScore: Math.round(analysisData.atsScore),
                keywordData: analysisData.keywordData,
                sectionScores: analysisData.sectionScores,
                improvements: analysisData.improvements,
                // Stored so the interview flow can personalize questions from
                // this resume without a second upload.
                resumeText: resumeText.slice(0, 10000),
            },
        });

        await cacheDel(dashboardCacheKey(userId));

        return Response.json({ success: true, ...saved }, { status: 201 });
    } catch (error: unknown) {
        console.error('POST /api/resume/analyze error:', error);
        const quota = isQuotaError(error);
        return jsonError(
            quota ? 429 : 500,
            'RESUME_ANALYSIS_FAILED',
            quota
                ? 'Resume analysis is rate-limited right now. Wait about a minute, then retry.'
                : 'Failed to analyze resume'
        );
    }
}
