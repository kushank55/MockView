import { NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { jsonError } from '@/lib/http';
import { extractPdfText } from '@/lib/pdf-text';

const MAX_RESUME_CHARS = 10000;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user) return jsonError(401, 'UNAUTHORIZED', 'Unauthorized');

        const formData = await req.formData();
        const file = formData.get('resume') as File | null;

        if (!file) {
            return jsonError(400, 'VALIDATION_ERROR', 'No file provided');
        }

        if (file.type && file.type !== 'application/pdf') {
            return jsonError(400, 'VALIDATION_ERROR', 'Please upload a PDF file.');
        }

        if (file.size > MAX_FILE_BYTES) {
            return jsonError(400, 'VALIDATION_ERROR', 'File size must be under 10MB.');
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let resumeText: string;
        try {
            resumeText = await extractPdfText(buffer);
        } catch (parseErr) {
            console.error('PDF parse error:', parseErr);
            return jsonError(400, 'VALIDATION_ERROR', 'Failed to parse PDF. Please ensure the file is a valid text-based PDF.');
        }

        if (!resumeText || resumeText.trim().length < 30) {
            return jsonError(400, 'VALIDATION_ERROR', 'Could not extract enough text from the PDF. The file may be image-based — please use a text-based PDF.');
        }

        return Response.json({ success: true, text: resumeText.slice(0, MAX_RESUME_CHARS) });
    } catch (error: unknown) {
        console.error('POST /api/interview/parse-resume error:', error);
        return jsonError(500, 'INTERNAL_ERROR', 'Failed to parse resume');
    }
}
