import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// ── System prompt for resume ATS analysis ──
function buildPrompt(resumeText: string, targetRole: string): string {
    return `You are an expert ATS (Applicant Tracking System) analyzer and career consultant.

Analyze the following resume text for the target role: "${targetRole}".

Produce a JSON object (and NOTHING else — no markdown, no explanation) with this exact structure:

{
  "atsScore": <number 0-100>,
  "keywordData": [
    { "keyword": "<term>", "count": <number>, "relevance": <number 0-100>, "found": <boolean> }
  ],
  "sectionScores": [
    { "label": "Contact Info", "score": <0-100> },
    { "label": "Summary", "score": <0-100> },
    { "label": "Experience", "score": <0-100> },
    { "label": "Skills", "score": <0-100> },
    { "label": "Education", "score": <0-100> },
    { "label": "Keywords", "score": <0-100> }
  ],
  "improvements": [
    { "severity": "critical" | "warning" | "suggestion", "title": "<short title>", "description": "<actionable advice>" }
  ]
}

Guidelines:
1. keywordData must include 10-15 keywords that are CRITICAL for the "${targetRole}" role. Mark each as found/missing based on whether the resume contains it.
2. sectionScores should evaluate each resume section's completeness and quality for the target role.
3. improvements should include 4-8 actionable items sorted by severity (critical first). These MUST be specific to the "${targetRole}" role, referencing exact skills, tools, or phrasing that would improve ATS pass rates.
4. atsScore is the overall score considering keyword match, section quality, formatting, and role relevance.
5. Be strict but fair. A generic resume with no role-specific keywords should score 30-50.

RESUME TEXT:
---
${resumeText}
---

Respond ONLY with the JSON object.`;
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !(session.user as { id?: string }).id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = (session.user as { id: string }).id;

        // ── Parse multipart form data ──
        const formData = await req.formData();
        const file = formData.get('resume') as File | null;
        const targetRole = (formData.get('targetRole') as string) || 'General';

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // ── Extract text from PDF ──
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let resumeText: string;
        try {
            const PDFParser = (await import('pdf2json')).default;
            resumeText = await new Promise((resolve, reject) => {
                const pdfParser = new PDFParser(null, true); // true = extract text only

                pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
                pdfParser.on("pdfParser_dataReady", () => {
                    resolve(pdfParser.getRawTextContent());
                });

                pdfParser.parseBuffer(buffer);
            });
        } catch (parseErr) {
            console.error('PDF parse error:', parseErr);
            return NextResponse.json(
                { error: 'Failed to parse PDF. Please ensure the file is a valid PDF.' },
                { status: 400 }
            );
        }

        if (!resumeText || resumeText.trim().length < 50) {
            return NextResponse.json(
                { error: 'Could not extract enough text from the PDF. The file may be image-based — please use a text-based PDF.' },
                { status: 400 }
            );
        }

        // ── Call Gemini for ATS analysis ──
        const { text: aiResponse } = await generateText({
            model: google('gemini-2.5-flash'),
            prompt: buildPrompt(resumeText.slice(0, 15000), targetRole), // Cap at 15k chars
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
            return NextResponse.json(
                { error: 'AI returned an invalid response. Please try again.' },
                { status: 502 }
            );
        }

        // ── Validate basic structure ──
        if (
            typeof analysisData.atsScore !== 'number' ||
            !Array.isArray(analysisData.keywordData) ||
            !Array.isArray(analysisData.sectionScores) ||
            !Array.isArray(analysisData.improvements)
        ) {
            return NextResponse.json(
                { error: 'AI analysis returned incomplete data. Please try again.' },
                { status: 502 }
            );
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
            } as any, // Cast to any to suppress IDE lag (Prisma client is synced, IDE just hasn't updated)
        });

        return NextResponse.json(saved, { status: 201 });
    } catch (error: unknown) {
        console.error('POST /api/resume/analyze error:', error);
        return NextResponse.json(
            { error: 'Failed to analyze resume' },
            { status: 500 }
        );
    }
}
