import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const MAX_RESUME_CHARS = 10000;

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

        // Extract text from PDF
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let resumeText: string;
        try {
            const PDFParser = (await import('pdf2json')).default;
            resumeText = await new Promise((resolve, reject) => {
                const pdfParser = new PDFParser(null, true);

                pdfParser.on('pdfParser_dataError', (errData: any) => reject(errData.parserError));
                pdfParser.on('pdfParser_dataReady', () => {
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

        if (!resumeText || resumeText.trim().length < 30) {
            return NextResponse.json(
                { error: 'Could not extract enough text from the PDF. The file may be image-based — please use a text-based PDF.' },
                { status: 400 }
            );
        }

        // Cap text length to avoid overly large prompts
        const trimmedText = resumeText.slice(0, MAX_RESUME_CHARS);

        return NextResponse.json({ text: trimmedText });
    } catch (error: any) {
        console.error('POST /api/interview/parse-resume error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to parse resume' },
            { status: 500 }
        );
    }
}
