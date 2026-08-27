import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { extractPdfText } from '@/lib/pdf-text';

const MAX_RESUME_CHARS = 10000;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('resume') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        if (file.type && file.type !== 'application/pdf') {
            return NextResponse.json({ error: 'Please upload a PDF file.' }, { status: 400 });
        }

        if (file.size > MAX_FILE_BYTES) {
            return NextResponse.json({ error: 'File size must be under 10MB.' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let resumeText: string;
        try {
            resumeText = await extractPdfText(buffer);
        } catch (parseErr) {
            console.error('PDF parse error:', parseErr);
            return NextResponse.json(
                { error: 'Failed to parse PDF. Please ensure the file is a valid text-based PDF.' },
                { status: 400 }
            );
        }

        if (!resumeText || resumeText.trim().length < 30) {
            return NextResponse.json(
                { error: 'Could not extract enough text from the PDF. The file may be image-based — please use a text-based PDF.' },
                { status: 400 }
            );
        }

        return NextResponse.json({ text: resumeText.slice(0, MAX_RESUME_CHARS) });
    } catch (error: unknown) {
        console.error('POST /api/interview/parse-resume error:', error);
        const message = error instanceof Error ? error.message : 'Failed to parse resume';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
